# 🚀 Руководство по миграции на локальную MongoDB

Это руководство поможет вам перейти с MongoDB Atlas на локальную MongoDB на вашем дроплете.

## 📋 Предварительные требования

- Ubuntu 20.04+ на дроплете
- Доступ root или sudo
- Достаточно места на диске (рекомендуется минимум 10GB свободного места)
- Доступ к текущей MongoDB Atlas

## 🔄 Пошаговая инструкция

### Шаг 1: Подготовка локальной машины

1. **Установите MongoDB Database Tools** (если еще не установлены):
```bash
# На macOS
brew install mongodb/brew/mongodb-database-tools

# На Ubuntu/Debian
sudo apt install mongodb-database-tools

# На Windows
# Скачайте с https://www.mongodb.com/docs/database-tools/installation/
```

2. **Экспортируйте данные из Atlas**:
```bash
# Отредактируйте export-from-atlas.sh и укажите ваш Atlas URI
chmod +x export-from-atlas.sh
./export-from-atlas.sh
```

### Шаг 2: Настройка дроплета

1. **Подключитесь к дроплету**:
```bash
ssh your-user@your-droplet-ip
```

2. **Скопируйте скрипты на дроплет**:
```bash
scp *.sh your-user@your-droplet-ip:~/
```

3. **Установите MongoDB**:
```bash
chmod +x install-mongodb.sh
./install-mongodb.sh
```

### Шаг 3: Импорт данных

1. **Скопируйте архив с данными на дроплет**:
```bash
scp mongodb-backup-*.tar.gz your-user@your-droplet-ip:~/
```

2. **Импортируйте данные**:
```bash
chmod +x import-to-local.sh
./import-to-local.sh mongodb-backup-*.tar.gz
```

### Шаг 4: Настройка безопасности

1. **Настройте аутентификацию**:
```bash
# Отредактируйте configure-mongodb-security.sh и укажите ваши пароли
chmod +x configure-mongodb-security.sh
./configure-mongodb-security.sh
```

### Шаг 5: Обновление приложения

1. **Обновите .env файлы** в ваших проектах:

**Для server/.env**:
```env
MONGODB_URI=mongodb://rhythmcapsule_user:your_secure_app_password@localhost:27017/rhythmcapsule
```

**Для telegram-server/.env**:
```env
MONGODB_URI=mongodb://rhythmcapsule_user:your_secure_app_password@localhost:27017/rhythmcapsule
```

2. **Перезапустите ваши сервисы**:
```bash
# Если используете PM2
pm2 restart all

# Если используете systemd
sudo systemctl restart your-app-service

# Если запускаете вручную
# Остановите текущие процессы и запустите заново
```

## 🔧 Мониторинг и обслуживание

### Проверка состояния MongoDB

```bash
chmod +x mongodb-monitor.sh
./mongodb-monitor.sh
```

### Полезные команды

```bash
# Статус сервиса
sudo systemctl status mongod

# Просмотр логов
sudo tail -f /var/log/mongodb/mongod.log

# Подключение к MongoDB
mongosh mongodb://rhythmcapsule_user:password@localhost:27017/rhythmcapsule

# Перезапуск MongoDB
sudo systemctl restart mongod
```

## 🔐 Безопасность

### Рекомендации по безопасности:

1. **Используйте сильные пароли** для пользователей MongoDB
2. **Ограничьте доступ** только к localhost (127.0.0.1)
3. **Регулярно создавайте резервные копии**:
```bash
mongodump --db=rhythmcapsule --out=./backup-$(date +%Y%m%d)
```

4. **Мониторьте логи** на предмет подозрительной активности

## 🔄 Резервное копирование

### Автоматическое резервное копирование

Создайте cron задачу для регулярного бэкапа:

```bash
# Откройте crontab
crontab -e

# Добавьте строку для ежедневного бэкапа в 2:00
0 2 * * * /usr/bin/mongodump --db=rhythmcapsule --out=/home/backups/mongodb-$(date +\%Y\%m\%d) && find /home/backups -name "mongodb-*" -mtime +7 -exec rm -rf {} \;
```

## 🚨 Устранение неполадок

### MongoDB не запускается

1. Проверьте логи:
```bash
sudo journalctl -u mongod
sudo tail -f /var/log/mongodb/mongod.log
```

2. Проверьте права доступа:
```bash
sudo chown -R mongodb:mongodb /var/lib/mongodb
sudo chown mongodb:mongodb /tmp/mongodb-*.sock
```

3. Проверьте конфигурацию:
```bash
sudo mongod --config /etc/mongod.conf --fork
```

### Проблемы с подключением

1. Проверьте, что MongoDB слушает на правильном порту:
```bash
sudo netstat -tlnp | grep :27017
```

2. Проверьте настройки bindIp в `/etc/mongod.conf`

3. Убедитесь, что пользователь создан правильно:
```bash
mongosh --eval "use admin; db.getUsers()"
```

## 📊 Производительность

### Мониторинг производительности

```bash
# Статистика сервера
mongosh --eval "db.serverStatus()"

# Статистика базы данных
mongosh rhythmcapsule --eval "db.stats()"

# Активные операции
mongosh --eval "db.currentOp()"
```

### Оптимизация

1. **Создайте индексы** для часто используемых запросов
2. **Мониторьте использование памяти** и диска
3. **Настройте логирование** для отслеживания медленных запросов

## 🎯 Проверка миграции

После завершения миграции убедитесь, что:

- [ ] MongoDB запущена и работает
- [ ] Все данные импортированы корректно
- [ ] Приложения подключаются к локальной базе
- [ ] Аутентификация работает
- [ ] Резервное копирование настроено
- [ ] Мониторинг работает

## 📞 Поддержка

Если возникли проблемы:

1. Проверьте логи MongoDB
2. Убедитесь, что все скрипты выполнены корректно
3. Проверьте настройки сети и firewall
4. Обратитесь к документации MongoDB: https://docs.mongodb.com/

---

**Важно**: Перед началом миграции обязательно создайте резервную копию всех данных! 