package notes

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

func CreateTables(ctx context.Context, pool *pgxpool.Pool) error {
	_, err := pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS teas (
			id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			name      TEXT NOT NULL,
			province  TEXT NOT NULL,
			variant   TEXT NOT NULL DEFAULT ''
		);
	`)
	if err != nil {
		return err
	}

	_, err = pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS sessions (
			id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			tea_id               UUID NOT NULL REFERENCES teas(id),
			user_id              UUID NOT NULL REFERENCES users(id),
			temperature_c        INT NOT NULL,
			steep_sec            INT NOT NULL,
			leaves_g_per_100ml   DOUBLE PRECISION NOT NULL,
			notes                TEXT NOT NULL DEFAULT '',
			session_at           TIMESTAMPTZ NOT NULL,
			created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
		);
	`)
	if err != nil {
		return err
	}

	_, err = pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS session_descriptor_scores (
			session_id     UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
			descriptor_id  TEXT NOT NULL,
			intensity      INT NOT NULL CHECK (intensity >= 1 AND intensity <= 5),
			kind           TEXT NOT NULL CHECK (kind IN ('aroma', 'taste')),
			PRIMARY KEY (session_id, descriptor_id, kind)
		);
	`)
	if err != nil {
		return err
	}

	_, err = pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS tea_notes (
			id         UUID PRIMARY KEY,
			user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			updated_at TIMESTAMPTZ NOT NULL,
			body       JSONB NOT NULL
		);
	`)
	if err != nil {
		return err
	}
	_, err = pool.Exec(ctx, `
		CREATE INDEX IF NOT EXISTS tea_notes_user_updated_idx
		ON tea_notes (user_id, updated_at DESC);
	`)
	return err
}
