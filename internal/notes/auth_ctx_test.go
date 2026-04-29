package notes

import (
	"context"
	"testing"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func TestUserIDFromContext(t *testing.T) {
	ctx := WithUserID(context.Background(), "user-321")

	got, err := UserIDFromContext(ctx)
	if err != nil {
		t.Fatalf("UserIDFromContext() returned error: %v", err)
	}
	if got != "user-321" {
		t.Fatalf("UserIDFromContext() userID = %q, want %q", got, "user-321")
	}
}

func TestUserIDFromContextUnauthenticated(t *testing.T) {
	_, err := UserIDFromContext(context.Background())
	if err == nil {
		t.Fatalf("UserIDFromContext() expected unauthenticated error")
	}
	if status.Code(err) != codes.Unauthenticated {
		t.Fatalf("status code = %v, want %v", status.Code(err), codes.Unauthenticated)
	}
}
