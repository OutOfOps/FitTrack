# 🔐 FitTrack UA+ — Backup & Sync Specification v3

> **Версия:** 3.0  
> **Дата обновления:** 2025-11-02  
> **Подход:** Offline-First + Cloud Sync

## Обзор
Документ описывает формат зашифрованного бэкапа `fittrack-data.json`, метаданные `fittrack-data.hash`, а также унифицированный интерфейс работы с облачными коннекторами (OneDrive, Google Drive, Dropbox, iCloud). Серверных REST API больше нет — вся логика реализована в клиенте, а взаимодействие с облаками происходит напрямую через SDK и OAuth.

---

## 📦 Формат бэкапа
Перед шифрованием приложение формирует объект `BackupSnapshot`:
```json
{
  "version": 3,
  "generatedAt": "2025-11-02T09:45:12.123Z",
  "water": [ { "id": "w-173053", "amountMl": 250, "timestamp": "2025-11-02T06:00:00.000Z" } ],
  "food": [ { "id": "f-39012", "name": "Овсянка", "calories": 240, "macros": { "protein": 6, "fat": 4, "carbs": 42 }, "vitamins": { "C": 12 } } ],
  "vitamins": [ { "id": "vit-01", "code": "D", "value": 5, "recommended": 10, "unit": "µg" } ],
  "reminders": [ { "id": "rem-01", "type": "water", "time": "09:00", "intervalMinutes": 120, "enabled": true } ],
  "settings": {
    "waterGoalMl": 2500,
    "calorieGoal": 2000,
    "theme": "system",
    "language": "uk",
    "sync": {
      "enabled": true,
      "provider": "gdrive",
      "lastUploadedAt": "2025-11-01T18:33:10.000Z"
    }
  }
}
```

### Правила
- Поле `version` соответствует версии схемы IndexedDB.
- Все идентификаторы — строковые UUID/ulid.
- Даты — ISO 8601 в UTC.
- Перед записью в файл объект сериализуется в JSON и шифруется.

---

## 🔐 Шифрование
- Используется `AES-GCM 256`.
- IV (12 байт) генерируется для каждого бэкапа отдельно и кодируется в base64.
- Результат шифрования хранится в `EncryptedBackup`:
```json
{
  "ciphertext": "base64...",
  "iv": "base64...",
  "salt": "base64...",          // для PBKDF2
  "iterations": 310000,           // количество итераций PBKDF2
  "kdf": "PBKDF2-SHA256",
  "authTag": "base64...",        // добавляется для совместимости с нативными средами
  "meta": {
    "schemaVersion": 3,
    "backupVersion": "2025.11.02-01",
    "generatedAt": "2025-11-02T09:45:12.123Z",
    "appVersion": "1.0.0"
  }
}
```

- Пароль пользователя применяется только для защиты мастер-ключа (`masterKey`).
- Хэш `fittrack-data.hash` содержит:
```json
{
  "hash": "sha256:ab56b4d92b40713acc5af89985d4b786",
  "generatedAt": "2025-11-02T09:45:12.123Z",
  "backupVersion": "2025.11.02-01"
}
```

---

## ☁️ Интерфейс облачных коннекторов
Каждый коннектор обязан реализовать контракт:
```ts
export interface CloudConnector {
  readonly id: CloudProviderId;
  readonly displayName: string;
  authenticate(): Promise<AuthResult>;
  upload(payload: EncryptedBackup, hash: BackupHash): Promise<UploadResult>;
  download(): Promise<DownloadedBackup | null>;
  revoke(): Promise<void>;
  getStatus(): Promise<ConnectorStatus>;
}
```

### Сценарии
1. **Первая авторизация**
   - Вызывается `authenticate()` → OAuth 2.0 PKCE/Device Code Flow.
   - Access token хранится в IndexedDB в зашифрованном виде.
2. **Загрузка**
   - `upload()` создаёт/обновляет файл `fittrack-data.json` и сопутствующий `fittrack-data.hash`.
   - Для OneDrive/GDrive используется REST SDK, для Dropbox — `files/upload`, для iCloud — WebDAV.
3. **Загрузка на устройство**
   - `download()` возвращает `EncryptedBackup` и проверку наличия hash-файла.
   - При отсутствии файлов возвращается `null`.
4. **Отзыв доступа**
   - `revoke()` удаляет токены и локальное состояние коннектора.

---

## 🔁 Статусы синхронизации
`ConnectorStatus` содержит:
```ts
interface ConnectorStatus {
  state: 'idle' | 'auth_required' | 'uploading' | 'downloading' | 'conflict' | 'error';
  lastSyncAt?: string;
  error?: string;
  remoteVersion?: string;
  localVersion?: string;
}
```

- При конфликте (`state = 'conflict'`) пользователь выбирает «Загрузить локально» или «Перезаписать облако».
- Решение фиксируется в `settings.syncResolution` и передаётся в Sync Engine.

---

## 🛡 Политика конфиденциальности
- Облачные провайдеры не получают доступ к расшифрованным данным — в облаке хранится только шифртекст.
- Приложение не отправляет личные данные на сторонние серверы без явного согласия пользователя.
- Для отладки предусмотрен режим `diagnostic`, в котором записываются только метаданные (без содержимого). Он отключён по умолчанию.

---

## ✅ Чек-лист разработчика
- [ ] Поддерживай актуальность `version` и `backupVersion` при изменениях схемы.
- [ ] Обновляй список поддерживаемых коннекторов и их инструкции по OAuth.
- [ ] Пиши интеграционные тесты для `upload`/`download` через мок-сервисы.
- [ ] Обновляй UI-локализации при добавлении статусов синхронизации.

---

_FitTrack UA+ Backup & Sync v3 · Обновлено 2 ноября 2025 года_
