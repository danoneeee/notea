package main

import (
	"context"
	"log"
	"net"
	"os"

	teanotesv1 "notea/api/proto/teanotes/v1"
	"notea/internal/notes"

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

	if err := notes.CreateTables(context.Background(), pool); err != nil {
		log.Fatalf("create tables: %v", err)
	}

	lis, err := net.Listen("tcp", ":9091")
	if err != nil {
		log.Fatalf("listen: %v", err)
	}

	srv := grpc.NewServer()
	teanotesv1.RegisterTeaNotesServiceServer(srv, notes.NewServer(pool))
	reflection.Register(srv)

	log.Println("Notes gRPC server listening on :9091")
	if err := srv.Serve(lis); err != nil {
		log.Fatalf("serve: %v", err)
	}
}
