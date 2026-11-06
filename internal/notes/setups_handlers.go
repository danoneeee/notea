package notes

import (
	"context"
	"errors"
	"strings"
	"time"

	teanotesv1 "notea/api/proto/teanotes/v1"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"
)

func (s *Server) ListTeaSetups(ctx context.Context, req *teanotesv1.ListTeaSetupsRequest) (*teanotesv1.ListTeaSetupsResponse, error) {
	userID, err := UserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}
	includeArchived := req.GetIncludeArchived()
	where := `user_id = $1::uuid`
	if !includeArchived {
		where += ` AND archived_at IS NULL`
	}
	rows, err := s.pool.Query(ctx, `
		SELECT id::text, name, archived_at, created_at, updated_at
		FROM tea_setups
		WHERE `+where+`
		ORDER BY updated_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	type setupRow struct {
		id         string
		name       string
		archivedAt *time.Time
		createdAt  time.Time
		updatedAt  time.Time
	}
	var base []setupRow
	for rows.Next() {
		var r setupRow
		if err := rows.Scan(&r.id, &r.name, &r.archivedAt, &r.createdAt, &r.updatedAt); err != nil {
			return nil, err
		}
		base = append(base, r)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(base) == 0 {
		return &teanotesv1.ListTeaSetupsResponse{Setups: []*teanotesv1.TeaSetup{}}, nil
	}

	ids := make([]string, 0, len(base))
	for _, r := range base {
		ids = append(ids, r.id)
	}

	itemRows, err := s.pool.Query(ctx, `
		SELECT setup_id::text, teaware_id::text
		FROM tea_setup_items
		WHERE setup_id = ANY($1::uuid[])
		ORDER BY sort_order ASC`, ids)
	if err != nil {
		return nil, err
	}
	defer itemRows.Close()

	itemsBySetup := map[string][]string{}
	for itemRows.Next() {
		var setupID, teawareID string
		if err := itemRows.Scan(&setupID, &teawareID); err != nil {
			return nil, err
		}
		itemsBySetup[setupID] = append(itemsBySetup[setupID], teawareID)
	}
	if err := itemRows.Err(); err != nil {
		return nil, err
	}

	out := make([]*teanotesv1.TeaSetup, 0, len(base))
	for _, r := range base {
		setup := &teanotesv1.TeaSetup{
			Id:         r.id,
			Name:       r.name,
			TeawareIds: itemsBySetup[r.id],
			Archived:   r.archivedAt != nil,
			CreatedAt:  timestamppb.New(r.createdAt),
			UpdatedAt:  timestamppb.New(r.updatedAt),
		}
		if r.archivedAt != nil {
			setup.ArchivedAt = timestamppb.New(*r.archivedAt)
		}
		if setup.TeawareIds == nil {
			setup.TeawareIds = []string{}
		}
		out = append(out, setup)
	}
	return &teanotesv1.ListTeaSetupsResponse{Setups: out}, nil
}

func (s *Server) UpsertTeaSetup(ctx context.Context, req *teanotesv1.UpsertTeaSetupRequest) (*teanotesv1.UpsertTeaSetupResponse, error) {
	userID, err := UserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}
	setup := req.GetSetup()
	if setup == nil {
		return nil, status.Error(codes.InvalidArgument, "setup is required")
	}
	name := strings.TrimSpace(setup.GetName())
	if name == "" {
		return nil, status.Error(codes.InvalidArgument, "name is required")
	}
	idStr := strings.TrimSpace(setup.GetId())
	if idStr == "" {
		idStr = uuid.NewString()
	} else if _, parseErr := uuid.Parse(idStr); parseErr != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid setup id")
	}

	teawareIDs := setup.GetTeawareIds()
	if len(teawareIDs) == 0 {
		return nil, status.Error(codes.InvalidArgument, "teaware_ids is required")
	}
	unique := make([]string, 0, len(teawareIDs))
	seen := map[string]struct{}{}
	for _, raw := range teawareIDs {
		val := strings.TrimSpace(raw)
		if val == "" {
			continue
		}
		if _, err := uuid.Parse(val); err != nil {
			return nil, status.Error(codes.InvalidArgument, "invalid teaware id in teaware_ids")
		}
		if _, ok := seen[val]; ok {
			continue
		}
		seen[val] = struct{}{}
		unique = append(unique, val)
	}
	if len(unique) == 0 {
		return nil, status.Error(codes.InvalidArgument, "teaware_ids is required")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// валидируем: все teaware принадлежат пользователю и активны
	var count int
	if err := tx.QueryRow(ctx, `
		SELECT count(1)
		FROM teaware
		WHERE user_id = $1::uuid
		  AND archived_at IS NULL
		  AND id = ANY($2::uuid[])`, userID, unique).Scan(&count); err != nil {
		return nil, err
	}
	if count != len(unique) {
		return nil, status.Error(codes.FailedPrecondition, "some teaware items are missing or archived")
	}

	var owner string
	err = tx.QueryRow(ctx, `SELECT user_id::text FROM tea_setups WHERE id = $1::uuid`, idStr).Scan(&owner)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	now := time.Now()
	if err == nil {
		if owner != userID {
			return nil, status.Error(codes.PermissionDenied, "setup belongs to another user")
		}
		_, execErr := tx.Exec(ctx, `
			UPDATE tea_setups
			SET name = $1, updated_at = $2
			WHERE id = $3::uuid AND user_id = $4::uuid`, name, now, idStr, userID)
		if execErr != nil {
			return nil, execErr
		}
	} else {
		_, execErr := tx.Exec(ctx, `
			INSERT INTO tea_setups (id, user_id, name, created_at, updated_at)
			VALUES ($1::uuid, $2::uuid, $3, $4, $4)`, idStr, userID, name, now)
		if execErr != nil {
			return nil, execErr
		}
	}

	// Replace items
	if _, err := tx.Exec(ctx, `DELETE FROM tea_setup_items WHERE setup_id = $1::uuid`, idStr); err != nil {
		return nil, err
	}
	for i, tid := range unique {
		if _, err := tx.Exec(ctx, `
			INSERT INTO tea_setup_items (setup_id, teaware_id, sort_order)
			VALUES ($1::uuid, $2::uuid, $3)`, idStr, tid, i); err != nil {
			return nil, err
		}
	}

	var archivedAt *time.Time
	var createdAt, updatedAt time.Time
	var nameOut string
	if err := tx.QueryRow(ctx, `
		SELECT name, archived_at, created_at, updated_at
		FROM tea_setups
		WHERE id = $1::uuid AND user_id = $2::uuid`, idStr, userID,
	).Scan(&nameOut, &archivedAt, &createdAt, &updatedAt); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	out := &teanotesv1.TeaSetup{
		Id:         idStr,
		Name:       nameOut,
		TeawareIds: unique,
		Archived:   archivedAt != nil,
		CreatedAt:  timestamppb.New(createdAt),
		UpdatedAt:  timestamppb.New(updatedAt),
	}
	if archivedAt != nil {
		out.ArchivedAt = timestamppb.New(*archivedAt)
	}
	return &teanotesv1.UpsertTeaSetupResponse{Setup: out}, nil
}

func (s *Server) ArchiveTeaSetup(ctx context.Context, req *teanotesv1.ArchiveTeaSetupRequest) (*teanotesv1.ArchiveTeaSetupResponse, error) {
	userID, err := UserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}
	idStr := strings.TrimSpace(req.GetSetupId())
	if idStr == "" {
		return nil, status.Error(codes.InvalidArgument, "setup_id is required")
	}
	if _, parseErr := uuid.Parse(idStr); parseErr != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid setup id")
	}
	tag, err := s.pool.Exec(ctx, `
		UPDATE tea_setups
		SET archived_at = now(), updated_at = now()
		WHERE id = $1::uuid AND user_id = $2::uuid AND archived_at IS NULL`, idStr, userID)
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		var exists int
		scanErr := s.pool.QueryRow(ctx, `SELECT 1 FROM tea_setups WHERE id = $1::uuid AND user_id = $2::uuid`, idStr, userID).Scan(&exists)
		if errors.Is(scanErr, pgx.ErrNoRows) {
			return nil, status.Error(codes.NotFound, "setup not found")
		}
		if scanErr != nil {
			return nil, scanErr
		}
	}
	return &teanotesv1.ArchiveTeaSetupResponse{}, nil
}
