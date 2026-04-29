# Docker Runbook

## Start everything

```bash
docker compose up --build
```

After startup:

- web: `http://localhost:5173`
- envoy gRPC-web gateway: `http://localhost:8080`
- auth gRPC: `localhost:9090`
- notes gRPC: `localhost:9091`
- postgres: `localhost:5432`

## Reset database

```bash
docker compose down -v
docker compose up --build
```

## Stop stack

```bash
docker compose down
```

## Notes

- PostgreSQL credentials inside compose:
  - db: `notea`
  - user: `notea`
  - password: `notea`
- `web` uses Vite proxy inside the container and forwards API requests to `envoy`.
- `auth` and `notes` share the same `JWT_SECRET` in compose.
