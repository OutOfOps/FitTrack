# 🔌 FitTrack — API Specification

## Overview
This document defines the REST API structure for **FitTrack**, including endpoints, request/response formats, DTOs, and validation rules.  
The backend uses **ASP.NET 8 Minimal API + Dapper + PostgreSQL 16**.  
All endpoints return JSON and require authentication via JWT, unless specified otherwise.

---

## 🌐 Authentication

### `POST /api/auth/register`
Registers a new user.
#### Request
```json
{
  "email": "user@example.com",
  "password": "Secret123!"
}
```
#### Response
```json
{
  "userId": 1,
  "email": "user@example.com",
  "token": "jwt-token"
}
```

### `POST /api/auth/login`
Authenticates a user and returns JWT token.
#### Request
```json
{
  "email": "user@example.com",
  "password": "Secret123!"
}
```
#### Response
```json
{
  "token": "jwt-token",
  "expiresIn": 3600
}
```

---

## 🍽 Food API

### `GET /api/food`
Returns the list of food entries for the current user.
#### Query Params
| Param | Type | Description |
|--------|------|-------------|
| `date` | string (YYYY-MM-DD) | Optional date filter |

#### Response
```json
[
  {
    "id": 101,
    "userId": 1,
    "name": "Oatmeal with banana",
    "calories": 240,
    "proteins": 6,
    "fats": 4,
    "carbs": 42,
    "vitamins": { "C": 12, "B6": 0.2 },
    "createdAt": "2025-10-29T07:00:00Z"
  }
]
```

### `POST /api/food`
Creates a new food entry.
#### Request
```json
{
  "name": "Boiled egg",
  "calories": 70,
  "proteins": 6,
  "fats": 5,
  "carbs": 0,
  "vitamins": { "A": 74, "D": 1.1 }
}
```
#### Response
```json
{
  "id": 102,
  "message": "Food entry added successfully."
}
```

### `DELETE /api/food/{id}`
Deletes a food entry by ID.  
Returns `204 No Content`.

---

## 💧 Water API

### `GET /api/water/today`
Gets all water entries for the current date.
#### Response
```json
[
  { "id": 1, "amountMl": 250, "date": "2025-10-29" },
  { "id": 2, "amountMl": 300, "date": "2025-10-29" }
]
```

### `POST /api/water/add`
Adds a new water intake record.
#### Request
```json
{
  "amountMl": 300
}
```
#### Response
```json
{
  "id": 3,
  "message": "Water entry recorded."
}
```

---

## 🌿 Vitamins API

### `GET /api/vitamins/balance`
Returns current daily vitamin intake vs recommended values.
#### Response
```json
{
  "A": { "value": 450, "recommended": 900, "unit": "µg" },
  "C": { "value": 65, "recommended": 90, "unit": "mg" },
  "D": { "value": 5, "recommended": 10, "unit": "µg" },
  "B12": { "value": 2.1, "recommended": 2.4, "unit": "µg" }
}
```

### `POST /api/vitamins/recommendations`
Generates food recommendations based on current deficiencies.
#### Response
```json
{
  "recommendations": [
    { "vitamin": "D", "foods": ["Salmon", "Egg yolk", "Butter"] },
    { "vitamin": "C", "foods": ["Orange", "Bell pepper", "Broccoli"] }
  ]
}
```

---

## ⏰ Reminders API

### `GET /api/reminders`
Returns user reminders.
#### Response
```json
[
  {
    "id": 1,
    "type": "water",
    "time": "09:00",
    "intervalMinutes": 120,
    "enabled": true
  }
]
```

### `POST /api/reminders`
Adds or updates a reminder.
#### Request
```json
{
  "type": "water",
  "time": "10:00",
  "intervalMinutes": 180,
  "enabled": true
}
```

---

## 📊 Stats API

### `GET /api/stats/weekly`
Returns weekly summaries for calories and hydration.
#### Response
```json
{
  "calories": [
    { "date": "2025-10-23", "total": 1950 },
    { "date": "2025-10-24", "total": 1820 }
  ],
  "water": [
    { "date": "2025-10-23", "total": 2400 },
    { "date": "2025-10-24", "total": 2100 }
  ]
}
```

---

## ⚙️ General Notes
- All endpoints return HTTP 401 if the token is missing or invalid.
- Standard validation errors return HTTP 400 with message details.
- Server timestamps are in UTC (ISO 8601).

