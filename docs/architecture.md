# 🧩 FitTrack UA+ — System Architecture

## Overview
**FitTrack** — это современное PWA-приложение для отслеживания питания, витаминов и воды.  
Frontend написан на **Angular 18 (TypeScript)**, backend — на **ASP.NET 8 Minimal API** с использованием **Dapper** и **PostgreSQL 16**.  
Приложение поддерживает офлайн-режим, кэширование данных, синхронизацию с сервером и push-уведомления.

---

## Goals
- Минимальная нагрузка на сервер (под VPS $5 DigitalOcean)
- Поддержка роста до тысяч пользователей
- Полностью автономная работа клиента при отсутствии интернета
- Прозрачная архитектура для Codex и CI/CD интеграции

---

## Architecture Layers

### 🧠 1. Frontend (Angular PWA)
**Технологии:** Angular 18, Angular Material, Chart.js, Dexie.js (IndexedDB), PWA service worker.

**Основные модули:**
| Модуль | Назначение |
|--------|-------------|
| `diary` | учёт еды и калорий |
| `water` | трекинг жидкости |
| `vitamins` | баланс витаминов и минералов |
| `reminders` | напоминания |
| `stats` | отчёты и графики |

**Frontend особенности:**
- Все данные кешируются в IndexedDB.
- При восстановлении сети выполняется синхронизация с API.
- UI выполнен в минималистичном стиле Material Design.
- Поддерживается установка на домашний экран (manifest.webmanifest).
- Web Notifications API используется для локальных напоминаний.

---

### ⚙️ 2. Backend (ASP.NET 8 + Dapper)
**Основной принцип:** чистый Minimal API без контроллеров MVC, только endpoints.  
Dapper используется для быстрой работы с PostgreSQL через параметризованные SQL-запросы.  
Миграции управляются через **FluentMigrator**.

**Структура:**

