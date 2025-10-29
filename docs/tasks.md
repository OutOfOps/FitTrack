# 🧾 FitTrack UA+ — Активные задачи Offline-First

## Общее описание
Файл синхронизирует работу команды и автоматических ассистентов. Каждая задача ориентирована на офлайн-приложение, локальную базу и облачную синхронизацию.

---

## 🧠 Data Core & Crypto (IndexedDB + WebCrypto)
- [ ] **Реализовать DataCoreService**
  - Методы: `saveWater`, `saveFood`, `listByDay`, `deleteById`.
  - Все данные сохраняются как `EncryptedPayload`.
  - Покрыть unit-тестами с fake-indexeddb.

- [ ] **Создать CryptoService**
  - Генерация и хранение мастер-ключа (AES-GCM 256).
  - PBKDF2 для derive из пользовательского пароля.
  - Методы `encrypt<T>()`, `decrypt<T>()`, `rotateKey()`.

- [ ] **Миграции IndexedDB v3**
  - Добавить store `tokens`.
  - Скрипт обновления существующих записей на новую структуру.
  - Smoke-тест «backup roundtrip».

---

## 💧 Вода & 🥗 Питание (UI + Сервисы)
- [ ] **WaterTrackerComponent**
  - Реактивные кнопки `+200/+500/+1000` → `DataCoreService.saveWater`.
  - Плашка офлайна: «Данные сохраняются локально».
  - Инфо о последнем бэкапе.

- [ ] **FoodDiaryComponent**
  - Форма добавления блюда, отображение списка и дневного итога.
  - Поддержка импорта из шаблона (`.json`).
  - Валидация витаминов (ключи A-Z, значения ≥ 0).

- [ ] **VitaminBalanceComponent**
  - Диаграмма прогресса (ng-charts / ngx-echarts).
  - Уведомления о дефиците → локальное уведомление.
  - Кнопка «Сформировать рекомендации» (локальный словарь продуктов).

---

## ⏰ Напоминания и уведомления
- [ ] **ReminderSchedulerService**
  - Использовать Notifications API + Service Worker.
  - Поддержка будней/выходных.
  - Сценарий «отложить на 10 минут».

- [ ] **Настройки напоминаний**
  - Экран управления расписанием.
  - Тоггл «Разрешить уведомления», обработка `Notification.permission`.
  - Локальное хранение звуков/тональности.

---

## ☁️ Cloud Sync Engine
- [ ] **SyncEngineService**
  - Состояния `idle/pending/uploading/downloading/conflict`.
  - Методы `runBackup()`, `runRestore()`, `resolveConflict()`.
  - Интеграция с Background Sync API.

- [ ] **OneDriveConnector**
  - Авторизация через OAuth 2.0 PKCE (MSAL Browser).
  - Загрузка/выгрузка файла `fittrack-data.json` и `fittrack-data.hash`.
  - Логирование ошибок в локальное хранилище.

- [ ] **GoogleDriveConnector**
  - Device Code Flow (чтобы работать на десктопе/мобиле).
  - Обновление refresh token при истечении.
  - Тесты с использованием gapi-mock.

- [ ] **DropboxConnector**
  - Short-lived токены + refresh endpoint.
  - Проверка квоты перед загрузкой.
  - UI предупреждение, если меньше 100 МБ свободно.

- [ ] **iCloudConnector**
  - WebDAV авторизация с app-specific password.
  - Поддержка повторных попыток при `HTTP 503`.
  - Обработка ограничения по размеру файлов.

---

## 🛠 Инфраструктура и качество
- [ ] Настроить GitHub Actions: `npm run lint`, `npm run test`, `npm run build`.
- [ ] Добавить Lighthouse-аудит PWA в CI.
- [ ] Настроить автоматический выпуск релизов (Release Please или Changesets).
- [ ] Обновить `README.md` при изменении синхронизации/шифрования.

---

## 📘 Документация и локализации
- [ ] Подготовить гайд «Как восстановиться из облака» (рус/укр/англ).
- [ ] Добавить раздел FAQ об офлайн-режиме.
- [ ] Сгенерировать JSON-локализации для статусов синхронизации.
- [ ] Держать `/docs/ui-wireframes.md` в актуальном состоянии при изменении экранов.

---

**Ответственный:** FitTrack Offline Core Team  
**Последнее обновление:** 2 ноября 2025  
**Версия:** 2.0
