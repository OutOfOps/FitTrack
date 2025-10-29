# 🗄 FitTrack — Database Schema (PostgreSQL 16)

## Overview
The FitTrack backend uses **PostgreSQL 16** as its primary database.  
The ORM layer is implemented via **Dapper**, and schema evolution is managed through **FluentMigrator**.  
All timestamps are stored in **UTC**.  
Identifiers use `SERIAL` or `BIGSERIAL` and follow snake_case naming.

---

## 🧩 users
Stores account information and user preferences.

| Column | Type | Constraints | Description |
|--------|------|--------------|--------------|
| id | SERIAL | PK | Unique user identifier |
| email | TEXT | UNIQUE, NOT NULL | User login |
| password_hash | TEXT | NOT NULL | Encrypted password (BCrypt) |
| goal | TEXT | NULL | “lose_weight”, “maintain”, “gain_weight” |
| water_goal_ml | INT | DEFAULT 2500 | Daily hydration target |
| created_at | TIMESTAMP | DEFAULT now() | Registration date |
| updated_at | TIMESTAMP | DEFAULT now() | Last profile update |

**Indexes**
```sql
CREATE UNIQUE INDEX idx_users_email ON users(email);
```

---

## 🥗 food_entries
Records all meals and nutrient values.

| Column | Type | Constraints | Description |
|--------|------|-------------|--------------|
| id | SERIAL | PK | Entry id |
| user_id | INT | FK → users(id) ON DELETE CASCADE | Owner |
| date | DATE | DEFAULT CURRENT_DATE | Meal date |
| name | TEXT | NOT NULL | Food or dish name |
| calories | INT | DEFAULT 0 | Energy value (kcal) |
| proteins | REAL | DEFAULT 0 | Protein (g) |
| fats | REAL | DEFAULT 0 | Fat (g) |
| carbs | REAL | DEFAULT 0 | Carbohydrate (g) |
| vitamins | JSONB | NULL | Map of vitamin → value (e.g. {"C": 30,"B6": 0.2}) |
| created_at | TIMESTAMP | DEFAULT now() | Creation timestamp |

**Indexes**
```sql
CREATE INDEX idx_food_user_date ON food_entries(user_id, date);
```

---

## 💧 water_entries
Tracks all hydration activity.

| Column | Type | Constraints | Description |
|--------|------|-------------|--------------|
| id | SERIAL | PK | Record id |
| user_id | INT | FK → users(id) ON DELETE CASCADE | Owner |
| date | DATE | DEFAULT CURRENT_DATE | Entry date |
| amount_ml | INT | NOT NULL | Water amount in milliliters |
| created_at | TIMESTAMP | DEFAULT now() | Timestamp |

**Indexes**
```sql
CREATE INDEX idx_water_user_date ON water_entries(user_id, date);
```

---

## 🌿 vitamin_profiles
Stores the recommended and current vitamin levels for each user.

| Column | Type | Constraints | Description |
|--------|------|-------------|--------------|
| id | SERIAL | PK | Record id |
| user_id | INT | FK → users(id) ON DELETE CASCADE | Owner |
| vitamin_data | JSONB | NOT NULL | Key/value pairs of vitamin name → {value, recommended, unit} |
| updated_at | TIMESTAMP | DEFAULT now() | Last update time |

**Example JSON**
```json
{
  "C": { "value": 70, "recommended": 90, "unit": "mg" },
  "D": { "value": 6, "recommended": 10, "unit": "µg" }
}
```

---

## ⏰ reminders
Stores notification settings (hydration, meals, vitamins, etc.).

| Column | Type | Constraints | Description |
|--------|------|-------------|--------------|
| id | SERIAL | PK | Reminder id |
| user_id | INT | FK → users(id) ON DELETE CASCADE | Owner |
| type | TEXT | NOT NULL | “water”, “meal”, “vitamin” |
| time | TIME | NOT NULL | First trigger time |
| interval_minutes | INT | DEFAULT 120 | Interval between notifications |
| enabled | BOOLEAN | DEFAULT true | Whether active |
| created_at | TIMESTAMP | DEFAULT now() | Creation time |
| updated_at | TIMESTAMP | DEFAULT now() | Last edit time |

**Indexes**
```sql
CREATE INDEX idx_reminders_user_type ON reminders(user_id, type);
```

---

## 📊 stats_cache (optional)
Cached daily summaries for quick analytics.

| Column | Type | Constraints | Description |
|--------|------|-------------|--------------|
| id | SERIAL | PK | Record id |
| user_id | INT | FK → users(id) | Owner |
| date | DATE | UNIQUE(user_id, date) | Day |
| calories_total | INT | DEFAULT 0 | Sum of calories |
| water_total_ml | INT | DEFAULT 0 | Total water intake |
| vitamins_summary | JSONB | NULL | Aggregated vitamin data |
| updated_at | TIMESTAMP | DEFAULT now() | Refresh timestamp |

---

## ⚙️ Relationships Summary
```
users 1─∞ food_entries
users 1─∞ water_entries
users 1─∞ vitamin_profiles
users 1─∞ reminders
users 1─∞ stats_cache
```

---

## 💾 Migration Example (FluentMigrator)
```csharp
[Migration(2025110101)]
public class CreateUsers : Migration
{
    public override void Up()
    {
        Create.Table("users")
            .WithColumn("id").AsInt32().PrimaryKey().Identity()
            .WithColumn("email").AsString(100).NotNullable()
            .WithColumn("password_hash").AsString(200).NotNullable()
            .WithColumn("goal").AsString(30).Nullable()
            .WithColumn("water_goal_ml").AsInt32().WithDefaultValue(2500)
            .WithColumn("created_at").AsDateTime().WithDefault(SystemMethods.CurrentUTCDateTime);
    }

    public override void Down() => Delete.Table("users");
}
```

---

## ✅ Notes
- Use **snake_case** in database naming for consistency.  
- All tables include `created_at` and `updated_at` fields for audit.  
- Future extensions: sleep tracking, weight log, nutrient history.  
- All numeric fields use `REAL` for fractional precision (e.g. vitamin mg).  
- Every Dapper repository should return `Task<T>` or `Task<IEnumerable<T>>`.  

---

**Author:** FitTrack UA+ System Design  
**Version:** 1.0 (2025-10-29)
