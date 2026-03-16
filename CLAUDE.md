# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Проект

WishList — социальная платформа для создания вишлистов с поддержкой резервирования подарков и совместного сбора средств. Full-stack приложение: **FastAPI** (бэкенд) + **Next.js 14** (фронтенд) + **PostgreSQL**.

## Команды разработки

### Локальный запуск (Docker)

```bash
# Запустить всё (БД + бэкенд + фронтенд)
docker compose up --build

# Сервисы:
# Frontend:  http://localhost:3000
# Backend:   http://localhost:8000
# API docs:  http://localhost:8000/docs
```

### Backend (FastAPI)

```bash
cd backend

# Установка зависимостей
pip install -r requirements.txt

# Запуск сервера
uvicorn app.main:app --reload --port 8000

# Запуск всех тестов
pytest

# Запуск одного теста
pytest tests/test_auth.py::test_login -v

# Запуск с логами
pytest -s -v
```

### Frontend (Next.js)

```bash
cd frontend

# Установка зависимостей
npm install

# Dev сервер
npm run dev

# Сборка
npm run build

# Запуск production сборки
npm start

# Линтинг
npm run lint
```

## Архитектура

### Backend (`backend/app/`)

- **`main.py`** — точка входа FastAPI, подключение роутеров
- **`core/`** — конфигурация (`config.py`), подключение к БД (`database.py`), JWT-аутентификация и зависимости (`deps.py`, `security.py`)
- **`models/`** — SQLAlchemy ORM-модели: `User`, `Wishlist`, `WishlistItem`, `Reservation`, `Contribution`
- **`schemas/`** — Pydantic схемы запросов/ответов
- **`routers/`** — API endpoints: `auth.py`, `wishlists.py`, `items.py`, `preview.py`, `ws.py`
- **`services/`** — бизнес-логика: `link_preview.py` (парсинг OpenGraph), `websocket_manager.py` (realtime)

БД создаётся автоматически при старте через SQLAlchemy. Схема также задокументирована в `backend/schema.sql`.

### Frontend (`frontend/src/`)

- **`app/`** — Next.js App Router: страницы `login/`, `register/`, `dashboard/`, `create-wishlist/`, `wishlist/[slug]/`
- **`components/`** — переиспользуемые компоненты (`ui/`, `gift-card.tsx`, `navbar.tsx`)
- **`lib/`** — API-клиент, контекст аутентификации, утилиты

### Realtime

WebSocket подключение к `/ws/{slug}` — бэкенд рассылает события всем подключённым клиентам при изменении вишлиста (резервирование, взносы).

## Переменные окружения

**Backend** (см. `backend/.env.example`):
- `DATABASE_URL` — PostgreSQL connection string
- `SECRET_KEY` — JWT secret
- `CORS_ORIGINS` — URL фронтенда
- `GOOGLE_CLIENT_ID` — Google OAuth (опционально)

**Frontend** (см. `frontend/.env.example`):
- `NEXT_PUBLIC_API_URL` — URL бэкенда

## Деплой

- **БД:** Supabase
- **Бэкенд:** Railway (конфиг в `backend/railway.json`)
- **Фронтенд:** Vercel (Next.js standalone output)
- **Автоматический деплой:** `./deploy.sh`
