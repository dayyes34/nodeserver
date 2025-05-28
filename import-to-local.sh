#!/bin/bash

# Скрипт для импорта данных в локальную MongoDB
echo "📥 Импорт данных в локальную MongoDB..."

# Проверка наличия mongorestore
if ! command -v mongorestore &> /dev/null; then
    echo "❌ mongorestore не найден. Установите MongoDB Database Tools:"
    echo "sudo apt install mongodb-database-tools"
    exit 1
fi

# Переменные
DATABASE_NAME="rhythmcapsule"  # Замените на имя вашей базы данных
BACKUP_ARCHIVE="$1"  # Путь к архиву с бэкапом

if [ -z "$BACKUP_ARCHIVE" ]; then
    echo "❌ Укажите путь к архиву с бэкапом"
    echo "Использование: $0 <путь_к_архиву.tar.gz>"
    exit 1
fi

if [ ! -f "$BACKUP_ARCHIVE" ]; then
    echo "❌ Файл $BACKUP_ARCHIVE не найден"
    exit 1
fi

# Создание временной директории
TEMP_DIR="./temp-restore-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$TEMP_DIR"

echo "📦 Распаковка архива..."
tar -xzf "$BACKUP_ARCHIVE" -C "$TEMP_DIR"

# Поиск директории с данными
BACKUP_DIR=$(find "$TEMP_DIR" -name "$DATABASE_NAME" -type d | head -1)

if [ -z "$BACKUP_DIR" ]; then
    echo "❌ Не найдена директория с базой данных $DATABASE_NAME в архиве"
    rm -rf "$TEMP_DIR"
    exit 1
fi

echo "📁 Найдена директория с данными: $BACKUP_DIR"

# Проверка статуса MongoDB
if ! systemctl is-active --quiet mongod; then
    echo "🔄 Запуск MongoDB..."
    sudo systemctl start mongod
    sleep 3
fi

# Импорт данных
echo "📥 Импорт данных в базу $DATABASE_NAME..."
mongorestore --db="$DATABASE_NAME" "$BACKUP_DIR" --drop

if [ $? -eq 0 ]; then
    echo "✅ Импорт завершен успешно!"
    
    # Проверка импортированных данных
    echo "📊 Проверка импортированных коллекций:"
    mongosh --eval "
    use $DATABASE_NAME
    db.adminCommand('listCollections').cursor.firstBatch.forEach(
        function(collection) {
            print(collection.name + ': ' + db[collection.name].countDocuments() + ' документов')
        }
    )
    "
else
    echo "❌ Ошибка при импорте данных"
fi

# Очистка временных файлов
echo "🧹 Очистка временных файлов..."
rm -rf "$TEMP_DIR"

echo ""
echo "🎯 Следующие шаги:"
echo "1. Обновите MONGODB_URI в .env файлах:"
echo "   MONGODB_URI=mongodb://localhost:27017/$DATABASE_NAME"
echo "2. Перезапустите ваши сервисы" 