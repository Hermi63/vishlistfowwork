# WishList — Социальный вишлист

Веб-приложение для создания списков желаний с возможностью резервирования подарков и совместного сбора средств.

## Возможности

- Регистрация и авторизация (email + пароль)
- Создание, редактирование, удаление вишлистов
- Публичные ссылки (работают без регистрации)
- Добавление подарков с автозаполнением из ссылки (OpenGraph)
- Резервирование подарков друзьями
- Совместный сбор средств на дорогие подарки (с прогресс-баром)
- Realtime обновления через WebSocket
- Сохранение сюрприза: владелец НЕ видит, кто зарезервировал или скинулся

## Технологии

| Компонент | Технология |
|-----------|------------|
| Frontend  | Next.js 14, React, TypeScript, Tailwind CSS |
| Backend   | FastAPI, SQLAlchemy (async), Python 3.12 |
| Database  | PostgreSQL |
| Realtime  | WebSockets |

## Структура проекта

```
├── backend/
│   ├── app/
│   │   ├── core/          # Config, database, security, deps
│   │   ├── models/        # SQLAlchemy models
│   │   ├── routers/       # API endpoints
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── services/      # WebSocket manager, link preview
│   │   └── main.py        # FastAPI app
│   ├── schema.sql         # Raw SQL schema
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/           # Next.js pages (App Router)
│   │   ├── components/    # React components
│   │   └── lib/           # API client, auth context, utils
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Быстрый старт (Docker)

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Локальная разработка

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Отредактируйте .env — укажите DATABASE_URL

uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Отредактируйте .env.local — укажите NEXT_PUBLIC_API_URL

npm run dev
```

## База данных

Таблицы создаются автоматически при первом запуске (SQLAlchemy `create_all`).

SQL-схема для справки: `backend/schema.sql`

### Таблицы

- `users` — пользователи
- `wishlists` — списки желаний (slug для публичных ссылок)
- `wishlist_items` — подарки (статусы: available, reserved, crowdfunding, funded)
- `reservations` — резервации (скрыты от владельца)
- `contributions` — вклады в сбор средств (скрыты от владельца)

## API Endpoints

| Method | Endpoint | Описание |
|--------|----------|----------|
| POST | `/api/auth/register` | Регистрация |
| POST | `/api/auth/login` | Вход |
| GET | `/api/auth/me` | Текущий пользователь |
| GET | `/api/wishlists/my` | Мои вишлисты |
| POST | `/api/wishlists/` | Создать вишлист |
| GET | `/api/wishlists/{slug}` | Получить вишлист (публичный) |
| PUT | `/api/wishlists/{slug}` | Обновить вишлист |
| DELETE | `/api/wishlists/{slug}` | Удалить вишлист |
| POST | `/api/wishlists/{slug}/items/` | Добавить подарок |
| PUT | `/api/wishlists/{slug}/items/{id}` | Обновить подарок |
| DELETE | `/api/wishlists/{slug}/items/{id}` | Удалить подарок |
| POST | `/api/wishlists/{slug}/items/{id}/reserve` | Зарезервировать |
| DELETE | `/api/wishlists/{slug}/items/{id}/reserve` | Отменить резерв |
| POST | `/api/wishlists/{slug}/items/{id}/contribute` | Внести вклад |
| DELETE | `/api/wishlists/{slug}/items/{id}/contribute/{cid}` | Удалить вклад |
| POST | `/api/link-preview` | Получить OpenGraph данные |
| WS | `/ws/{slug}` | Realtime обновления |

## Деплой

### Быстрый деплой (автоматический)

```bash
# Установите CLI-инструменты:
npm i -g @railway/cli vercel

# Запустите скрипт:
./deploy.sh
```

Скрипт последовательно:
1. Запросит DATABASE_URL от Supabase
2. Задеплоит backend на Railway с правильными env vars
3. Задеплоит frontend на Vercel с `NEXT_PUBLIC_API_URL`
4. Настроит CORS автоматически
5. Выведет все URL и переменные

### Ручной деплой

#### 1. База данных — Supabase (бесплатно)

1. Зайдите на [supabase.com](https://supabase.com) → New Project
2. Settings → Database → Connection string → URI
3. Замените `postgresql://` на `postgresql+asyncpg://`
4. Таблицы создадутся автоматически при первом запуске backend

#### 2. Backend — Railway

1. [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
2. Root Directory: `backend`
3. Environment Variables:

| Переменная | Значение |
|-----------|----------|
| `DATABASE_URL` | `postgresql+asyncpg://...` (из Supabase) |
| `SECRET_KEY` | `python -c "import secrets; print(secrets.token_hex(32))"` |
| `CORS_ORIGINS` | `https://your-app.vercel.app` |
| `APP_ENV` | `production` |

4. Railway автоматически подхватит `Dockerfile` и `railway.json`
5. Сгенерируйте публичный домен: Settings → Networking → Generate Domain

#### 3. Frontend — Vercel

1. [vercel.com](https://vercel.com) → Add New → Project → Import GitHub repo
2. Root Directory: `frontend`
3. Framework Preset: `Next.js`
4. Environment Variables:

| Переменная | Значение |
|-----------|----------|
| `NEXT_PUBLIC_API_URL` | `https://your-backend.up.railway.app` |

5. Deploy!

#### 4. Проверка

```bash
# Backend health check
curl https://your-backend.up.railway.app/api/health

# WebSocket (должен вернуть upgrade)
wscat -c wss://your-backend.up.railway.app/ws/test-slug
```

### Переменные окружения (полный список)

**Backend (Railway):**
| Переменная | Обязательная | Описание |
|-----------|:---:|----------|
| `DATABASE_URL` | да | PostgreSQL строка подключения (`postgresql+asyncpg://...`) |
| `SECRET_KEY` | да | Секрет для JWT (min 32 символа) |
| `CORS_ORIGINS` | да | URL фронтенда (через запятую) |
| `APP_ENV` | нет | `production` для строгих проверок |
| `GOOGLE_CLIENT_ID` | нет | Для Google OAuth |

**Frontend (Vercel):**
| Переменная | Обязательная | Описание |
|-----------|:---:|----------|
| `NEXT_PUBLIC_API_URL` | да | URL бэкенда |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | нет | Для Google OAuth |

## Безопасность

- JWT-авторизация с bcrypt-хешированием паролей
- Владелец видит статусы подарков, но НЕ видит кто зарезервировал/скинулся
- Редактирование/удаление доступно только владельцу
- Защита от двойного резервирования (UNIQUE constraint + проверка статуса)
- CORS настроен на конкретные origins

## Edge Cases

- Двойное резервирование: блокируется проверкой статуса + unique constraint
- Отмена резерва: только тем, кто зарезервировал
- Полностью профинансированный подарок: статус `funded`, вклады закрыты
- Удаление вишлиста: каскадное удаление всех подарков, резервов, вкладов
- Подарок без цены: сбор средств работает без прогресс-бара
