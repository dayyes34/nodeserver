# ⚡ Быстрый старт миграции MongoDB

## 🎯 Краткая инструкция

### 1. На локальной машине:
```bash
# 1. Отредактируйте export-from-atlas.sh - укажите ваш Atlas URI
nano export-from-atlas.sh

# 2. Экспортируйте данные
./export-from-atlas.sh
```

### 2. На дроплете:
```bash
# 1. Скопируйте файлы на дроплет
scp *.sh mongodb-backup-*.tar.gz user@your-droplet-ip:~/

# 2. Установите MongoDB
./install-mongodb.sh

# 3. Импортируйте данные
./import-to-local.sh mongodb-backup-*.tar.gz

# 4. Настройте безопасность (отредактируйте пароли в скрипте!)
nano configure-mongodb-security.sh
./configure-mongodb-security.sh
```

### 3. Обновите .env файлы:
```env
MONGODB_URI=mongodb://rhythmcapsule_user:your_password@localhost:27017/rhythmcapsule
```

### 4. Перезапустите приложения:
```bash
pm2 restart all
# или
sudo systemctl restart your-services
```

## 🔍 Проверка:
```bash
./mongodb-monitor.sh
```

## 📚 Подробная инструкция:
См. `MONGODB_MIGRATION_GUIDE.md` 