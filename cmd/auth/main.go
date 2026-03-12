package main

import (
	"context"
	"log"
	"net"
	"os"

	authv1 "notea/api/proto/auth/v1"
	"notea/internal/auth"

	"github.com/jackc/pgx/v5/pgxpool"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
)

func main() {
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		connStr = "postgres://localhost:5432/notea?sslmode=disable"
	}
	pool, err := pgxpool.New(context.Background(), connStr)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer pool.Close()
	if err := pool.Ping(context.Background()); err != nil {
		log.Fatalf("db ping: %v", err)
	}
	log.Println("DB connected")
	if err := auth.CreateTables(context.Background(), pool); err != nil {
		log.Fatalf("create tables: %v", err)
	}

	lis, err := net.Listen("tcp", ":9090")
	if err != nil {
		log.Fatalf("listen: %v", err)
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "dev-secret-change-in-production"
	}

	srv := grpc.NewServer()
	authServer := auth.NewServer(pool, jwtSecret)
	authv1.RegisterAuthServiceServer(srv, authServer)
	reflection.Register(srv)

	log.Println("Auth gRPC server listening on :9090")
	if err := srv.Serve(lis); err != nil {
		log.Fatalf("serve: %v", err)
	}
}
