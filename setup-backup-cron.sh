#!/bin/bash

# Скрипт для настройки автоматического резервного копирования MongoDB
echo "🔄 Настройка автоматического резервного копирования MongoDB..."

# Переменные
DATABASE_NAME="rhythmcapsule"
BACKUP_DIR="/home/backups/mongodb"
BACKUP_USER="rhythmcapsule_user"
BACKUP_PASSWORD="your_secure_app_password"  # Измените на ваш пароль

# Создание директории для бэкапов
echo "📁 Создание директории для бэкапов..."
sudo mkdir -p "$BACKUP_DIR"
sudo chown $USER:$USER "$BACKUP_DIR"

# Создание скрипта бэкапа
echo "📝 Создание скрипта бэкапа..."
cat > "$BACKUP_DIR/backup-mongodb.sh" << EOF
#!/bin/bash

# Автоматический бэкап MongoDB
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/backup_\$DATE"
DATABASE="$DATABASE_NAME"

echo "\$(date): Начало бэкапа базы данных \$DATABASE..."

# Создание бэкапа
mongodump --uri="mongodb://$BACKUP_USER:$BACKUP_PASSWORD@localhost:27017/\$DATABASE" --out="\$BACKUP_PATH"

if [ \$? -eq 0 ]; then
    echo "\$(date): Бэкап успешно создан: \$BACKUP_PATH"
    
    # Создание архива
    cd "$BACKUP_DIR"
    tar -czf "backup_\$DATE.tar.gz" "backup_\$DATE"
    rm -rf "backup_\$DATE"
    
    echo "\$(date): Архив создан: backup_\$DATE.tar.gz"
    
    # Удаление старых бэкапов (старше 7 дней)
    find "$BACKUP_DIR" -name "backup_*.tar.gz" -mtime +7 -delete
    echo "\$(date): Старые бэкапы удалены"
    
else
    echo "\$(date): Ошибка при создании бэкапа"
    exit 1
fi

echo "\$(date): Бэкап завершен"
EOF

# Делаем скрипт исполняемым
chmod +x "$BACKUP_DIR/backup-mongodb.sh"

# Создание лог файла
touch "$BACKUP_DIR/backup.log"

echo "⏰ Настройка cron задачи..."

# Создание временного файла с cron задачей
TEMP_CRON=$(mktemp)

# Получение текущих cron задач
crontab -l 2>/dev/null > "$TEMP_CRON"

# Добавление новой задачи (ежедневно в 2:00)
echo "0 2 * * * $BACKUP_DIR/backup-mongodb.sh >> $BACKUP_DIR/backup.log 2>&1" >> "$TEMP_CRON"

# Установка новых cron задач
crontab "$TEMP_CRON"

# Удаление временного файла
rm "$TEMP_CRON"

echo "✅ Автоматическое резервное копирование настроено!"
echo ""
echo "📋 Информация:"
echo "  Директория бэкапов: $BACKUP_DIR"
echo "  Скрипт бэкапа: $BACKUP_DIR/backup-mongodb.sh"
echo "  Лог файл: $BACKUP_DIR/backup.log"
echo "  Расписание: Ежедневно в 2:00"
echo "  Хранение: 7 дней"
echo ""
echo "🔧 Полезные команды:"
echo "  Просмотр cron задач: crontab -l"
echo "  Ручной запуск бэкапа: $BACKUP_DIR/backup-mongodb.sh"
echo "  Просмотр логов: tail -f $BACKUP_DIR/backup.log"
echo "  Список бэкапов: ls -la $BACKUP_DIR/*.tar.gz" 