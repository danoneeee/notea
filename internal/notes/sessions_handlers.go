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

type sessionBaseRow struct {
	id        string
	teaID     string
	userID    string
	tempC     int32
	steepSec  int32
	leaves    float64
	notes     string
	sessionAt time.Time
}

func (s *Server) CreateSession(ctx context.Context, req *teanotesv1.CreateSessionRequest) (*teanotesv1.CreateSessionResponse, error) {
	userID, err := UserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}
	teaID := strings.TrimSpace(req.GetTeaId())
	if teaID == "" {
		return nil, status.Error(codes.InvalidArgument, "tea_id is required")
	}
	if _, parseErr := uuid.Parse(teaID); parseErr != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid tea_id")
	}
	params := req.GetParams()
	if params == nil {
		return nil, status.Error(codes.InvalidArgument, "params is required")
	}
	if params.GetTemperatureC() <= 0 {
		return nil, status.Error(codes.InvalidArgument, "temperature_c must be positive")
	}
	if params.GetSteepSec() <= 0 {
		return nil, status.Error(codes.InvalidArgument, "steep_sec must be positive")
	}
	if params.GetLeavesGPer_100Ml() <= 0 {
		return nil, status.Error(codes.InvalidArgument, "leaves_g_per_100ml must be positive")
	}
	if err := validateDescriptorScores(req.GetAromaDescriptors()); err != nil {
		return nil, err
	}
	if err := validateDescriptorScores(req.GetTasteDescriptors()); err != nil {
		return nil, err
	}
	sessionAt := time.Now()
	if req.GetSessionAt() != nil {
		sessionAt = req.GetSessionAt().AsTime()
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var exists int
	if err := tx.QueryRow(ctx, `SELECT 1 FROM teas WHERE id = $1::uuid`, teaID).Scan(&exists); errors.Is(err, pgx.ErrNoRows) {
		return nil, status.Error(codes.NotFound, "tea not found")
	} else if err != nil {
		return nil, err
	}

	sessionID := uuid.NewString()
	if _, err := tx.Exec(ctx, `
		INSERT INTO sessions (
			id, tea_id, user_id, temperature_c, steep_sec, leaves_g_per_100ml, notes, session_at
		)
		VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8)`,
		sessionID, teaID, userID, params.GetTemperatureC(), params.GetSteepSec(), params.GetLeavesGPer_100Ml(), req.GetNotes(), sessionAt,
	); err != nil {
		return nil, err
	}

	if err := insertDescriptorScores(ctx, tx, sessionID, "aroma", req.GetAromaDescriptors()); err != nil {
		return nil, err
	}
	if err := insertDescriptorScores(ctx, tx, sessionID, "taste", req.GetTasteDescriptors()); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	session, err := s.getSessionByID(ctx, userID, sessionID)
	if err != nil {
		return nil, err
	}
	return &teanotesv1.CreateSessionResponse{Session: session}, nil
}

func (s *Server) GetSession(ctx context.Context, req *teanotesv1.GetSessionRequest) (*teanotesv1.GetSessionResponse, error) {
	userID, err := UserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}
	sessionID := strings.TrimSpace(req.GetSessionId())
	if sessionID == "" {
		return nil, status.Error(codes.InvalidArgument, "session_id is required")
	}
	if _, parseErr := uuid.Parse(sessionID); parseErr != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid session_id")
	}
	session, err := s.getSessionByID(ctx, userID, sessionID)
	if err != nil {
		return nil, err
	}
	return &teanotesv1.GetSessionResponse{Session: session}, nil
}

