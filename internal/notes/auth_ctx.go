package notes

import (
	"context"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type ctxKeyUserID struct{}

func WithUserID(ctx context.Context, userID string) context.Context {
	return context.WithValue(ctx, ctxKeyUserID{}, userID)
}

func UserIDFromContext(ctx context.Context) (string, error) {
	v, ok := ctx.Value(ctxKeyUserID{}).(string)
	if !ok || v == "" {
		return "", status.Error(codes.Unauthenticated, "unauthenticated")
	}
	return v, nil
}
