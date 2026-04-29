package auth

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	accessTokenExp  = 15 * time.Minute
	refreshTokenExp = 7 * 24 * time.Hour
)

type claims struct {
	jwt.RegisteredClaims
	TokenUse string `json:"token_use,omitempty"`
}

func Issue(secret, userID string) (accessToken, refreshToken string, err error) {
	now := time.Now()
	accessClaims := claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			ExpiresAt: jwt.NewNumericDate(now.Add(accessTokenExp)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
		TokenUse: "access",
	}
	access := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessToken, err = access.SignedString([]byte(secret))
	if err != nil {
		return "", "", fmt.Errorf("sign access: %w", err)
	}

	refreshClaims := claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			ExpiresAt: jwt.NewNumericDate(now.Add(refreshTokenExp)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
		TokenUse: "refresh",
	}
	refresh := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshToken, err = refresh.SignedString([]byte(secret))
	if err != nil {
		return "", "", fmt.Errorf("sign refresh: %w", err)
	}
	return accessToken, refreshToken, nil
}

func validateTokenClaims(secret, tokenString string) (*claims, error) {
	tok, err := jwt.ParseWithClaims(tokenString, &claims{}, func(t *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}
	c, ok := tok.Claims.(*claims)
	if !ok || !tok.Valid {
		return nil, jwt.ErrTokenInvalidClaims
	}
	if c.TokenUse == "" {
		c.TokenUse = "access"
	}
	return c, nil
}

func ValidateToken(secret, tokenString string) (userID string, err error) {
	return ValidateTokenUse(secret, tokenString, "access")
}

func ValidateTokenUse(secret, tokenString, expectedUse string) (userID string, err error) {
	c, err := validateTokenClaims(secret, tokenString)
	if err != nil {
		return "", err
	}
	if c.TokenUse != expectedUse {
		return "", jwt.ErrTokenInvalidClaims
	}
	return c.Subject, nil
}
