package notes

import (
	"context"
	"errors"
	"strings"

	teanotesv1 "notea/api/proto/teanotes/v1"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/types/known/timestamppb"
)

func (s *Server) UpsertTeaNote(ctx context.Context, req *teanotesv1.UpsertTeaNoteRequest) (*teanotesv1.UpsertTeaNoteResponse, error) {
	userID, err := UserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}
	note := req.GetNote()
	if note == nil {
		return nil, status.Error(codes.InvalidArgument, "note is required")
	}
	idStr := strings.TrimSpace(note.GetId())
	if idStr == "" {
		idStr = uuid.NewString()
	} else if _, parseErr := uuid.Parse(idStr); parseErr != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid note id")
	}
	note.Id = idStr
	if note.UpdatedAt == nil {
		note.UpdatedAt = timestamppb.Now()
	}
	opts := protojson.MarshalOptions{EmitUnpopulated: false}
	payload, err := opts.Marshal(note)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}
	updated := note.UpdatedAt.AsTime()

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var owner string
	err = tx.QueryRow(ctx, `SELECT user_id::text FROM tea_notes WHERE id = $1::uuid`, idStr).Scan(&owner)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	if err == nil {
		if owner != userID {
			return nil, status.Error(codes.PermissionDenied, "note belongs to another user")
		}
		_, execErr := tx.Exec(ctx, `
			UPDATE tea_notes SET updated_at = $1, body = $2::jsonb
			WHERE id = $3::uuid AND user_id = $4::uuid`,
			updated, payload, idStr, userID,
		)
		if execErr != nil {
			return nil, execErr
		}
	} else {
		_, execErr := tx.Exec(ctx, `
			INSERT INTO tea_notes (id, user_id, updated_at, body)
			VALUES ($1::uuid, $2::uuid, $3, $4::jsonb)`,
			idStr, userID, updated, payload,
		)
		if execErr != nil {
			return nil, execErr
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &teanotesv1.UpsertTeaNoteResponse{Note: note}, nil
}

func (s *Server) GetTeaNote(ctx context.Context, req *teanotesv1.GetTeaNoteRequest) (*teanotesv1.GetTeaNoteResponse, error) {
	userID, err := UserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}
	noteID := strings.TrimSpace(req.GetNoteId())
	if noteID == "" {
		return nil, status.Error(codes.InvalidArgument, "note_id is required")
	}
	var body []byte
	err = s.pool.QueryRow(ctx,
		`SELECT body FROM tea_notes WHERE id = $1::uuid AND user_id = $2::uuid`,
		noteID, userID,
	).Scan(&body)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, status.Error(codes.NotFound, "note not found")
	}
	if err != nil {
		return nil, err
	}
	var note teanotesv1.TeaNote
	if err := protojson.Unmarshal(body, &note); err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}
	return &teanotesv1.GetTeaNoteResponse{Note: &note}, nil
}

func (s *Server) ListTeaNotes(ctx context.Context, req *teanotesv1.ListTeaNotesRequest) (*teanotesv1.ListTeaNotesResponse, error) {
	userID, err := UserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}
	limit := req.GetLimit()
	if limit <= 0 {
		limit = 200
	}
	if limit > 500 {
		limit = 500
	}
	offset := req.GetOffset()
	if offset < 0 {
		offset = 0
	}
	rows, err := s.pool.Query(ctx, `
		SELECT body FROM tea_notes
		WHERE user_id = $1::uuid
		ORDER BY updated_at DESC
		LIMIT $2 OFFSET $3`,
		userID, limit, offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notes []*teanotesv1.TeaNote
	for rows.Next() {
		var body []byte
		if scanErr := rows.Scan(&body); scanErr != nil {
			return nil, scanErr
		}
		var note teanotesv1.TeaNote
		if unmarshalErr := protojson.Unmarshal(body, &note); unmarshalErr != nil {
			return nil, status.Error(codes.Internal, unmarshalErr.Error())
		}
		notes = append(notes, &note)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if notes == nil {
		notes = []*teanotesv1.TeaNote{}
	}
	return &teanotesv1.ListTeaNotesResponse{Notes: notes}, nil
}

func (s *Server) DeleteTeaNote(ctx context.Context, req *teanotesv1.DeleteTeaNoteRequest) (*teanotesv1.DeleteTeaNoteResponse, error) {
	userID, err := UserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}
	noteID := strings.TrimSpace(req.GetNoteId())
	if noteID == "" {
		return nil, status.Error(codes.InvalidArgument, "note_id is required")
	}
	tag, err := s.pool.Exec(ctx,
		`DELETE FROM tea_notes WHERE id = $1::uuid AND user_id = $2::uuid`,
		noteID, userID,
	)
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		return nil, status.Error(codes.NotFound, "note not found")
	}
	return &teanotesv1.DeleteTeaNoteResponse{}, nil
}
