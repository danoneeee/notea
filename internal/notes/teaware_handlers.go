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

func (s *Server) ListTeaware(ctx context.Context, req *teanotesv1.ListTeawareRequest) (*teanotesv1.ListTeawareResponse, error) {
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
		SELECT id::text, name, type, color_hex, archived_at, created_at, updated_at
		FROM teaware
		WHERE `+where+`
		ORDER BY updated_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []*teanotesv1.Teaware
	for rows.Next() {
		var id, name, typ, color string
		var archivedAt *time.Time
		var createdAt, updatedAt time.Time
		if err := rows.Scan(&id, &name, &typ, &color, &archivedAt, &createdAt, &updatedAt); err != nil {
			return nil, err
		}
		out := &teanotesv1.Teaware{
			Id:        id,
			Name:      name,
			Type:      toProtoTeawareType(typ),
			ColorHex:  color,
			Archived:  archivedAt != nil,
			CreatedAt: timestamppb.New(createdAt),
			UpdatedAt: timestamppb.New(updatedAt),
		}
		if archivedAt != nil {
			out.ArchivedAt = timestamppb.New(*archivedAt)
		}
		items = append(items, out)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if items == nil {
		items = []*teanotesv1.Teaware{}
	}
	return &teanotesv1.ListTeawareResponse{Items: items}, nil
}

func (s *Server) UpsertTeaware(ctx context.Context, req *teanotesv1.UpsertTeawareRequest) (*teanotesv1.UpsertTeawareResponse, error) {
	userID, err := UserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}
	item := req.GetItem()
	if item == nil {
		return nil, status.Error(codes.InvalidArgument, "item is required")
	}
	name := strings.TrimSpace(item.GetName())
	if name == "" {
		return nil, status.Error(codes.InvalidArgument, "name is required")
	}
	idStr := strings.TrimSpace(item.GetId())
	if idStr == "" {
		idStr = uuid.NewString()
	} else if _, parseErr := uuid.Parse(idStr); parseErr != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid teaware id")
	}
	color := strings.TrimSpace(item.GetColorHex())
	if color == "" {
		color = "#d9e6d5"
	}
	typ := toDBTeawareType(item.GetType())

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var owner string
	err = tx.QueryRow(ctx, `SELECT user_id::text FROM teaware WHERE id = $1::uuid`, idStr).Scan(&owner)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	now := time.Now()
	if err == nil {
		if owner != userID {
			return nil, status.Error(codes.PermissionDenied, "teaware belongs to another user")
		}
		_, execErr := tx.Exec(ctx, `
			UPDATE teaware
			SET name = $1, type = $2, color_hex = $3, updated_at = $4
			WHERE id = $5::uuid AND user_id = $6::uuid`,
			name, typ, color, now, idStr, userID,
		)
		if execErr != nil {
			return nil, execErr
		}
	} else {
		_, execErr := tx.Exec(ctx, `
			INSERT INTO teaware (id, user_id, name, type, color_hex, created_at, updated_at)
			VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $6)`,
			idStr, userID, name, typ, color, now,
		)
		if execErr != nil {
			return nil, execErr
		}
	}

	var archivedAt *time.Time
	var createdAt, updatedAt time.Time
	var typOut, colorOut string
	var nameOut string
	if err := tx.QueryRow(ctx, `
		SELECT name, type, color_hex, archived_at, created_at, updated_at
		FROM teaware
		WHERE id = $1::uuid AND user_id = $2::uuid`, idStr, userID,
	).Scan(&nameOut, &typOut, &colorOut, &archivedAt, &createdAt, &updatedAt); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	out := &teanotesv1.Teaware{
		Id:        idStr,
		Name:      nameOut,
		Type:      toProtoTeawareType(typOut),
		ColorHex:  colorOut,
		Archived:  archivedAt != nil,
		CreatedAt: timestamppb.New(createdAt),
		UpdatedAt: timestamppb.New(updatedAt),
	}
	if archivedAt != nil {
		out.ArchivedAt = timestamppb.New(*archivedAt)
	}
	return &teanotesv1.UpsertTeawareResponse{Item: out}, nil
}

