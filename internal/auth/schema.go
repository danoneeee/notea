package auth

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

func CreateTables(ctx context.Context, pool *pgxpool.Pool) error {
	_, err := pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS users (
			id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			email          TEXT NOT NULL UNIQUE,
			password_hash  TEXT NOT NULL,
			display_name   TEXT NOT NULL,
			created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
		);
	`)
	return err
}
