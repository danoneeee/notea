package auth

import (
	"testing"

	"github.com/golang-jwt/jwt/v5"
)

func TestIssueAndValidateTokenUse(t *testing.T) {
	secret := "test-secret"
	userID := "user-123"

	accessToken, refreshToken, err := Issue(secret, userID)
	if err != nil {
		t.Fatalf("Issue() returned error: %v", err)
	}

	if accessToken == "" || refreshToken == "" {
		t.Fatalf("Issue() returned empty token(s)")
	}

	gotUserID, err := ValidateTokenUse(secret, accessToken, "access")
	if err != nil {
		t.Fatalf("ValidateTokenUse() for access failed: %v", err)
	}
	if gotUserID != userID {
		t.Fatalf("ValidateTokenUse() userID = %q, want %q", gotUserID, userID)
	}

	gotUserID, err = ValidateTokenUse(secret, refreshToken, "refresh")
	if err != nil {
		t.Fatalf("ValidateTokenUse() for refresh failed: %v", err)
	}
	if gotUserID != userID {
		t.Fatalf("ValidateTokenUse() refresh userID = %q, want %q", gotUserID, userID)
	}
}

func TestValidateTokenUseRejectsWrongTokenUse(t *testing.T) {
	secret := "test-secret"
	userID := "user-123"

	_, refreshToken, err := Issue(secret, userID)
	if err != nil {
		t.Fatalf("Issue() returned error: %v", err)
	}

	_, err = ValidateTokenUse(secret, refreshToken, "access")
	if err == nil {
		t.Fatalf("ValidateTokenUse() expected error for wrong token use")
	}
	if err != jwt.ErrTokenInvalidClaims {
		t.Fatalf("ValidateTokenUse() error = %v, want %v", err, jwt.ErrTokenInvalidClaims)
	}
}
