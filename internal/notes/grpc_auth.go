package notes

import (
	"context"
	"strings"

	teanotesv1 "notea/api/proto/teanotes/v1"
	"notea/internal/auth"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

// RPC без JWT: справочники и устаревшие session-* (всё ещё не реализованы).
var teaNotesPublicMethods = map[string]struct{}{
	teanotesv1.TeaNotesService_ListTeas_FullMethodName:                 {},
	teanotesv1.TeaNotesService_ListDescriptorCategories_FullMethodName: {},
}

func UnaryAuthInterceptor(jwtSecret string) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req any, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (any, error) {
		if _, ok := teaNotesPublicMethods[info.FullMethod]; ok {
			return handler(ctx, req)
		}
		md, ok := metadata.FromIncomingContext(ctx)
		if !ok {
			return nil, status.Error(codes.Unauthenticated, "missing metadata")
		}
		vals := md.Get("authorization")
		if len(vals) == 0 {
			vals = md.Get("grpc-metadata-authorization")
		}
		if len(vals) == 0 {
			return nil, status.Error(codes.Unauthenticated, "missing authorization")
		}
		raw := strings.TrimSpace(vals[0])
		if len(raw) > 7 && strings.EqualFold(raw[:7], "bearer ") {
			raw = strings.TrimSpace(raw[7:])
		}
		userID, err := auth.ValidateToken(jwtSecret, raw)
		if err != nil {
			return nil, status.Error(codes.Unauthenticated, "invalid token")
		}
		return handler(WithUserID(ctx, userID), req)
	}
}
