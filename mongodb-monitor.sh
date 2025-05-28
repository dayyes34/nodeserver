#!/bin/bash

# Скрипт для мониторинга MongoDB
echo "📊 Мониторинг MongoDB..."

# Переменные
DATABASE_NAME="rhythmcapsule"
MONGODB_URI="mongodb://localhost:27017/$DATABASE_NAME"

# Если используется аутентификация, раскомментируйте и настройте:
# MONGODB_URI="mongodb://username:password@localhost:27017/$DATABASE_NAME"

echo "🔍 Проверка статуса сервиса..."
if systemctl is-active --quiet mongod; then
    echo "✅ MongoDB сервис активен"
else
    echo "❌ MongoDB сервис не активен"
    echo "Попытка запуска..."
    sudo systemctl start mongod
fi

echo ""
echo "📈 Статистика сервера:"
mongosh --quiet --eval "
print('MongoDB версия: ' + db.version())
print('Время работы: ' + db.serverStatus().uptime + ' секунд')
print('Подключения: ' + db.serverStatus().connections.current + '/' + db.serverStatus().connections.available)
"

echo ""
echo "💾 Использование диска:"
df -h /var/lib/mongodb

echo ""
echo "📊 Статистика базы данных $DATABASE_NAME:"
mongosh "$MONGODB_URI" --quiet --eval "
use $DATABASE_NAME
var stats = db.stats()
print('Размер базы данных: ' + (stats.dataSize / 1024 / 1024).toFixed(2) + ' MB')
print('Размер индексов: ' + (stats.indexSize / 1024 / 1024).toFixed(2) + ' MB')
print('Количество коллекций: ' + stats.collections)

print('\n📋 Коллекции и количество документов:')
db.adminCommand('listCollections').cursor.firstBatch.forEach(
    function(collection) {
        var count = db[collection.name].countDocuments()
        print('  ' + collection.name + ': ' + count + ' документов')
    }
)
"

echo ""
echo "🔄 Последние записи в логе:"
sudo tail -n 10 /var/log/mongodb/mongod.log

echo ""
echo "💡 Полезные команды:"
echo "  Просмотр логов: sudo tail -f /var/log/mongodb/mongod.log"
echo "  Перезапуск: sudo systemctl restart mongod"
echo "  Статус: sudo systemctl status mongod"
echo "  Подключение: mongosh $MONGODB_URI" 