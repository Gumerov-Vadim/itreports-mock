# Mock API Server для IT Reports

Этот репозиторий содержит mock API сервер для системы отчетов IT, который предназначен для использования с React+Vite проектом, размещенным на Netlify.

## Доступные эндпоинты

- `POST /api/auth/login` - аутентификация пользователя
- `POST /api/auth/register` - регистрация нового пользователя
- `GET /api/reports` - получение списка отчетов
- Другие эндпоинты для работы с отчетами и пользователями

## Тестовые учетные записи

- Admin: `admin / admin123`
- User: `user / user123`

## Локальный запуск

1. Установите зависимости:
```
npm install
```

2. Запустите сервер:
```
npm start
```

Сервер будет доступен по адресу: http://localhost:5119

## Деплой на Dashboard

### Шаги для деплоя

1. Войдите в свой аккаунт Dashboard
2. Создайте новый проект и укажите этот репозиторий в качестве источника
3. Настройки уже определены в файле `dashboard.yaml`
4. В настройках окружения (Environment Variables) задайте:
   - `ALLOWED_ORIGINS` - укажите домен вашего Netlify проекта (например, `https://your-app.netlify.app`)

### Интеграция с фронтендом на Netlify

1. После деплоя mock API на Dashboard, получите URL вашего API (обычно это `https://your-project-name.dashboard.app`)
2. В вашем React+Vite проекте настройте переменную окружения для базового URL API:
   ```
   VITE_API_BASE_URL=https://your-project-name.dashboard.app/api
   ```
3. Используйте эту переменную для всех запросов к API:
   ```javascript
   const apiUrl = import.meta.env.VITE_API_BASE_URL;
   fetch(`${apiUrl}/reports`);
   ```

### Проверка соединения

После деплоя убедитесь, что:
1. CORS настроен правильно (в `ALLOWED_ORIGINS` указан домен вашего Netlify проекта)
2. API доступен из вашего фронтенд-приложения
3. Все эндпоинты работают корректно 