# 🧩 FitTrack — System Architecture

## Overview
FitTrack — это кроссплатформенное **Progressive Web App (PWA)**-приложение для отслеживания питания, воды и витаминов.  
Приложение работает офлайн, синхронизируется при появлении сети и поддерживает push-уведомления.  
Технологический стек:
- **Frontend:** Angular 18 + PWA + Material UI + Dexie (IndexedDB)
- **Backend:** ASP.NET 8 Minimal API + Dapper ORM
- **Database:** PostgreSQL 16 (через FluentMigrator)
- **Deployment:** Docker + Nginx + Certbot на DigitalOcean (VPS $5)

---

## 🎯 Цели проекта
- Упростить контроль рациона, витаминов и воды.  
- Работать офлайн с последующей синхронизацией.  
- Минимизировать нагрузку на сервер (низкое потребление RAM).  
- Обеспечить масштабируемость и простоту поддержки.

---

## ⚙️ Архитектура по слоям
```
fittrack-ua/
├── client/ (Angular PWA)
│   ├── core/        → auth, interceptors, guards
│   ├── shared/      → общие компоненты и utils
│   ├── features/
│   │   ├── diary/      → учёт еды
│   │   ├── water/      → учёт жидкости
│   │   ├── vitamins/   → анализ витаминов
│   │   ├── reminders/  → уведомления
│   │   └── stats/      → отчёты
│   └── environments/
│
└── server/ (ASP.NET 8)
    ├── Infrastructure/
    │   ├── Database/
    │   │   ├── ConnectionFactory.cs
    │   │   ├── Migrations/ (FluentMigrator)
    │   │   └── DbInitializer.cs
    │   └── Repositories/ (Dapper)
    ├── Models/
    ├── Services/
    └── Program.cs
```

---

## 🧠 Frontend

### Технологии
- **Angular 18**  
- **@angular/pwa** — офлайн-режим  
- **Angular Material** — UI  
- **Dexie.js** — IndexedDB-слой  
- **Chart.js / ng2-charts** — визуализация  
- **Web Notifications API** — напоминания  

### Основные модули
| Модуль | Назначение |
|---------|-------------|
| `diary` | учёт пищи и калорий |
| `water` | отслеживание жидкости |
| `vitamins` | баланс витаминов и минералов |
| `reminders` | push-уведомления и расписание |
| `stats` | графики и аналитика |

### Архитектурные принципы
- RxJS streams для данных.  
- Сервисы (*.service.ts) общаются с API.  
- IndexedDB служит офлайн-кэшем.  
- При восстановлении сети выполняется sync-service.  
- Все запросы типизированы через interfaces.ts.

---

## ⚙️ Backend (.NET 8 Minimal API + Dapper)

### Основные пакеты
- `Dapper` — лёгкий ORM  
- `Npgsql` — PostgreSQL драйвер  
- `FluentMigrator` — миграции  
- `JwtBearer` — аутентификация  

### Репозитории
Каждый репозиторий инкапсулирует SQL-запросы:
```csharp
public class WaterRepository
{
    private readonly IDbConnection _db;
    public WaterRepository(IDbConnection db) => _db = db;

    public Task<IEnumerable<WaterEntry>> GetTodayAsync(int userId) =>
        _db.QueryAsync<WaterEntry>(
            "SELECT * FROM water_entries WHERE user_id=@userId AND date=CURRENT_DATE;",
            new { userId });

    public Task<int> AddAsync(WaterEntry e) =>
        _db.ExecuteScalarAsync<int>(
            "INSERT INTO water_entries (user_id,date,amount_ml,created_at) VALUES (@UserId,@Date,@AmountMl,now()) RETURNING id;",
            e);
}
```

---

## 🗄 Database (PostgreSQL 16)

### Основные таблицы
- `users`
- `food_entries`
- `water_entries`
- `vitamin_profiles`
- `reminders`

### Особенности
- JSONB поля для динамических нутриентов  
- Foreign Keys с ON DELETE CASCADE  
- Индексы по user_id и date  
- Миграции через FluentMigrator

---

## 🔐 Аутентификация
- JWT Bearer Token  
- Refresh-token pattern  
- BCrypt хэширование паролей  

---

## 🌐 API
REST + JSON  
Версионирование через `/api/v1/…`

| Method | Endpoint | Назначение |
|---------|-----------|-------------|
| GET | `/api/food` | список еды |
| POST | `/api/food` | добавить еду |
| GET | `/api/water/today` | учёт воды |
| POST | `/api/water/add` | добавить воду |
| GET | `/api/vitamins/balance` | баланс витаминов |
| POST | `/api/reminders` | напоминания |

---

## ☁️ Deployment
- **DigitalOcean Droplet (1 GB RAM)**  
- **Docker Compose:** API + Angular + Postgres  
- **Nginx** reverse proxy  
- **Certbot** (Let’s Encrypt SSL)  

```yaml
version: "3.9"
services:
  api:
    build: ./server
    ports: ["5000:5000"]
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
    depends_on: [db]
  client:
    build: ./client
    ports: ["80:80"]
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: fittrack
      POSTGRES_USER: fituser
      POSTGRES_PASSWORD: strongpass
```

---

## 🧩 Интеграция GPT и Codex
1. **GPT-проект** обсуждает фичи → обновляет `/docs/roadmap.md`.  
2. **Codex** читает `/docs/architecture.md` и `/docs/api-spec.md` → создаёт код.  
3. TODO-комментарии связывают код и документацию:
   ```csharp
   // TODO [Codex]: implement /api/vitamins/recommendations with Dapper
   ```
4. После merge GPT обновляет документацию и roadmap.

---

## 🧰 Code Style
- Комментарии на английском.  
- SQL только параметризованный.  
- DI через AddScoped.  
- Логика — в сервисах, не в контроллерах.  
- ESLint + Prettier / StyleCop.  

---

## ✅ Резюме
FitTrack UA+ — лёгкое, безопасное и масштабируемое приложение, использующее современный стек для анализа питания и здоровья.  
Поддерживает офлайн-режим, синхронизацию и интеграцию GPT ↔ Codex для автоматизации разработки.
