SHELL := /bin/sh
.DEFAULT_GOAL := help

.PHONY: help install fmt fmt-check lint lint-go lint-web typecheck test test-go test-e2e build build-go build-web check up down logs

help: ## Show available commands
	@awk 'BEGIN {FS = ":.*## "} /^[a-zA-Z_-]+:.*## / {printf "  %-16s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install Go, web and frontend tooling dependencies (requires network)
	go mod download
	npm ci --prefix web
	npm ci --prefix tools --ignore-scripts --no-audit --no-fund

fmt: ## Format handwritten Go code
	gofmt -w cmd internal

fmt-check: ## Check Go formatting without changing files
	@files="$$(gofmt -l cmd internal)"; if [ -n "$$files" ]; then printf '%s\n' "$$files"; exit 1; fi

lint-go: fmt-check ## Check Go formatting and run go vet
	go vet -mod=readonly ./...

lint-web: ## Lint Vue, TypeScript, JavaScript and frontend config
	npm run lint --prefix web

typecheck: ## Check TypeScript including Vue components
	npm run typecheck --prefix web

lint: lint-go lint-web typecheck ## Run all static checks

test: test-go ## Run backend tests (no database required)

test-go: ## Run Go tests with race detection and coverage
	mkdir -p coverage
	go test -mod=readonly -race -count=1 -coverprofile=coverage/go.out ./...

test-e2e: ## Run Playwright; start backend stack first (see README)
	npm run test:e2e --prefix web

build-go: ## Build both backend services
	mkdir -p bin
	go build -mod=readonly -o bin/auth ./cmd/auth
	go build -mod=readonly -o bin/notes ./cmd/notes

build-web: typecheck ## Type-check and build web assets
	npm run build --prefix web

build: build-go build-web ## Build backend and frontend

check: lint test build ## Run local CI checks (E2E runs separately)

up: ## Build and start the development stack
	docker compose up --build -d

down: ## Stop the stack while preserving database data
	docker compose down

logs: ## Follow stack logs
	docker compose logs -f
