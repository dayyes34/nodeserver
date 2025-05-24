# RhythmCapsule Backend Server

Бэкенд-сервер для проекта RhythmCapsule, предоставляющий API для работы с секвенсором ударных инструментов и управления коллекцией упражнений.

## Содержание

- [Требования](#требования)
- [Установка](#установка)
- [Конфигурация](#конфигурация)
- [Структура проекта](#структура-проекта)
- [API Документация](#api-документация)
  - [Секвенсор](#секвенсор)
  - [Коллекция упражнений](#коллекция-упражнений)
  - [Предопределенные ключи](#предопределенные-ключи)
  - [Покупки пользователей](#покупки-пользователей)

## Требования

- Node.js (версия 14.x или выше)
- MongoDB (версия 4.x или выше)
- npm или yarn

## Установка

1. Клонируйте репозиторий:
```bash
git clone [URL репозитория]
cd rhythmcapsule-project/backend/server
```

2. Установите зависимости:
```bash
npm install
```

3. Создайте файл `.env` в корневой директории проекта и добавьте необходимые переменные окружения:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/rhythmcapsule
```

4. Запустите сервер:
```bash
npm start
```

## Конфигурация

Проект использует следующие переменные окружения:

- `PORT` - порт для запуска сервера (по умолчанию 5000)
- `MONGODB_URI` - URI для подключения к MongoDB

## Структура проекта

```
server/
├── config/
│   └── database.js
├── controllers/
│   ├── sequencerController.js
│   ├── exerciseCollectionController.js
│   ├── predefinedKeyController.js
│   └── userPurchaseController.js
├── models/
│   ├── SequencerSession.js
│   ├── ExerciseCollectionItem.js
│   ├── PredefinedKey.js
│   └── UserPurchase.js
├── routes/
│   ├── sequencer.js
│   ├── exerciseCollection.js
│   ├── predefinedKeys.js
│   └── userPurchases.js
└── server.js
```

## API Документация

### Секвенсор

#### POST /api/sequencer/save
Сохранить новую сессию секвенсора.

**Тело запроса:**
```json
{
  "sessionName": "Название сессии",
  "folderName": "Название папки (опционально)",
  "version": "1.0",
  "bpm": 120,
  "trackNames": ["Kick", "Snare", "HiHat"],
  "currentSequencerStructure": {},
  "currentBars": {},
  "cellsState": {},
  "loopedBlockIndices": [],
  "mutedTracks": [],
  "isMetronomeEnabled": true,
  "customFields": [
    {
      "key": "difficulty",
      "value": "medium"
    }
  ]
}
```

### Коллекция упражнений

#### GET /api/my-collection
Получить все элементы коллекции.

#### POST /api/my-collection/folder
Создать новую папку.

**Тело запроса:**
```json
{
  "name": "Название папки",
  "parentId": "ID родительской папки (опционально)",
  "isBundle": false,
  "bundleDescription": "Описание бандла (опционально)"
}
```

#### POST /api/my-collection/add-exercise-links
Добавить ссылки на упражнения.

**Тело запроса:**
```json
{
  "targetParentId": "ID целевой папки (опционально)",
  "exercises": [
    {
      "originalSessionId": "ID оригинальной сессии",
      "name": "Название упражнения",
      "originalSessionNameCache": "Кэшированное имя сессии"
    }
  ]
}
```

#### DELETE /api/my-collection/item/:itemId
Удалить элемент коллекции.

#### PUT /api/my-collection/folder/:folderId/settings
Обновить настройки папки.

**Тело запроса:**
```json
{
  "isBundle": true,
  "bundleDescription": "Описание бандла",
  "bundlePrice": 500,
  "bundleCurrency": "RUB"
}
```

#### PUT /api/my-collection/item/:itemId/move
Переместить элемент.

**Тело запроса:**
```json
{
  "newParentId": "ID новой родительской папки"
}
```

### Предопределенные ключи

#### GET /api/admin/predefined-keys
Получить все предопределенные ключи.

#### POST /api/admin/predefined-keys
Создать новый предопределенный ключ.

**Тело запроса:**
```json
{
  "keyName": "Название ключа"
}
```

#### DELETE /api/admin/predefined-keys/:id
Удалить предопределенный ключ.

#### PUT /api/admin/predefined-keys/:id
Обновить предопределенный ключ.

**Тело запроса:**
```json
{
  "keyName": "Новое название ключа"
}
```

### Покупки пользователей

#### GET /api/bundles/:bundleId/details
Получить детали бандла для платежной системы.

#### POST /api/users/:telegramUserId/grant-bundle-access
Предоставить доступ к бандлу.

**Тело запроса:**
```json
{
  "bundleId": "ID бандла",
  "telegramPaymentChargeId": "ID платежа в Telegram",
  "providerPaymentChargeId": "ID платежа у провайдера"
}
```

#### GET /api/users/:telegramUserId/my-purchases
Получить список покупок пользователя. 