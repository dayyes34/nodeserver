#!/bin/bash

# Скрипт установки MongoDB на Ubuntu дроплете
echo "🚀 Установка MongoDB на Ubuntu дроплете..."

# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка необходимых пакетов
sudo apt install -y wget curl gnupg2 software-properties-common apt-transport-https ca-certificates lsb-release

# Добавление ключа MongoDB
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Добавление репозитория MongoDB
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Обновление списка пакетов
sudo apt update

# Установка MongoDB
sudo apt install -y mongodb-org

# Запуск и включение автозапуска MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Проверка статуса
sudo systemctl status mongod

echo "✅ MongoDB установлена и запущена!"
echo "📍 Конфигурационный файл: /etc/mongod.conf"
echo "📍 Логи: /var/log/mongodb/mongod.log"
echo "📍 Данные: /var/lib/mongodb"

# Создание пользователя администратора (опционально)
echo "🔐 Создание пользователя администратора..."
mongosh --eval "
use admin
db.createUser({
  user: 'admin',
  pwd: 'your_secure_password_here',
  roles: [
    { role: 'userAdminAnyDatabase', db: 'admin' },
    { role: 'readWriteAnyDatabase', db: 'admin' },
    { role: 'dbAdminAnyDatabase', db: 'admin' }
  ]
})
"

echo "🎯 Следующие шаги:"
echo "1. Измените пароль администратора в скрипте выше"
echo "2. Настройте аутентификацию в /etc/mongod.conf"
echo "3. Обновите MONGODB_URI в .env файлах"
echo "4. Перенесите данные из MongoDB Atlas" 