func (s *Server) ListSessions(ctx context.Context, req *teanotesv1.ListSessionsRequest) (*teanotesv1.ListSessionsResponse, error) {
	userID, err := UserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}
	limit := req.GetLimit()
	if limit <= 0 {
		limit = 100
	}
	if limit > 500 {
		limit = 500
	}
	offset := req.GetOffset()
	if offset < 0 {
		offset = 0
	}

	rows, err := s.pool.Query(ctx, `
		SELECT id::text, tea_id::text, user_id::text, temperature_c, steep_sec, leaves_g_per_100ml, notes, session_at
		FROM sessions
		WHERE user_id = $1::uuid
		ORDER BY session_at DESC, created_at DESC
		LIMIT $2 OFFSET $3`, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var baseRows []sessionBaseRow
	for rows.Next() {
		var row sessionBaseRow
		if err := rows.Scan(&row.id, &row.teaID, &row.userID, &row.tempC, &row.steepSec, &row.leaves, &row.notes, &row.sessionAt); err != nil {
			return nil, err
		}
		baseRows = append(baseRows, row)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(baseRows) == 0 {
		return &teanotesv1.ListSessionsResponse{Sessions: []*teanotesv1.Session{}}, nil
	}

	sessions, err := s.inflateSessions(ctx, baseRows)
	if err != nil {
		return nil, err
	}
	return &teanotesv1.ListSessionsResponse{Sessions: sessions}, nil
}

func validateDescriptorScores(scores []*teanotesv1.DescriptorScore) error {
	for _, score := range scores {
		if strings.TrimSpace(score.GetDescriptorId()) == "" {
			return status.Error(codes.InvalidArgument, "descriptor_id is required")
		}
		if score.GetIntensity() < 1 || score.GetIntensity() > 5 {
			return status.Error(codes.InvalidArgument, "intensity must be between 1 and 5")
		}
	}
	return nil
}

func insertDescriptorScores(ctx context.Context, tx pgx.Tx, sessionID, kind string, scores []*teanotesv1.DescriptorScore) error {
	for _, score := range scores {
		if _, err := tx.Exec(ctx, `
			INSERT INTO session_descriptor_scores (session_id, descriptor_id, intensity, kind)
			VALUES ($1::uuid, $2, $3, $4)`,
			sessionID, strings.TrimSpace(score.GetDescriptorId()), score.GetIntensity(), kind,
		); err != nil {
			return err
		}
	}
	return nil
}

func (s *Server) getSessionByID(ctx context.Context, userID, sessionID string) (*teanotesv1.Session, error) {
	var row sessionBaseRow
	err := s.pool.QueryRow(ctx, `
		SELECT id::text, tea_id::text, user_id::text, temperature_c, steep_sec, leaves_g_per_100ml, notes, session_at
		FROM sessions
		WHERE id = $1::uuid AND user_id = $2::uuid`,
		sessionID, userID,
	).Scan(&row.id, &row.teaID, &row.userID, &row.tempC, &row.steepSec, &row.leaves, &row.notes, &row.sessionAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, status.Error(codes.NotFound, "session not found")
	}
	if err != nil {
		return nil, err
	}
	sessions, err := s.inflateSessions(ctx, []sessionBaseRow{row})
	if err != nil {
		return nil, err
	}
	return sessions[0], nil
}

func (s *Server) inflateSessions(ctx context.Context, baseRows []sessionBaseRow) ([]*teanotesv1.Session, error) {
	sessionIDs := make([]string, 0, len(baseRows))
	for _, row := range baseRows {
		sessionIDs = append(sessionIDs, row.id)
	}

	scoreRows, err := s.pool.Query(ctx, `
		SELECT session_id::text, descriptor_id, intensity, kind
		FROM session_descriptor_scores
		WHERE session_id = ANY($1::uuid[])
		ORDER BY kind ASC, descriptor_id ASC`, sessionIDs)
	if err != nil {
		return nil, err
	}
	defer scoreRows.Close()

	aromaBySession := map[string][]*teanotesv1.DescriptorScore{}
	tasteBySession := map[string][]*teanotesv1.DescriptorScore{}
	for scoreRows.Next() {
		var sessionID, descriptorID, kind string
		var intensity int32
		if err := scoreRows.Scan(&sessionID, &descriptorID, &intensity, &kind); err != nil {
			return nil, err
		}
		score := &teanotesv1.DescriptorScore{
			DescriptorId: descriptorID,
			Intensity:    intensity,
		}
		if kind == "taste" {
			tasteBySession[sessionID] = append(tasteBySession[sessionID], score)
		} else {
			aromaBySession[sessionID] = append(aromaBySession[sessionID], score)
		}
	}
	if err := scoreRows.Err(); err != nil {
		return nil, err
	}

	sessions := make([]*teanotesv1.Session, 0, len(baseRows))
	for _, row := range baseRows {
		session := &teanotesv1.Session{
			Id:     row.id,
			TeaId:  row.teaID,
			UserId: row.userID,
			Params: &teanotesv1.BrewingParams{
				TemperatureC:     row.tempC,
				SteepSec:         row.steepSec,
				LeavesGPer_100Ml: row.leaves,
			},
			AromaDescriptors: aromaBySession[row.id],
			TasteDescriptors: tasteBySession[row.id],
			Notes:            row.notes,
			SessionAt:        timestamppb.New(row.sessionAt),
		}
		if session.AromaDescriptors == nil {
			session.AromaDescriptors = []*teanotesv1.DescriptorScore{}
		}
		if session.TasteDescriptors == nil {
			session.TasteDescriptors = []*teanotesv1.DescriptorScore{}
		}
		sessions = append(sessions, session)
	}
	return sessions, nil
}
