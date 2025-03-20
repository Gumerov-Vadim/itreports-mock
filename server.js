import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';

// Получаем абсолютный путь к текущему модулю
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const require = createRequire(import.meta.url);
const jsonServer = require('json-server');
const path = require('path');

// Используем динамический импорт вместо require
const middlewareModule = await import('./middleware.js');
const middleware = middlewareModule.default;

const server = jsonServer.create();
const router = jsonServer.router(join(__dirname, 'db.json'));

// Настройки CORS
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Применяем CORS
server.use(cors(corsOptions));

// Базовые middleware
server.use(jsonServer.defaults());
server.use(jsonServer.bodyParser);

// Отладочный лог для отслеживания запросов
server.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Применяем наш middleware для обработки кастомных маршрутов
server.use(middleware);

// Специфические маршруты auth обрабатываются в middleware
server.post('/api/auth/login', (req, res) => {
  // Обработка происходит в middleware
});

server.post('/api/auth/register', (req, res) => {
  // Обработка происходит в middleware
});

// Обработка основных CRUD операций через роутер json-server
server.use('/api', router);

// Добавляем обработку 404 для всех остальных маршрутов
server.use((req, res) => {
  res.status(404).json({
    error: `Route ${req.originalUrl} not found`
  });
});

// Обработка ошибок
server.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5119;

server.listen(PORT, () => {
  console.log(`Mock API server running on port ${PORT}`);
  console.log(`Access: http://localhost:${PORT}/api/reports`);
  console.log(`Пользователи для тестирования:`);
  console.log(`- admin / admin123`);
  console.log(`- user / user123`);
}); 