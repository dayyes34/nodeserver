# 🚀 Миграция с MongoDB Atlas на локальную MongoDB

Полный набор инструментов для перехода с MongoDB Atlas на локальную MongoDB на вашем дроплете.

## 📦 Что включено

### 🔧 Скрипты установки и настройки:
- **`install-mongodb.sh`** - Установка MongoDB 7.0 на Ubuntu
- **`configure-mongodb-security.sh`** - Настройка аутентификации и безопасности
- **`setup-backup-cron.sh`** - Настройка автоматического резервного копирования

### 📥📤 Скрипты миграции данных:
- **`export-from-atlas.sh`** - Экспорт данных из MongoDB Atlas
- **`import-to-local.sh`** - Импорт данных в локальную MongoDB

### 📊 Мониторинг:
- **`mongodb-monitor.sh`** - Мониторинг состояния MongoDB

### 📚 Документация:
- **`QUICK_START.md`** - Краткая инструкция для быстрого старта
- **`MONGODB_MIGRATION_GUIDE.md`** - Подробное руководство по миграции

## ⚡ Быстрый старт

### 1. Подготовка (на локальной машине):
```bash
# Отредактируйте Atlas URI в скрипте
nano export-from-atlas.sh

# Экспортируйте данные
./export-from-atlas.sh
```

### 2. Установка на дроплете:
```bash
# Скопируйте файлы на дроплет
scp *.sh *.tar.gz user@your-droplet-ip:~/

# Установите MongoDB
./install-mongodb.sh

# Импортируйте данные
./import-to-local.sh mongodb-backup-*.tar.gz

# Настройте безопасность
nano configure-mongodb-security.sh  # Измените пароли!
./configure-mongodb-security.sh

# Настройте автобэкап
nano setup-backup-cron.sh  # Измените пароль!
./setup-backup-cron.sh
```

### 3. Обновите приложение:
```env
# В .env файлах замените Atlas URI на:
MONGODB_URI=mongodb://rhythmcapsule_user:your_password@localhost:27017/rhythmcapsule
```

### 4. Проверка:
```bash
./mongodb-monitor.sh
```

## 🔐 Важные моменты безопасности

1. **Обязательно измените пароли** в скриптах перед запуском
2. **Используйте сильные пароли** для пользователей MongoDB
3. **Ограничьте доступ** только к localhost (127.0.0.1)
4. **Настройте firewall** на дроплете

## 📊 Структура проекта

Ваш проект использует MongoDB в двух местах:
- **`backend/server`** - основной API сервер (порт 5002)
- **`backend/telegram-server`** - Telegram бот сервер

Оба сервера используют переменную `MONGODB_URI` из .env файлов.

## 🔄 Резервное копирование

После настройки автобэкапа:
- Бэкапы создаются ежедневно в 2:00
- Хранятся 7 дней
- Сохраняются в `/home/backups/mongodb/`

## 🚨 Устранение неполадок

### Если MongoDB не запускается:
```bash
sudo journalctl -u mongod
sudo systemctl status mongod
```

### Если проблемы с подключением:
```bash
sudo netstat -tlnp | grep :27017
mongosh --eval "db.adminCommand('ping')"
```

### Проверка пользователей:
```bash
mongosh --eval "use admin; db.getUsers()"
```

## 📞 Поддержка

1. Проверьте логи: `sudo tail -f /var/log/mongodb/mongod.log`
2. Используйте мониторинг: `./mongodb-monitor.sh`
3. Обратитесь к подробному руководству: `MONGODB_MIGRATION_GUIDE.md`

## ✅ Чек-лист миграции

- [ ] Экспортированы данные из Atlas
- [ ] Установлена MongoDB на дроплете
- [ ] Импортированы данные
- [ ] Настроена аутентификация
- [ ] Обновлены .env файлы
- [ ] Перезапущены сервисы
- [ ] Настроено автобэкапирование
- [ ] Проверена работоспособность

---

**⚠️ Важно**: Перед началом миграции создайте резервную копию всех данных и протестируйте процесс на тестовом окружении! 