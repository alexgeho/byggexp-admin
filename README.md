# ByggExp Admin

Административная панель проекта ByggExp для управления строительными компаниями, сотрудниками, проектами, задачами, сменами, инвентарем и рабочими сценариями сотрудников.

Проект переведен на `Next.js` с App Router. UI построен на `React`, `Ant Design`, `Zustand` и работает с backend API через `axios` и `fetch`.

## Что умеет приложение

- авторизация через email/password;
- хранение `access` и `refresh` токенов на клиенте;
- автоматическое обновление access token при `401`;
- role-based доступ к разделам интерфейса;
- отдельные маршруты и layout'ы для разных ролей;
- управление компаниями, пользователями, проектами, задачами, сменами и инструментами;
- рабочие сценарии для сотрудников: мои проекты, учет времени, загрузка фото;
- разделы инвойсинга для клиентов, артикулов и счетов.

## Роли и доступ

В приложении предусмотрены 4 основные роли:

- `superadmin` - полный доступ к компаниям, пользователям, проектам, задачам и сменам;
- `companyAdmin` - управление проектами и сотрудниками своей компании;
- `projectAdmin` - доступ к назначенным проектам и связанным операциям;
- `worker` - доступ к своим проектам, учету времени и загрузке фотографий.

После входа пользователь автоматически перенаправляется в раздел, соответствующий его роли:

- `superadmin` -> `/admin`
- `companyAdmin` -> `/company`
- `projectAdmin` -> `/projects`
- `worker` -> `/worker`

## Технологии

- `Next.js 16`
- `React 19`
- `Ant Design 6`
- `Zustand`
- `Axios`
- `SCSS`
- `ESLint 9`

## Требования

Для локального запуска понадобится:

- `Node.js 20.20+`
- `npm 10+`

## Быстрый старт

1. Установите зависимости:

```bash
npm install
```

2. Создайте локальный env-файл:

```bash
cp .env.example .env.local
```

3. Укажите адрес backend API в `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

4. Запустите dev-сервер:

```bash
npm run dev
```

По умолчанию Next.js поднимет приложение по адресу `http://localhost:5173`.

## Переменные окружения

Обязательная публичная переменная:

- `NEXT_PUBLIC_API_URL` - базовый URL backend API.

Пример:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

Для текущего production backend используется:

```env
NEXT_PUBLIC_API_URL=https://api.byggexp.se
```

Переменная встраивается в клиентский bundle во время `next build`, поэтому для production-сборки ее нужно передавать на этапе build. Не храните приватные секреты в `NEXT_PUBLIC_*` переменных.

## Скрипты

- `npm run dev` - запуск локального dev-сервера на порту `5173`;
- `npm run build` - production-сборка Next.js;
- `npm run start` - запуск `.next/standalone/server.js` на порту `5173` после `npm run build`;
- `npm run preview` - алиас для локального production-запуска;
- `npm run lint` - проверка ESLint.

## Структура проекта

```text
app/
  layout.jsx        корневой layout Next.js
  page.jsx          редирект на /login
  login/            страница входа
  auth/callback/    обработчик auth callback
  admin/            маршруты superadmin
  company/          маршруты companyAdmin
  projects/         маршруты projectAdmin/worker
  worker/           рабочие маршруты сотрудников

src/
  api/              HTTP-клиент и настройки запросов
  config/           конфигурация frontend-переменных
  features/         страницы и формы предметных разделов
  shared/           layout'ы, auth guards, provider'ы, общие компоненты
  store/            Zustand store'ы
  styles/           SCSS-слои приложения
  utils/            вспомогательные функции
```

## Маршрутизация

Основные группы маршрутов:

- `/login` - страница входа;
- `/auth/callback` - обработка auth callback;
- `/admin/*` - зона `superadmin`;
- `/company/*` - зона `superadmin` и `companyAdmin`;
- `/projects/*` - зона `superadmin`, `companyAdmin`, `projectAdmin`, `worker`;
- `/worker/*` - рабочая зона для учета времени и загрузки фото;
- `/unauthorized` - экран отказа в доступе.

Защита маршрутов реализована через `ProtectedRoute`, role-based логика хранится в `authStore`, а старые React Router hooks покрыты compatibility layer в `src/shared/routing/routerCompat.js`.

## Работа с API

HTTP-запросы централизованы в `src/api/apiClient.js`.

Что важно:

- базовый URL берется из `NEXT_PUBLIC_API_URL`;
- `Authorization: Bearer <token>` добавляется автоматически;
- при `401` выполняется запрос на `/auth/refresh`;
- если refresh не удался, пользователь разлогинивается и отправляется на `/login`;
- login выполняется через `POST /auth/login`.

## Сборка и деплой

Проект собирается как Next.js standalone-приложение:

```bash
npm run build
npm run start
```

В `next.config.js` включен `output: 'standalone'`. Для VPS-деплоя в репозитории есть:

- `.github/workflows/deploy.yml` - GitHub Actions workflow;
- `ecosystem.config.cjs` - PM2-конфигурация для Next standalone server;
- `deploy/nginx-admin.conf.example` - пример nginx proxy на Next.js процесс (PM2 слушает `127.0.0.1:5175`).

Pipeline делает следующее:

1. устанавливает зависимости через `npm ci`;
2. собирает проект командой `npm run build`;
3. упаковывает `.next/standalone`, `public` и `.next/static`;
4. копирует архив на VPS;
5. раскладывает новый релиз в `/opt/byggexp-admin/releases/...`;
6. атомарно переключает симлинк `current`;
7. перезапускает PM2-процесс;
8. выполняет health check.

Для CI/CD используются GitHub Secrets:

- `NEXT_PUBLIC_API_URL`
- `SSH_HOST`
- `SSH_PORT`
- `SSH_USER`
- `SSH_PRIVATE_KEY`

## Полезно знать при разработке

- состояние авторизации сохраняется в `localStorage` под единым ключом `auth-session`;
- приложение умеет читать старые ключи авторизации и мигрировать их в новый формат;
- большинство экранов являются клиентскими компонентами, потому что используют hooks, Zustand, Ant Design и browser API;
- `NEXT_PUBLIC_API_URL` обязателен для build и runtime API-запросов.
