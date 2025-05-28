#!/bin/bash

# Скрипт для экспорта данных из MongoDB Atlas
echo "📦 Экспорт данных из MongoDB Atlas..."

# Проверка наличия mongodump
if ! command -v mongodump &> /dev/null; then
    echo "❌ mongodump не найден. Установите MongoDB Database Tools:"
    echo "https://www.mongodb.com/docs/database-tools/installation/"
    exit 1
fi

# Переменные (замените на ваши значения)
ATLAS_URI="your_atlas_connection_string_here"
DATABASE_NAME="rhythmcapsule"  # Замените на имя вашей базы данных
EXPORT_DIR="./mongodb-backup-$(date +%Y%m%d_%H%M%S)"

echo "🎯 Экспорт базы данных: $DATABASE_NAME"
echo "📁 Директория экспорта: $EXPORT_DIR"

# Создание директории для бэкапа
mkdir -p "$EXPORT_DIR"

# Экспорт всей базы данных
mongodump --uri="$ATLAS_URI" --db="$DATABASE_NAME" --out="$EXPORT_DIR"

if [ $? -eq 0 ]; then
    echo "✅ Экспорт завершен успешно!"
    echo "📁 Данные сохранены в: $EXPORT_DIR"
    
    # Создание архива
    tar -czf "${EXPORT_DIR}.tar.gz" "$EXPORT_DIR"
    echo "📦 Создан архив: ${EXPORT_DIR}.tar.gz"
    
    echo ""
    echo "🚀 Следующие шаги:"
    echo "1. Скопируйте архив на ваш дроплет:"
    echo "   scp ${EXPORT_DIR}.tar.gz user@your-droplet-ip:~/"
    echo ""
    echo "2. На дроплете распакуйте и импортируйте:"
    echo "   tar -xzf ${EXPORT_DIR}.tar.gz"
    echo "   mongorestore --db=$DATABASE_NAME ${EXPORT_DIR}/$DATABASE_NAME"
else
    echo "❌ Ошибка при экспорте данных"
    exit 1
fi 