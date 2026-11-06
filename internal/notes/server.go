package notes

import (
	"context"

	teanotesv1 "notea/api/proto/teanotes/v1"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Server struct {
	teanotesv1.UnimplementedTeaNotesServiceServer
	pool *pgxpool.Pool
}

func NewServer(pool *pgxpool.Pool) *Server {
	return &Server{pool: pool}
}

func (s *Server) ListTeas(ctx context.Context, req *teanotesv1.ListTeasRequest) (*teanotesv1.ListTeasResponse, error) {
	rows, err := s.pool.Query(ctx, `SELECT id::text, name, province, variant FROM teas ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var teas []*teanotesv1.Tea
	for rows.Next() {
		var id, name, province, variant string
		if err := rows.Scan(&id, &name, &province, &variant); err != nil {
			return nil, err
		}
		teas = append(teas, &teanotesv1.Tea{Id: id, Name: name, Province: province, Variant: variant})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if teas == nil {
		teas = []*teanotesv1.Tea{}
	}
	return &teanotesv1.ListTeasResponse{Teas: teas}, nil
}

func (s *Server) ListDescriptorCategories(ctx context.Context, req *teanotesv1.ListDescriptorCategoriesRequest) (*teanotesv1.ListDescriptorCategoriesResponse, error) {
	return &teanotesv1.ListDescriptorCategoriesResponse{Categories: descriptorCatalog}, nil
}
