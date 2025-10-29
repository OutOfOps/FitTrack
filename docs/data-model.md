# 💾 FitTrack UA+ — IndexedDB Schema & Encryption Rules

**Version:** 3.0  
**Updated:** 2025-11-02

FitTrack UA+ использует локальную базу **IndexedDB** (через Dexie.js) с полным шифрованием содержимого. Этот документ описывает структуру хранилищ, формат записей и правила миграций.

---

## 🗂 Общая структура базы

| Store | Purpose | Primary Key | Indexes |
|-------|---------|-------------|---------|
| `water` | Записи учёта воды | `id` (string) | `byDay` → `day` |
| `food` | Приёмы пищи и нутриенты | `id` (string) | `byDay` → `day`, `byMealType` → `mealType` |
| `vitamins` | Текущий баланс витаминов | `id` (string) | `byCode` → `code` |
| `reminders` | Локальные напоминания | `id` (string) | `byType` → `type` |
| `settings` | Настройки пользователя и синхронизации | `id` (string, fixed = `profile`) | — |
| `backups` | История локальных бэкапов | `id` (string) | `byCreatedAt` → `createdAt` |
| `tokens` | Зашифрованные OAuth-токены | `provider` (string) | — |

Каждое хранилище содержит поле `payload`, которое представляет собой `EncryptedPayload<T>`.

```ts
interface EncryptedPayload<T> {
  iv: string;             // base64 IV
  cipherText: string;     // base64 JSON данных
  authTag?: string;       // для совместимости с нативными AES-GCM реализациями
  meta: {
    schemaVersion: number;
    createdAt: string;    // ISO
    updatedAt: string;    // ISO
  };
}
```

---

## 💧 Store `water`
Используется для фиксации потребления воды.

```ts
interface WaterEntry {
  id: string;            // ulid
  day: string;           // YYYY-MM-DD
  amountMl: number;
  timestamp: string;     // ISO 8601
  note?: string;
}
```

### Индексы
```ts
db.version(3).stores({
  water: 'id, day'
});
```

---

## 🥗 Store `food`
Хранит приёмы пищи, БЖУ и витаминовый профиль.

```ts
interface FoodEntry {
  id: string;
  day: string;                     // YYYY-MM-DD
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  calories: number;
  macros: { protein: number; fat: number; carbs: number; };
  vitamins: Record<string, number>;
  createdAt: string;
}
```

### Индексы
```ts
db.version(3).stores({
  food: 'id, day, mealType'
});
```

---

## 🌿 Store `vitamins`
Отражает текущий статус витаминов пользователя.

```ts
interface VitaminBalance {
  id: string;             // vitamin code (например, "D")
  code: string;           // дублируется для индекса
  value: number;
  recommended: number;
  unit: 'mg' | 'µg' | 'IU';
  updatedAt: string;
}
```

### Индексы
```ts
db.version(3).stores({
  vitamins: 'id, code'
});
```

---

## ⏰ Store `reminders`
Содержит расписания локальных уведомлений.

```ts
interface Reminder {
  id: string;
  type: 'water' | 'food' | 'vitamin';
  time: string;            // HH:mm
  intervalMinutes: number;
  enabled: boolean;
  weekdays: number[];      // 0..6, опционально
  createdAt: string;
  updatedAt: string;
}
```

### Индексы
```ts
db.version(3).stores({
  reminders: 'id, type'
});
```

---

## ⚙️ Store `settings`
Хранит профиль пользователя, состояние синхронизации и параметры безопасности.

```ts
interface Settings {
  id: 'profile';
  locale: 'uk' | 'ru' | 'en';
  theme: 'light' | 'dark' | 'system';
  waterGoalMl: number;
  calorieGoal: number;
  sync: {
    enabled: boolean;
    provider?: 'onedrive' | 'gdrive' | 'dropbox' | 'icloud';
    lastUploadedAt?: string;
    lastDownloadedAt?: string;
    localVersion?: string;
    remoteVersion?: string;
  };
  security: {
    masterKeySalt: string;
    masterKeyIterations: number;
    passwordHint?: string;
  };
}
```

---

## 🗃 Store `backups`
Позволяет хранить несколько локальных версий бэкапа для отката.

```ts
interface LocalBackup {
  id: string;             // ulid
  createdAt: string;
  backupVersion: string;
  encrypted: EncryptedBackup;
}
```

### Индексы
```ts
db.version(3).stores({
  backups: 'id, createdAt'
});
```

---

## 🔑 Store `tokens`
Зашифрованные токены доступа к облачным провайдерам.

```ts
interface ProviderToken {
  provider: 'onedrive' | 'gdrive' | 'dropbox' | 'icloud';
  accessToken: string;          // зашифрованный
  refreshToken?: string;        // зашифрованный
  expiresAt: string;            // ISO
  scope: string[];
}
```

---

## 🔁 Миграции схемы
- Каждое увеличение версии базы (`db.version(x)`) должно описывать преобразование данных.
- Миграции выполняются внутри Dexie-транзакции, чтобы не нарушать целостность.
- При добавлении новых полей данные извлекаются, расшифровываются, дополняются и снова шифруются.
- Рекомендуется хранить историю миграций в `/libs/data-core/src/lib/migrations/index.ts`.

---

## 🧪 Тестирование данных
- Unit-тесты должны проверять сериализацию/десериализацию `EncryptedPayload`.
- Интеграционные тесты создают in-memory IndexedDB (fake-indexeddb) и проверяют миграции.
- Smoke-тест «backup roundtrip»: экспорт → шифрование → расшифровка → импорт без потерь.

---

## ✅ Примечания
- Не сохраняй мастер-ключ в открытом виде; он всегда должен быть защищён паролем.
- Используй `ulid` для стабильной сортировки записей по времени.
- Отдельное поле `day` хранится в каждой записи для быстрых запросов.
- Для производительности крупные коллекции (например, `food`) можно шардировать по `year` в будущих версиях.

---

_Author: FitTrack UA+ System Design · Offline-First Edition_
