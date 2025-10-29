# 🌿 **FitTrack** — умное приложение для учёта здоровья и питания

![FitTrack Logo](https://img.shields.io/badge/FitTrack-PWA-success?style=for-the-badge&logo=google-chrome&logoColor=white)
![.NET 8](https://img.shields.io/badge/.NET-8.0-blue?style=for-the-badge&logo=dotnet)
![Angular 18](https://img.shields.io/badge/Angular-18-red?style=for-the-badge&logo=angular)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?style=for-the-badge&logo=postgresql)
![License](https://img.shields.io/badge/license-MIT-lightgrey?style=for-the-badge)

---

## 🧠 Описание проекта
**FitTrack** — это прогрессивное веб-приложение (**PWA**) для отслеживания питания, воды и витаминов.  
Приложение помогает пользователям соблюдать баланс здоровья, формирует отчёты и рекомендации, а также поддерживает работу **в офлайн-режиме** с последующей синхронизацией данных.

---

## ⚙️ Технологический стек

| Слой | Технологии |
|------|-------------|
| **Frontend** | Angular 18, TypeScript, Material Design, Dexie.js (IndexedDB) |
| **Backend** | ASP.NET 8 Minimal API, Dapper ORM |
| **База данных** | PostgreSQL 16 (JSONB, GENERATED AS IDENTITY) |
| **Хостинг** | DigitalOcean ($5 VPS), Docker Compose |
| **CI/CD** | GitHub Actions + Nginx |
| **AI** | GPT + Codex для анализа и автогенерации кода |

---

## 📱 Основной функционал

### 💧 Учёт воды
- Добавление записей (200/500/1000 мл)
- Дневная цель и прогресс-бар
- Напоминания о гидратации

### 🥗 Учёт питания
- Добавление блюд, калорий и БЖУ
- Учёт витаминного состава (JSONB)
- Автоматический подсчёт дневного итога

### 🌿 Баланс витаминов
- Расчёт уровня витаминов
- Диаграммы дефицитов
- Рекомендации по продуктам

### ⏰ Напоминания
- Настройка интервалов (вода, еда, витамины)
- Push-уведомления (через Service Worker)

### 📊 Статистика
- Еженедельные графики (калории, вода, витамины)
- Сравнение с целями и динамикой

### ⚙️ Настройки
- Цели пользователя (вода, калории)
- Темы интерфейса (светлая/тёмная)
- Мультиязычность (укр/рус/англ)

---

## 📂 Документация проекта

| Файл | Назначение |
|------|-------------|
| [`/docs/architecture.md`](docs/architecture.md) | Архитектура и стек технологий |
| [`/docs/api-spec.md`](docs/api-spec.md) | Подробная спецификация REST API v1 |
| [`/docs/data-model.md`](docs/data-model.md) | Схема БД PostgreSQL |
| [`/docs/roadmap.md`](docs/roadmap.md) | Дорожная карта проекта |
| [`/docs/tasks.md`](docs/tasks.md) | Активные задачи для Codex и GPT |
| [`/docs/ui-wireframes.md`](docs/ui-wireframes.md) | Описание интерфейсов и экранов |

---

## 💻 Установка и запуск

### 1️⃣ Клонировать репозиторий
```bash
git clone https://github.com/yourname/fittrack.git
cd fittrack
```

### 2️⃣ Запустить в Docker
```bash
docker-compose up -d
```

### 3️⃣ Открыть приложение
```
http://localhost:8080
```

### 4️⃣ API доступно по адресу
```
http://localhost:5000/api/v1/
```

---

## 🧠 Интеграция GPT и Codex

FitTrack полностью интегрирован с **GPT-проектом** и **Codex**, что позволяет:
- Автоматически обновлять документацию и задачи (`/docs/tasks.md`);
- Генерировать код по комментариям `// TODO [Codex]: ...`;
- Получать AI-рекомендации по витаминам и рациону;
- Генерировать миграции и тесты на основе `/docs/data-model.md`.

---

## 🧭 Roadmap

| Версия | Цель | Статус |
|---------|------|--------|
| **v1.0.0** | MVP: учёт воды, еды, витаминов | 🟢 В разработке |
| **v1.1.0** | Рекомендации по витаминам (AI) | 🟡 Планируется |
| **v1.2.0** | Модуль сна и веса | 🕒 Планируется |
| **v2.0.0** | Интеграция с носимыми устройствами | ⚪ Концепт |

---

## ☁️ Серверная инфраструктура
- Ubuntu Server 24.04 + Docker Compose  
- Nginx reverse proxy (SSL via Certbot)  
- PostgreSQL с ежедневным `pg_dump`  
- Мониторинг: Grafana + Prometheus (планируется)

---

## 📜 Лицензия
Проект распространяется под лицензией [MIT](LICENSE).  
© 2025 FitTrack Team — Разработано в Украине 🇺🇦

---

> 💬 _“Track what matters. Stay balanced. Stay healthy.”_
