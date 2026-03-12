package auth

import (
	"context"
	"errors"

	authv1 "notea/api/proto/auth/v1"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
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
	err = s.pool.QueryRow(ctx,
		`INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id::text`,
		req.GetEmail(), string(hash), req.GetDisplayName(),
	).Scan(&id)
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
		},
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

func (s *Server) Login(ctx context.Context, req *authv1.LoginRequest) (*authv1.LoginResponse, error) {
	return nil, status.Error(codes.Unimplemented, "Login not implemented yet")
}

func (s *Server) Validate(ctx context.Context, req *authv1.ValidateRequest) (*authv1.ValidateResponse, error) {
	userID, err := ValidateToken(s.jwtSecret, req.GetAccessToken())
	if err != nil {
		return &authv1.ValidateResponse{Ok: false}, nil
	}
	return &authv1.ValidateResponse{UserId: userID, Ok: true}, nil
}
