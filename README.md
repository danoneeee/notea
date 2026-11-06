# Notea

Веб-сервис чайных заметок: описание чая и заваривания, дескрипторы вкуса и аромата,
оценки, коллекция посуды, профили и публикация заметок. Черновики сохраняются
локально; после входа приложение синхронизирует заметки с сервером.

## Стек и структура

- `cmd/auth`, `internal/auth` — Go-сервис регистрации, входа и JWT, gRPC `:9090`.
- `cmd/notes`, `internal/notes` — Go-сервис заметок и посуды, gRPC `:9091`.
- `internal/dbmigrate` — миграции PostgreSQL при запуске сервисов.
- `api/proto` — protobuf-контракты и сгенерированный Go-код.
- `web` — Vue 3, TypeScript, Vite; сгенерированные клиенты в `web/src/generated`.
- `deployments` — Envoy: перевод gRPC-Web браузера в gRPC сервисов.
- `.github/workflows/ci.yml` — проверки pull request и сборка артефактов.

Браузер → Vite-прокси → Envoy → auth / notes → PostgreSQL.

## Быстрый запуск

Нужны Docker Engine / Docker Desktop и Docker Compose v2.

```sh
git clone https://github.com/danoneeee/notea.git
cd notea
docker compose up --build
```

Открыть http://localhost:5173. Зарегистрировать пользователя через интерфейс.
В Docker Compose уже заданы локальные параметры подключения и тестовый JWT-секрет.
Миграции выполняются автоматически; данные хранятся в Docker volume.

```sh
docker compose down     # остановить, сохранив данные
```

Команда `docker compose down -v` удаляет локальную базу данных.
Подробности запуска: [DOCKER.md](DOCKER.md).

## Локальная разработка

Нужны Go версии из `go.mod` или новее, Node.js 22 (`.nvmrc`), npm, Make,
Docker Compose; для Go-тестов с `-race` также нужен C-компилятор.

```sh
make install
# Поднять БД, оба Go-сервиса и Envoy, оставив фронтенд на хосте:
docker compose up --build -d postgres auth notes envoy
npm run dev --prefix web
```

`make install` загружает зависимости, поэтому требует сети. Зависимости приложения
устанавливаются через `npm ci`; отдельные инструменты качества — из `tools`.
Файл `tools/package-lock.json` необходимо сформировать при первом доступе к сети
и зафиксировать в Git; подробности — в [.github/README.md](.github/README.md).

Для запуска Go-сервисов вне Docker: скопировать `.env.example` в `.env` и
экспортировать его переменные в оболочку, затем запустить `go run ./cmd/auth` и
`go run ./cmd/notes` в разных терминалах. Go-приложения не читают `.env` автоматически.
Для настройки Vite скопировать `web/.env.example` в `web/.env.local`.

### Переменные окружения

- `DATABASE_URL` — строка PostgreSQL; используется обоими Go-сервисами.
- `JWT_SECRET` — одинаковый секрет у auth и notes. В продакшене задать свой секрет.
- `VITE_PROXY_TARGET` — адрес Envoy для Vite; по умолчанию `http://localhost:8080`.
- `VITE_API_URL` — необязательный публичный адрес API; по умолчанию текущий origin.
  Значения `VITE_*` доступны браузеру, поэтому не содержат секретов.

Compose задаёт окружение контейнеров в `docker-compose.yml`.
Локальные `.env` не заменяют эти значения автоматически.

## Команды качества

```sh
make help          # все команды
make fmt           # форматирование Go
make lint          # gofmt, go vet, ESLint, vue-tsc
make test          # Go-тесты, race detector, coverage/go.out
make build         # bin/auth, bin/notes, web/dist
make check         # линтеры, тесты и сборка
```

ESLint проверяет Vue/TypeScript/JavaScript; `vue-tsc` проверяет также типы внутри
Vue-компонентов. Сгенерированный frontend-код исключён из ESLint.
Go-тестам не нужна запущенная база; они не заменяют браузерную проверку приложения.

## Браузерные тесты

Playwright проверяет регистрацию, создание заметки, восстановление черновика,
редактирование и удаление. Нужен полный backend; Playwright сам запускает Vite
на `127.0.0.1:4173`.

```sh
npx --prefix web playwright install chromium
docker compose up --build -d postgres auth notes envoy
make test-e2e
```

На Linux для браузера могут потребоваться системные зависимости:
`npx --prefix web playwright install --with-deps chromium`.
При сбое доступны HTML-отчёт и trace в `web/playwright-report` / `web/test-results`.

## GitHub CI и доставка сборок

Каждый PR запускает четыре обязательных по назначению проверки: Go, frontend,
браузерный сценарий с PostgreSQL/Envoy и сборку Docker-образов.
Запуски при push настроены для `main` и `master`. Проверки сохраняют coverage,
бинарные файлы, frontend-сборку и диагностические материалы Playwright.

Чтобы GitHub блокировал слияние при сбоях, нужно включить правила ветки:
[инструкция](.github/README.md). Одних YAML-файлов для этого недостаточно.
Автоматический production-деплой требует выбранного окружения и пока не настроен.
Docker Compose и Dockerfile фронтенда предназначены для разработки.

## Изменения API

Контракты находятся в `api/proto`; параметры генерации — в `buf.gen.yaml`.
При изменении контрактов обновлять одновременно серверные и браузерные клиенты.
Для генерации нужны Buf и локальные плагины из `buf.gen.yaml`.
