import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, BorderStyle, WidthType } from 'docx';

// Получаем абсолютный путь к текущему модулю
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');
const jsonServer = require('json-server');

// Исправляем путь к файлу БД, используя относительный путь
const router = jsonServer.router(join(__dirname, 'db.json'));
const db = router.db;

// Функция для проверки токена и получения роли пользователя
const getUserRoleFromToken = (req) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  // Извлекаем токен из заголовка
  // const token = authHeader.split(' ')[1];
  
  // В real-world приложении здесь был бы код проверки JWT токена
  // Но для нашего мока мы просто используем роль из заголовка X-User-Role, если он есть,
  // или предполагаем роль 'user' по умолчанию
  return req.headers['x-user-role'] || 'user';
};

// Middleware для имитации аутентификации
export default async (req, res, next) => {
  // Отладочный вывод для всех запросов
  console.log(`[Запрос]: ${req.method} ${req.path}`);
  
  // Добавляем CORS заголовки для всех запросов
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-User-Role');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  // Предварительные запросы OPTIONS
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  // Генерация случайного токена
  const generateToken = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };
  
  // Обработка аутентификации
  if (req.method === 'POST' && req.path === '/api/auth/login') {
    console.log('Попытка входа:', req.body);
    const { username, password } = req.body;
    
    // Проверка на наличие тела запроса и учетных данных
    if (!username || !password) {
      console.log('Ошибка входа: отсутствуют учетные данные');
      return res.status(400).jsonp({ error: 'Необходимо указать имя пользователя и пароль' });
    }
    
    const user = db.get('users').find({ username, password }).value();
    
    if (user) {
      console.log('Успешный вход:', username, 'с ролью:', user.role);
      return res.jsonp({
        token: generateToken(),
        role: user.role
      });
    } else {
      console.log('Ошибка входа: неверные данные');
      return res.status(401).jsonp({ error: 'Неверное имя пользователя или пароль' });
    }
  }
  
  // Обработка регистрации
  if (req.method === 'POST' && req.path === '/api/auth/register') {
    console.log('Попытка регистрации:', req.body);
    const { username, password } = req.body;
    
    // Проверка на наличие тела запроса и учетных данных
    if (!username || !password) {
      console.log('Ошибка регистрации: отсутствуют учетные данные');
      return res.status(400).jsonp({ error: 'Необходимо указать имя пользователя и пароль' });
    }
    
    const existingUser = db.get('users').find({ username }).value();
    
    if (existingUser) {
      console.log('Ошибка регистрации: пользователь существует');
      return res.status(400).jsonp({ error: 'Пользователь с таким именем уже существует' });
    }
    
    const newUser = {
      id: Date.now(),
      username,
      password,
      role: 'user' // По умолчанию новые пользователи получают роль "user"
    };
    
    db.get('users').push(newUser).write();
    console.log('Успешная регистрация:', username);
    
    return res.jsonp({
      token: generateToken(),
      role: newUser.role
    });
  }
  
  // Обработка запроса на генерацию отчета
  if (req.method === 'GET' && req.path === '/api/reports/generate-report') {
    console.log('Запрос на генерацию отчета');
    
    // Получаем роль пользователя
    const userRole = getUserRoleFromToken(req);
    console.log('Роль пользователя:', userRole);
    
    // Получаем параметры запроса
    const startDate = new Date(req.query.startDate);
    const endDate = new Date(req.query.endDate);
    
    console.log('Параметры запроса:', {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      parsedStartDate: startDate.toISOString(),
      parsedEndDate: endDate.toISOString()
    });
    
    // Получаем все отчеты
    const allReports = db.get('reports').value();
    console.log('Всего отчетов в базе:', allReports.length);
    
    // Получаем все отчеты за указанный период
    let reports = allReports.filter(report => {
      const reportDate = new Date(report.applicationDate);
      const isInRange = reportDate >= startDate && reportDate <= endDate;
      console.log(`Отчет #${report.id}: ${report.applicationDate} - ${isInRange ? 'входит' : 'не входит'} в диапазон`);
      return isInRange;
    });
    
    console.log(`Найдено отчетов за период: ${reports.length}`);
    
    // Если пользователь не админ, фильтруем отчеты с типами нарушений, доступными только для админов
    if (userRole !== 'admin') {
      const adminOnlyTypes = db.get('violationTypes')
        .filter(type => type.adminOnly)
        .map(type => type.id)
        .value();
      
      console.log('Типы нарушений только для админов:', adminOnlyTypes);
      
      reports = reports.filter(report => !adminOnlyTypes.includes(report.violationType));
      console.log('Отфильтровано отчетов для обычного пользователя:', reports.length);
    }
    
    // Получаем все типы нарушений
    let violationTypes = db.get('violationTypes').value();
    console.log('Все типы нарушений:', violationTypes);
    
    // Если пользователь не админ, фильтруем типы нарушений
    if (userRole !== 'admin') {
      violationTypes = violationTypes.filter(type => !type.adminOnly);
      console.log('Отфильтрованные типы нарушений для обычного пользователя:', violationTypes);
    }
    
    // Создаем статистику по типам
    const statistics = violationTypes.map(type => {
      // Фильтруем отчеты по типу нарушения
      const typeReports = reports.filter(report => report.violationType === type.id);
      
      // Считаем, сколько отчетов с результатом "Выявлено"
      const detected = typeReports.filter(report => 
        report.inspectionResult === 'Выявлено'
      ).length;
      
      // Считаем, сколько отчетов с результатом "Не выявлено"
      const notDetected = typeReports.filter(report => 
        report.inspectionResult === 'Не выявлено'
      ).length;
      
      // Считаем, сколько отчетов с другими результатами
      const other = typeReports.length - detected - notDetected;
      
      console.log(`Тип ${type.id} (${type.name}): Выявлено - ${detected}, Не выявлено - ${notDetected}, Другие - ${other}, Всего отчетов: ${typeReports.length}`);
      
      return {
        type,
        detected,
        notDetected,
        other,
        total: typeReports.length
      };
    });
    
    // Отладочный вывод
    console.log('Общая статистика:', JSON.stringify(statistics.map(s => ({
      id: s.type.id,
      name: s.type.name,
      detected: s.detected,
      notDetected: s.notDetected,
      total: s.total
    })), null, 2));
    
    // Создаем документ
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: `Сформированный отчет по нарушениям с ${startDate.toLocaleDateString()} по ${endDate.toLocaleDateString()}`,
                bold: true,
                size: 24
              })
            ]
          }),
          new Paragraph({}),
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE
            },
            rows: [
              // Заголовок таблицы
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Характер выявленных нарушений', bold: true })] })],
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 1 },
                      bottom: { style: BorderStyle.SINGLE, size: 1 },
                      left: { style: BorderStyle.SINGLE, size: 1 },
                      right: { style: BorderStyle.SINGLE, size: 1 }
                    }
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Выявлено', bold: true })] })],
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 1 },
                      bottom: { style: BorderStyle.SINGLE, size: 1 },
                      left: { style: BorderStyle.SINGLE, size: 1 },
                      right: { style: BorderStyle.SINGLE, size: 1 }
                    }
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Не выявлено', bold: true })] })],
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 1 },
                      bottom: { style: BorderStyle.SINGLE, size: 1 },
                      left: { style: BorderStyle.SINGLE, size: 1 },
                      right: { style: BorderStyle.SINGLE, size: 1 }
                    }
                  })
                ]
              }),
              // Данные по каждому типу нарушения
              ...statistics
                .filter(stat => stat.total > 0) // Показываем только типы, у которых есть отчеты
                .map(stat => {
                  console.log(`Добавляем строку в таблицу: ${stat.type.name} - Выявлено: ${stat.detected}, Не выявлено: ${stat.notDetected}`);
                  return new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: stat.type.name })] })],
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 1 },
                          bottom: { style: BorderStyle.SINGLE, size: 1 },
                          left: { style: BorderStyle.SINGLE, size: 1 },
                          right: { style: BorderStyle.SINGLE, size: 1 }
                        }
                      }),
                      new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: stat.detected.toString() })] })],
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 1 },
                          bottom: { style: BorderStyle.SINGLE, size: 1 },
                          left: { style: BorderStyle.SINGLE, size: 1 },
                          right: { style: BorderStyle.SINGLE, size: 1 }
                        }
                      }),
                      new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: stat.notDetected.toString() })] })],
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 1 },
                          bottom: { style: BorderStyle.SINGLE, size: 1 },
                          left: { style: BorderStyle.SINGLE, size: 1 },
                          right: { style: BorderStyle.SINGLE, size: 1 }
                        }
                      })
                    ]
                  });
                })
            ]
          })
        ]
      }]
    });
    
    // Генерируем буфер документа
    const buffer = await Packer.toBuffer(doc);
    
    // Отправляем документ
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=report_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}.docx`);
    return res.send(buffer);
  }
  
  // Получение типов нарушений
  if (req.method === 'GET' && req.path === '/api/violation-types') {
    console.log('Запрос на получение типов нарушений');
    const userRole = getUserRoleFromToken(req);
    
    // Получаем все типы нарушений
    let violationTypes = db.get('violationTypes').value();
    
    // Если пользователь не админ, фильтруем типы с adminOnly: true
    if (userRole !== 'admin') {
      violationTypes = violationTypes.filter(type => !type.adminOnly);
    }
    
    return res.jsonp(violationTypes);
  }
  
  // Обработка запроса для получения отчетов
  if (req.method === 'GET' && req.path === '/api/reports') {
    console.log('Запрос на получение списка отчетов');
    
    // Получаем роль пользователя из токена
    const userRole = getUserRoleFromToken(req);
    console.log('Роль пользователя:', userRole);
    
    // Получаем список отчетов
    let reports = db.get('reports').value();
    
    // Получаем список типов нарушений, доступных только для админов
    const adminOnlyTypes = db.get('violationTypes')
      .filter(type => type.adminOnly)
      .map(type => type.id)
      .value();
    
    // Если пользователь не админ, фильтруем отчеты с типами нарушений, доступными только для админов
    if (userRole !== 'admin') {
      reports = reports.filter(report => !adminOnlyTypes.includes(report.violationType));
      console.log('Отфильтровано отчетов для обычного пользователя:', reports.length);
    }
    
    return res.jsonp(reports);
  }
  
  // Обработка запроса для получения отчета по ID
  if (req.method === 'GET' && req.path.match(/^\/api\/reports\/\d+$/)) {
    const id = parseInt(req.path.split('/')[3]);
    console.log(`Запрос на получение отчета #${id}`);
    
    const report = db.get('reports').find({ id }).value();
    
    if (!report) {
      return res.status(404).jsonp({ error: 'Отчет не найден' });
    }
    
    // Проверяем, имеет ли пользователь доступ к этому отчету
    const userRole = getUserRoleFromToken(req);
    
    // Получаем информацию о типе нарушения
    const violationType = db.get('violationTypes').find({ id: report.violationType }).value();
    
    if (violationType && violationType.adminOnly && userRole !== 'admin') {
      console.log(`Отказано в доступе к отчету #${id} пользователю с ролью ${userRole}`);
      return res.status(403).jsonp({ 
        error: 'Доступ запрещен. Этот отчет доступен только администраторам.' 
      });
    }
    
    return res.jsonp(report);
  }
  
  // Обработка обновления результата проверки
  if (req.method === 'PUT' && req.path.match(/\/api\/reports\/\d+\/inspection-result/)) {
    const id = parseInt(req.path.split('/')[3]);
    
    // Проверяем, имеет ли пользователь доступ к этому отчету
    const userRole = getUserRoleFromToken(req);
    const report = db.get('reports').find({ id }).value();
    
    if (!report) {
      return res.status(404).jsonp({ error: 'Отчет не найден' });
    }
    
    // Проверяем, является ли тип нарушения только для админов
    const violationType = db.get('violationTypes').find({ id: report.violationType }).value();
    
    if (violationType && violationType.adminOnly && userRole !== 'admin') {
      console.log(`Отказано в обновлении отчета #${id} пользователю с ролью ${userRole}`);
      return res.status(403).jsonp({ 
        error: 'Доступ запрещен. Этот отчет доступен только администраторам.' 
      });
    }
    
    // Получаем новый результат проверки
    try {
      console.log('Тело запроса:', JSON.stringify(req.body));
      
      let newResult;
      
      // Если пришел объект с полем result
      if (req.body && req.body.result) {
        newResult = req.body.result;
      } 
      // Если пришла строка или объект без поля result
      else if (typeof req.body === 'string' || (req.body && typeof req.body === 'object')) {
        newResult = typeof req.body === 'string' ? req.body : req.body.toString();
      }
      else {
        throw new Error('Неверный формат данных');
      }
      
      console.log(`Обновление результата для отчета #${id}: ${newResult}`);
      
      db.get('reports')
        .find({ id })
        .assign({ inspectionResult: newResult })
        .write();
      
      // Возвращаем обновленный отчет
      const updatedReport = db.get('reports').find({ id }).value();
      console.log('Обновленный отчет:', updatedReport);
      
      return res.jsonp(updatedReport);
    } catch (error) {
      console.error('Ошибка при обработке запроса:', error);
      return res.status(400).jsonp({ error: 'Неверный формат данных запроса' });
    }
  }
  
  // Создание нового отчета
  if (req.method === 'POST' && req.path === '/api/reports') {
    console.log('Создание нового отчета:', req.body);
    
    // Проверяем, имеет ли пользователь доступ к созданию отчета с указанным типом нарушения
    const userRole = getUserRoleFromToken(req);
    const violationTypeId = parseInt(req.body.violationType);
    
    // Проверяем, является ли тип нарушения только для админов
    const violationType = db.get('violationTypes').find({ id: violationTypeId }).value();
    
    if (violationType && violationType.adminOnly && userRole !== 'admin') {
      console.log(`Отказано в создании отчета с типом ${violationTypeId} пользователю с ролью ${userRole}`);
      return res.status(403).jsonp({ 
        error: 'Доступ запрещен. Отчеты с этим типом нарушения могут создавать только администраторы.' 
      });
    }
    
    const newReport = {
      id: Date.now(),
      ...req.body,
      applicationDate: req.body.applicationDate || new Date().toISOString()
    };
    
    db.get('reports').push(newReport).write();
    
    return res.status(201).jsonp(newReport);
  }
  
  // Удаление отчета
  if (req.method === 'DELETE' && req.path.match(/^\/api\/reports\/\d+$/)) {
    const id = parseInt(req.path.split('/')[3]);
    console.log(`Удаление отчета #${id}`);
    
    // Проверяем, имеет ли пользователь доступ к удалению этого отчета
    const userRole = getUserRoleFromToken(req);
    const report = db.get('reports').find({ id }).value();
    
    if (!report) {
      return res.status(404).jsonp({ error: 'Отчет не найден' });
    }
    
    // Проверяем, является ли тип нарушения только для админов
    const violationType = db.get('violationTypes').find({ id: report.violationType }).value();
    
    if (violationType && violationType.adminOnly && userRole !== 'admin') {
      console.log(`Отказано в удалении отчета #${id} пользователю с ролью ${userRole}`);
      return res.status(403).jsonp({ 
        error: 'Доступ запрещен. Этот отчет доступен только администраторам.' 
      });
    }
    
    db.get('reports').remove({ id }).write();
    return res.status(204).send();
  }
  
  next();
}; 