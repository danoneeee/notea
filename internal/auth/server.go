package auth

import (
	"context"
	"errors"
	"time"

	authv1 "notea/api/proto/auth/v1"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type Server struct {
	authv1.UnimplementedAuthServiceServer
	pool      *pgxpool.Pool
	jwtSecret string
}

func NewServer(pool *pgxpool.Pool, jwtSecret string) *Server {
	return &Server{pool: pool, jwtSecret: jwtSecret}
}

func (s *Server) Register(ctx context.Context, req *authv1.RegisterRequest) (*authv1.RegisterResponse, error) {
	var exists int
	err := s.pool.QueryRow(ctx, `SELECT 1 FROM users WHERE email = $1`, req.GetEmail()).Scan(&exists)
	if err == nil {
		return nil, status.Error(codes.AlreadyExists, "email already registered")
	}
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, status.Error(codes.Internal, err.Error())
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.GetPassword()), bcrypt.DefaultCost)
	if err != nil {
		return nil, status.Error(codes.Internal, "password hash failed")
	}

	var id string
	var createdAt time.Time
	err = s.pool.QueryRow(ctx,
		`INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id::text, created_at`,
		req.GetEmail(), string(hash), req.GetDisplayName(),
	).Scan(&id, &createdAt)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	accessToken, refreshToken, err := Issue(s.jwtSecret, id)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	return &authv1.RegisterResponse{
		User: &authv1.User{
			Id:          id,
			Email:       req.GetEmail(),
			DisplayName: req.GetDisplayName(),
			CreatedAt:   timestamppb.New(createdAt),
		},
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

func (s *Server) Login(ctx context.Context, req *authv1.LoginRequest) (*authv1.LoginResponse, error) {
	var id, passwordHash, displayName string
	var createdAt time.Time
	err := s.pool.QueryRow(ctx,
		`SELECT id::text, password_hash, display_name, created_at FROM users WHERE email = $1`,
		req.GetEmail(),
	).Scan(&id, &passwordHash, &displayName, &createdAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, status.Error(codes.NotFound, "user not found")
	}
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.GetPassword())); err != nil {
		return nil, status.Error(codes.Unauthenticated, "wrong password")
	}

	accessToken, refreshToken, err := Issue(s.jwtSecret, id)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	return &authv1.LoginResponse{
		User: &authv1.User{
			Id:          id,
			Email:       req.GetEmail(),
			DisplayName: displayName,
			CreatedAt:   timestamppb.New(createdAt),
		},
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

func (s *Server) Validate(ctx context.Context, req *authv1.ValidateRequest) (*authv1.ValidateResponse, error) {
	userID, err := ValidateTokenUse(s.jwtSecret, req.GetAccessToken(), "access")
	if err != nil {
		return &authv1.ValidateResponse{Ok: false}, nil
	}
	return &authv1.ValidateResponse{UserId: userID, Ok: true}, nil
}

func (s *Server) RefreshSession(ctx context.Context, req *authv1.RefreshSessionRequest) (*authv1.RefreshSessionResponse, error) {
	userID, err := ValidateTokenUse(s.jwtSecret, req.GetRefreshToken(), "refresh")
	if err != nil {
		return nil, status.Error(codes.Unauthenticated, "invalid refresh token")
	}

	accessToken, refreshToken, err := Issue(s.jwtSecret, userID)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	return &authv1.RefreshSessionResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}
