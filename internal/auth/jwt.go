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
}

func Issue(secret, userID string) (accessToken, refreshToken string, err error) {
	now := time.Now()
	accessClaims := claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			ExpiresAt: jwt.NewNumericDate(now.Add(accessTokenExp)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
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
	}
	refresh := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshToken, err = refresh.SignedString([]byte(secret))
	if err != nil {
		return "", "", fmt.Errorf("sign refresh: %w", err)
	}
	return accessToken, refreshToken, nil
}

func ValidateToken(secret, tokenString string) (userID string, err error) {
	tok, err := jwt.ParseWithClaims(tokenString, &claims{}, func(t *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	})
	if err != nil {
		return "", err
	}
	c, ok := tok.Claims.(*claims)
	if !ok || !tok.Valid {
		return "", jwt.ErrTokenInvalidClaims
	}
	return c.Subject, nil
}
