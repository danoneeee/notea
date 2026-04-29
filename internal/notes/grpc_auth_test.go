package notes

import (
	"context"
	"testing"

	teanotesv1 "notea/api/proto/teanotes/v1"
	"notea/internal/auth"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

func TestUnaryAuthInterceptor_AllowsPublicMethodWithoutToken(t *testing.T) {
	interceptor := UnaryAuthInterceptor("unused-secret")

	info := &grpc.UnaryServerInfo{
		FullMethod: teanotesv1.TeaNotesService_ListTeas_FullMethodName,
	}

	called := false
	handler := func(ctx context.Context, req any) (any, error) {
		called = true
		return "ok", nil
	}

	resp, err := interceptor(context.Background(), struct{}{}, info, handler)
	if err != nil {
		t.Fatalf("public method should not require auth, got error: %v", err)
	}
	if !called {
		t.Fatalf("handler was not called for public method")
	}
	if resp != "ok" {
		t.Fatalf("response = %v, want %v", resp, "ok")
	}
}

func TestUnaryAuthInterceptor_Integration_WithIssuedAccessToken(t *testing.T) {
	secret := "integration-secret"
	userID := "user-int-1"

	accessToken, _, err := auth.Issue(secret, userID)
	if err != nil {
		t.Fatalf("Issue() returned error: %v", err)
	}

	interceptor := UnaryAuthInterceptor(secret)
	info := &grpc.UnaryServerInfo{
		FullMethod: teanotesv1.TeaNotesService_ListTeaNotes_FullMethodName,
	}
	ctx := metadata.NewIncomingContext(context.Background(), metadata.Pairs("authorization", "Bearer "+accessToken))

	handler := func(ctx context.Context, req any) (any, error) {
		gotUserID, err := UserIDFromContext(ctx)
		if err != nil {
			t.Fatalf("UserIDFromContext() in handler returned error: %v", err)
		}
		if gotUserID != userID {
			t.Fatalf("UserIDFromContext() = %q, want %q", gotUserID, userID)
		}
		return "authorized", nil
	}

	resp, err := interceptor(ctx, struct{}{}, info, handler)
	if err != nil {
		t.Fatalf("interceptor returned error for valid token: %v", err)
	}
	if resp != "authorized" {
		t.Fatalf("response = %v, want %v", resp, "authorized")
	}
}

func TestUnaryAuthInterceptor_RejectsRefreshTokenForProtectedMethod(t *testing.T) {
	secret := "integration-secret"
	userID := "user-int-2"

	_, refreshToken, err := auth.Issue(secret, userID)
	if err != nil {
		t.Fatalf("Issue() returned error: %v", err)
	}

	interceptor := UnaryAuthInterceptor(secret)
	info := &grpc.UnaryServerInfo{
		FullMethod: teanotesv1.TeaNotesService_ListTeaNotes_FullMethodName,
	}
	ctx := metadata.NewIncomingContext(context.Background(), metadata.Pairs("authorization", "Bearer "+refreshToken))

	handler := func(ctx context.Context, req any) (any, error) {
		t.Fatalf("handler should not be called with refresh token")
		return nil, nil
	}

	_, err = interceptor(ctx, struct{}{}, info, handler)
	if err == nil {
		t.Fatalf("interceptor should reject refresh token for protected method")
	}
	if status.Code(err) != codes.Unauthenticated {
		t.Fatalf("status code = %v, want %v", status.Code(err), codes.Unauthenticated)
	}
}
