#!/bin/bash

# Скрипт для настройки безопасности MongoDB
echo "🔐 Настройка безопасности MongoDB..."

# Переменные (измените на свои значения)
ADMIN_USER="admin"
ADMIN_PASSWORD="your_secure_admin_password"
APP_USER="rhythmcapsule_user"
APP_PASSWORD="your_secure_app_password"
DATABASE_NAME="rhythmcapsule"

echo "🔧 Настройка аутентификации..."

# Создание пользователя администратора
mongosh --eval "
use admin
db.createUser({
  user: '$ADMIN_USER',
  pwd: '$ADMIN_PASSWORD',
  roles: [
    { role: 'userAdminAnyDatabase', db: 'admin' },
    { role: 'readWriteAnyDatabase', db: 'admin' },
    { role: 'dbAdminAnyDatabase', db: 'admin' }
  ]
})
"

# Создание пользователя для приложения
mongosh --eval "
use $DATABASE_NAME
db.createUser({
  user: '$APP_USER',
  pwd: '$APP_PASSWORD',
  roles: [
    { role: 'readWrite', db: '$DATABASE_NAME' }
  ]
})
"

echo "📝 Обновление конфигурации MongoDB..."

# Создание резервной копии конфигурации
sudo cp /etc/mongod.conf /etc/mongod.conf.backup

# Обновление конфигурации для включения аутентификации
sudo tee /etc/mongod.conf > /dev/null <<EOF
# mongod.conf

# for documentation of all options, see:
#   http://docs.mongodb.org/manual/reference/configuration-options/

# Where to store data.
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true

# where to write logging data.
systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

# network interfaces
net:
  port: 27017
  bindIp: 127.0.0.1  # Только локальные подключения

# how the process runs
processManagement:
  timeZoneInfo: /usr/share/zoneinfo

# security
security:
  authorization: enabled

#operationProfiling:

#replication:

#sharding:

## Enterprise-Only Options:

#auditLog:

#snmp:
EOF

echo "🔄 Перезапуск MongoDB..."
sudo systemctl restart mongod

# Проверка статуса
if systemctl is-active --quiet mongod; then
    echo "✅ MongoDB перезапущена успешно с включенной аутентификацией"
    
    echo ""
    echo "🎯 Информация для подключения:"
    echo "Администратор:"
    echo "  URI: mongodb://$ADMIN_USER:$ADMIN_PASSWORD@localhost:27017/admin"
    echo ""
    echo "Приложение:"
    echo "  URI: mongodb://$APP_USER:$APP_PASSWORD@localhost:27017/$DATABASE_NAME"
    echo ""
    echo "📝 Обновите ваши .env файлы:"
    echo "  MONGODB_URI=mongodb://$APP_USER:$APP_PASSWORD@localhost:27017/$DATABASE_NAME"
    
else
    echo "❌ Ошибка при перезапуске MongoDB"
    echo "Проверьте логи: sudo journalctl -u mongod"
fi 