#!/bin/bash

# Архивируем все файлы сервера, исключая node_modules и .env
tar --exclude='node_modules' --exclude='.env' -czf server.tar.gz .

# Копируем архив на сервер
scp server.tar.gz root@64.225.70.53:/tmp/

# Подключаемся к серверу и выполняем установку
ssh root@64.225.70.53 "cd /var/capsule-app/server && \
    tar -xzf /tmp/server.tar.gz && \
    npm install && \
    pm2 restart rhythmcapsule-server && \
    rm /tmp/server.tar.gz"

# Удаляем локальный архив
rm server.tar.gz

echo "Деплой сервера завершен!" 