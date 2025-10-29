# 🧩 FitTrack UA+ — Архитектура Offline-First

_Версия 3.0 · 2025-11-02_

## Обновлённый обзор
FitTrack UA+ переходит на полностью офлайн-архитектуру. Приложение представляет собой автономный **Angular 18 PWA**, где все данные хранятся в IndexedDB и защищаются локальным шифрованием. Облачная синхронизация реализована в виде отдельного уровня коннекторов, которые по запросу пользователя создают зашифрованный бэкап и отправляют его в выбранный облачный сервис.

### Основные компоненты
- **PWA Shell:** Angular-приложение, работающие в режиме standalone modules с lazy-loading.
- **Data Core:** слой работы с IndexedDB (Dexie.js), включает схемы, репозитории и миграции локальной базы.
- **Crypto Service:** управление ключами шифрования (WebCrypto), PBKDF2 для derive, AES-GCM для шифрования данных.
- **Sync Engine:** фоновые задачи и менеджер версий бэкапов (Service Worker, Background Sync API, Web Locks API).
- **Cloud Connectors:** плагины для OneDrive, Google Drive, Dropbox, iCloud. Каждый реализует единый контракт `CloudConnector`.
- **UI Layer:** компоненты и сервисы Angular Material, использующие RxJS для реактивного состояния.

---

## 🎯 Цели архитектуры
- Обеспечить автономную работу приложения без обязательного подключения к интернету.
- Гарантировать приватность за счёт шифрования всех пользовательских данных на устройстве.
- Дать пользователю контроль над синхронизацией и местом хранения бэкапа.
- Облегчить расширение за счёт модульных коннекторов и локальных миграций IndexedDB.

---

## ⚙️ Структура проекта
```
fittrack-ua/
├── apps/
│   └── pwa/               → основной Angular проект
├── libs/
│   ├── data-core/         → IndexedDB schema, репозитории, миграции Dexie
│   ├── crypto/            → WebCrypto utilities, управление ключами
│   ├── sync-engine/       → менеджер бэкапов, фоновые процессы
│   ├── cloud-connectors/  → адаптеры для OneDrive/GDrive/Dropbox/iCloud
│   └── ui/                → переиспользуемые компоненты и темы
└── tools/
    └── scripts/           → сборка, аудит пакетов, тесты
```

---

## 🧠 Data Core (IndexedDB)
- Используется Dexie.js с версионированием схемы (`db.version(x).stores({...})`).
- Объектные хранилища: `water`, `food`, `vitamins`, `reminders`, `settings`, `backups`.
- Каждая запись хранится в зашифрованном виде (`EncryptedPayload`).
- Миграции определяются в `libs/data-core/src/lib/migrations` и автоматически применяются при обновлении версии базы.

### Формат `EncryptedPayload`
```ts
interface EncryptedPayload<T> {
  iv: string;           // base64 IV
  cipherText: string;   // base64 encrypted JSON
  authTag?: string;     // для совместимости с Node.js AES-GCM
  meta: {
    schemaVersion: number;
    createdAt: string;  // ISO
    updatedAt: string;  // ISO
  };
}
```

---

## 🔐 Crypto Service
- Мастер-ключ (`masterKey`) генерируется при первом запуске (`crypto.subtle.generateKey`).
- Пользователь задаёт пароль → PBKDF2 + salt → ключ для шифрования `masterKey` перед сохранением.
- В памяти ключ хранится только во время активной сессии (используется Web Locks + session storage token).
- Поддерживается смена пароля и ротация ключей (реверсия бэкапа + повторное шифрование).

---

## 🔄 Sync Engine
- Управляет очередями синхронизации и состояниями (`idle`, `pending`, `uploading`, `downloading`, `conflict`).
- Взаимодействует с Service Worker:
  - слушает `sync` события (Background Sync API);
  - использует `postMessage` для уведомления UI о прогрессе.
- Сравнение версий осуществляется по `fittrack-data.hash` (SHA-256) и `backupVersion`.
- Конфликты решаются через пользовательский диалог с двумя опциями: «Обновить облако» или «Восстановить локально».

### Поток «Создать бэкап»
1. Data Core собирает все сущности в `BackupSnapshot`.
2. Crypto Service шифрует JSON → `EncryptedBackup`.
3. Sync Engine записывает файл в локальный кеш (`IndexedDB.backups`).
4. Cloud Connector выполняет загрузку в облако.
5. Хэш и метаданные обновляются в `settings.syncState`.

### Поток «Восстановить из облака»
1. Cloud Connector скачивает `fittrack-data.json` + `fittrack-data.hash`.
2. Проверяется целостность хэш-суммы.
3. Crypto Service расшифровывает бэкап.
4. Data Core выполняет транзакционное обновление локальных хранилищ.

---

## ☁️ Cloud Connectors
Все коннекторы реализуют интерфейс:
```ts
interface CloudConnector {
  id: 'onedrive' | 'gdrive' | 'dropbox' | 'icloud';
  name: string;
  authenticate(): Promise<AuthResult>;
  upload(backup: EncryptedBackup): Promise<UploadResult>;
  download(): Promise<EncryptedBackup | null>;
  getMetadata(): Promise<BackupMetadata | null>;
}
```

- Авторизация выполняется через OAuth 2.0 / PKCE или нативные SDK (для iOS через Capacitor).
- Все коннекторы используют однообразные метаданные (`backupVersion`, `updatedAt`, `hash`).
- Для офлайн-устройств хранится очередь операций, которая выполняется при восстановлении сети.

---

## 🧭 UI Layer и состояние
- Используется `signals`/`RxJS` для реактивных потоков.
- Состояние модулей (`water`, `food`, `vitamins`, `reminders`) синхронизируется с IndexedDB через сервисы `DataSourceService`.
- Экраны отображают индикатор офлайна, статусы синхронизации и дату последнего бэкапа.
- Настройки синхронизации доступны в `SettingsSyncComponent` (переключатели, выбор провайдера, кнопка «Сделать бэкап сейчас»).

---

## 🔒 Практики безопасности
- Все чувствительные данные (журналы, напоминания, настройки) шифруются до записи в IndexedDB.
- Секреты OAuth хранятся только в облачных консолях — приложение использует PKCE и short-lived tokens.
- Service Worker ограничен trusted origins; используется HTTPS и HSTS.
- Настроены Content Security Policy и Trusted Types.

---

## ☁️ Сборка и деплой
- `npm run build` формирует production-сборку с pre-caching манифестом Workbox.
- GitHub Actions запускает `npm run lint`, `npm run test`, `npm run build`.
- Автодеплой на Netlify/Firebase/GitHub Pages выполняется из артефактов Actions.
- Для нативных контейнеров (Capacitor) доступна упаковка под iOS/Android с локальными разрешениями на файлы.

---

## 📌 Итог
FitTrack UA+ в версии 3.0 — это полностью автономное, приватное и расширяемое приложение. Локальная база, шифрование, гибкие коннекторы и современный UI обеспечивают устойчивую работу в офлайне и безопасную синхронизацию с облаком по запросу пользователя.