func (s *Server) ArchiveTeaware(ctx context.Context, req *teanotesv1.ArchiveTeawareRequest) (*teanotesv1.ArchiveTeawareResponse, error) {
	userID, err := UserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}
	idStr := strings.TrimSpace(req.GetTeawareId())
	if idStr == "" {
		return nil, status.Error(codes.InvalidArgument, "teaware_id is required")
	}
	if _, parseErr := uuid.Parse(idStr); parseErr != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid teaware id")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx, `
		UPDATE teaware
		SET archived_at = now(), updated_at = now()
		WHERE id = $1::uuid AND user_id = $2::uuid AND archived_at IS NULL`,
		idStr, userID,
	)
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		// либо не найдено, либо уже архивировано — различаем "не найдено"
		var exists int
		scanErr := tx.QueryRow(ctx, `SELECT 1 FROM teaware WHERE id = $1::uuid AND user_id = $2::uuid`, idStr, userID).Scan(&exists)
		if errors.Is(scanErr, pgx.ErrNoRows) {
			return nil, status.Error(codes.NotFound, "teaware not found")
		}
		if scanErr != nil {
			return nil, scanErr
		}
		// уже архивировано — ok idempotent
	}

	// Автоархивация сетапов, где не осталось активной посуды.
	_, err = tx.Exec(ctx, `
		UPDATE tea_setups s
		SET archived_at = now(), updated_at = now()
		WHERE s.user_id = $1::uuid
		  AND s.archived_at IS NULL
		  AND EXISTS (
		    SELECT 1 FROM tea_setup_items i
		    WHERE i.setup_id = s.id AND i.teaware_id = $2::uuid
		  )
		  AND NOT EXISTS (
		    SELECT 1
		    FROM tea_setup_items i2
		    JOIN teaware t ON t.id = i2.teaware_id
		    WHERE i2.setup_id = s.id
		      AND t.user_id = $1::uuid
		      AND t.archived_at IS NULL
		  )`,
		userID, idStr,
	)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &teanotesv1.ArchiveTeawareResponse{}, nil
}

func toDBTeawareType(t teanotesv1.TeawareType) string {
	switch t {
	case teanotesv1.TeawareType_TEAWARE_TYPE_TEAPOT:
		return "teapot"
	case teanotesv1.TeawareType_TEAWARE_TYPE_GAIWAN:
		return "gaiwan"
	case teanotesv1.TeawareType_TEAWARE_TYPE_CUP:
		return "cup"
	case teanotesv1.TeawareType_TEAWARE_TYPE_PITCHER:
		return "pitcher"
	case teanotesv1.TeawareType_TEAWARE_TYPE_AROMA_CUP:
		return "aroma-cup"
	case teanotesv1.TeawareType_TEAWARE_TYPE_THERMOS:
		return "thermos"
	default:
		return "other"
	}
}

func toProtoTeawareType(db string) teanotesv1.TeawareType {
	switch strings.ToLower(strings.TrimSpace(db)) {
	case "teapot":
		return teanotesv1.TeawareType_TEAWARE_TYPE_TEAPOT
	case "gaiwan":
		return teanotesv1.TeawareType_TEAWARE_TYPE_GAIWAN
	case "cup":
		return teanotesv1.TeawareType_TEAWARE_TYPE_CUP
	case "pitcher":
		return teanotesv1.TeawareType_TEAWARE_TYPE_PITCHER
	case "aroma-cup":
		return teanotesv1.TeawareType_TEAWARE_TYPE_AROMA_CUP
	case "thermos":
		return teanotesv1.TeawareType_TEAWARE_TYPE_THERMOS
	default:
		return teanotesv1.TeawareType_TEAWARE_TYPE_OTHER
	}
}

