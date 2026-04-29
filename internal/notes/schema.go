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
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			updated_at TIMESTAMPTZ NOT NULL,
			body       JSONB NOT NULL
		);
	`)
	if err != nil {
		return err
	}

	_, err = pool.Exec(ctx, `
		ALTER TABLE tea_notes
		ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
	`)
	if err != nil {
		return err
	}

	_, err = pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS teaware (
			id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			name        TEXT NOT NULL,
			type        TEXT NOT NULL,
			color_hex   TEXT NOT NULL DEFAULT '#d9e6d5',
			archived_at TIMESTAMPTZ NULL,
			created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
			updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
		);
	`)
	if err != nil {
		return err
	}

	_, err = pool.Exec(ctx, `
		CREATE INDEX IF NOT EXISTS teaware_user_active_idx
		ON teaware (user_id, archived_at, updated_at DESC);
	`)
	if err != nil {
		return err
	}

	_, err = pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS tea_setups (
			id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			name        TEXT NOT NULL,
			archived_at TIMESTAMPTZ NULL,
			created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
			updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
		);
	`)
	if err != nil {
		return err
	}

	_, err = pool.Exec(ctx, `
		CREATE INDEX IF NOT EXISTS tea_setups_user_active_idx
		ON tea_setups (user_id, archived_at, updated_at DESC);
	`)
	if err != nil {
		return err
	}

	_, err = pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS tea_setup_items (
			setup_id   UUID NOT NULL REFERENCES tea_setups(id) ON DELETE CASCADE,
			teaware_id UUID NOT NULL REFERENCES teaware(id) ON DELETE RESTRICT,
			sort_order INT NOT NULL DEFAULT 0,
			PRIMARY KEY (setup_id, teaware_id)
		);
	`)
	if err != nil {
		return err
	}
	_, err = pool.Exec(ctx, `
		CREATE INDEX IF NOT EXISTS tea_setup_items_setup_idx
		ON tea_setup_items (setup_id, sort_order, teaware_id);
	`)
	if err != nil {
		return err
	}
	_, err = pool.Exec(ctx, `
		CREATE INDEX IF NOT EXISTS tea_setup_items_teaware_idx
		ON tea_setup_items (teaware_id);
	`)
	if err != nil {
		return err
	}

	_, err = pool.Exec(ctx, `
		CREATE INDEX IF NOT EXISTS tea_notes_user_updated_idx
		ON tea_notes (user_id, created_at DESC, updated_at DESC);
	`)
	return err
}
