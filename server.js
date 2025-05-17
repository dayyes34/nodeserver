// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const mongoURI = process.env.MONGODB_URI;
if (!mongoURI) {
  console.error('Ошибка: MONGODB_URI не задана в переменных окружения.');
  process.exit(1);
}

mongoose.connect(mongoURI)
.then(() => console.log('Успешное подключение к MongoDB'))
.catch(err => {
  console.error('Ошибка подключения к MongoDB:', err);
  process.exit(1);
});

const sequencerSessionSchema = new mongoose.Schema({
  sessionName: {
    type: String,
    required: true,
    trim: true
  },
  folderName: { // <-- НОВОЕ ПОЛЕ
    type: String,
    trim: true,
    default: null // По умолчанию null, если папка не указана
  },
  version: String,
  bpm: Number,
  trackNames: [String],
  currentSequencerStructure: mongoose.Schema.Types.Mixed,
  currentBars: mongoose.Schema.Types.Mixed,
  cellsState: mongoose.Schema.Types.Mixed,
  loopedBlockIndices: [Number],
  mutedTracks: [String],
  isMetronomeEnabled: Boolean,
  createdAt: {
    type: Date,
    default: Date.now
  },
  customFields: {
    type: [{
      key: { type: String, required: true, trim: true },
      value: { type: String, trim: true, default: '' } // Значение может быть пустой строкой
      // _id: false // Раскомментируйте, если не нужны ID для каждой пары ключ-значение в массиве
    }],
    default: []
  }
});

const SequencerSession = mongoose.model('SequencerSession', sequencerSessionSchema);

// Новая схема и модель для элементов коллекции упражнений пользователя
const exerciseCollectionItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  itemType: {
    type: String, // 'folder' или 'exerciseLink'
    required: true,
    enum: ['folder', 'exerciseLink']
  },
  parentId: { // Ссылка на родительскую папку в этой же коллекции
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExerciseCollectionItem',
    default: null // null для элементов в корне
  },
  originalSessionId: { // ID оригинальной сессии, если itemType === 'exerciseLink'
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SequencerSession',
    default: null
  },
  originalSessionNameCache: { // Кэшированное имя оригинальной сессии для удобства
    type: String,
    trim: true,
    default: ''
  },
  // --- НОВЫЕ ПОЛЯ ДЛЯ ПАПОК-БАНДЛОВ ---
  isBundle: {
    type: Boolean,
    default: false 
  },
  bundleDescription: {
    type: String,
    trim: true,
    default: '' 
  },
  // --- КОНЕЦ НОВЫХ ПОЛЕЙ ---
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Индекс для быстрого поиска дочерних элементов
exerciseCollectionItemSchema.index({ parentId: 1, itemType: 1, name: 1 });

const ExerciseCollectionItem = mongoose.model('ExerciseCollectionItem', exerciseCollectionItemSchema);

// Новая схема и модель для предопределенных ключей кастомных полей
const predefinedKeySchema = new mongoose.Schema({
  keyName: { // Техническое имя ключа, используется для хранения в customFields сессии
    type: String,
    required: true,
    trim: true,
    unique: true // Каждый ключ должен быть уникальным
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const PredefinedKey = mongoose.model('PredefinedKey', predefinedKeySchema);

app.get('/', (req, res) => {
  res.send('Сервер секвенсора работает!');
});

app.post('/api/sequencer/save', async (req, res) => {
  try {
    const sessionData = req.body;
    // folderName теперь тоже может прийти
    const { sessionName, folderName, version, bpm, trackNames, currentSequencerStructure, currentBars, cellsState, loopedBlockIndices, mutedTracks, isMetronomeEnabled, customFields } = sessionData;

    // Обновляем список обязательных полей (folderName опционально на уровне данных, но если передается, должно быть обработано)
    const requiredCoreFields = [
        'sessionName', 'version', 'bpm', 'trackNames', 'currentSequencerStructure',
        'currentBars', 'cellsState', 'loopedBlockIndices', 'mutedTracks', 'isMetronomeEnabled'
    ];

    for (const field of requiredCoreFields) {
        if (!sessionData.hasOwnProperty(field) || sessionData[field] === null || (typeof sessionData[field] === 'string' && sessionData[field].trim() === '' && field === 'sessionName')) {
             // Для sessionName проверяем на пустую строку, для остальных - просто на наличие и не null
            if (field === 'sessionName' && (sessionData[field] === null || sessionData[field].trim() === '')) {
                 return res.status(400).json({ message: `Отсутствует или не заполнено обязательное поле: ${field}` });
            } else if (field !== 'sessionName' && sessionData[field] === null) {
                 return res.status(400).json({ message: `Отсутствует обязательное поле: ${field}` });
            }
        }
    }
    
    // Создаем объект для сохранения, включая folderName (будет null если не предоставлен)
    const newSessionPayload = {
        sessionName: sessionName.trim(),
        folderName: folderName ? folderName.trim() : null, // Если folderName пустой или не передан, сохраняем null
        version, bpm, trackNames, currentSequencerStructure, currentBars, cellsState, loopedBlockIndices, mutedTracks, isMetronomeEnabled,
        customFields: customFields || [] // Добавляем customFields, если они есть
    };

    const newSession = new SequencerSession(newSessionPayload);
    await newSession.save();
    res.status(201).json({ message: `Сессия '${newSession.sessionName}' ${newSession.folderName ? 'в папке \'' + newSession.folderName + '\'' : ''} успешно сохранена!`, sessionId: newSession._id });
  } catch (error) {
    console.error('Ошибка при сохранении данных секвенсора:', error);
    res.status(500).json({ message: 'Ошибка сервера при сохранении данных', error: error.message });
  }
});

app.get('/api/sequencer/sessions', async (req, res) => {
  try {
    // Теперь также выбираем folderName
    const sessions = await SequencerSession.find({}, 'sessionName folderName createdAt')
                                           .sort({ folderName: 1, createdAt: -1 }); // Сортируем сначала по папке, потом по дате
    res.status(200).json(sessions);
  } catch (error) {
    console.error('Ошибка при получении списка сессий:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении списка сессий', error: error.message });
  }
});

app.get('/api/sequencer/sessions/:id', async (req, res) => {
  try {
    const sessionId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return res.status(400).json({ message: 'Неверный ID сессии' });
    }
    const session = await SequencerSession.findById(sessionId); // Возвращает весь документ
    if (!session) {
      return res.status(404).json({ message: 'Сессия не найдена' });
    }
    res.status(200).json(session);
  } catch (error) {
    console.error('Ошибка при получении сессии по ID:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении сессии', error: error.message });
  }
});

app.delete('/api/sequencer/sessions/:id', async (req, res) => {
  try {
    const sessionId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return res.status(400).json({ message: 'Неверный ID сессии' });
    }
    const result = await SequencerSession.findByIdAndDelete(sessionId);
    if (!result) {
      return res.status(404).json({ message: 'Сессия не найдена для удаления' });
    }
    // Также удаляем связанные ExerciseCollectionItem (ссылки на эту сессию)
    await ExerciseCollectionItem.deleteMany({ originalSessionId: sessionId });
    res.status(200).json({ message: `Сессия '${result.sessionName}' и все ссылки на нее успешно удалены` });
  } catch (error) {
    console.error('Ошибка при удалении сессии по ID:', error);
    res.status(500).json({ message: 'Ошибка сервера при удалении сессии', error: error.message });
  }
});

// НОВЫЙ ЭНДПОИНТ для обновления основных полей сессии
app.put('/api/sequencer/sessions/:id', async (req, res) => {
  try {
    const sessionId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ message: 'Неверный ID сессии.' });
    }

    const { sessionName, bpm, folderName, customFields, ...otherFields } = req.body;
    const updateData = { ...otherFields }; // Начинаем с других полей, если они есть

    if (sessionName !== undefined) {
      if (typeof sessionName !== 'string' || sessionName.trim() === '') {
        return res.status(400).json({ message: 'sessionName должно быть непустой строкой.' });
      }
      updateData.sessionName = sessionName.trim();
    }

    if (bpm !== undefined) {
      const numericBpm = Number(bpm);
      if (isNaN(numericBpm) || numericBpm <= 0) {
        return res.status(400).json({ message: 'bpm должен быть положительным числом.' });
      }
      updateData.bpm = numericBpm;
    }

    if (folderName !== undefined) { // Allow empty string to set to root, or null
      if (typeof folderName !== 'string' && folderName !== null) {
          return res.status(400).json({ message: 'folderName должен быть строкой или null.' });
      }
      updateData.folderName = folderName === null ? null : folderName.trim();
    }
    
    // Если customFields переданы, добавляем их к обновлению
    // Это позволяет этому эндпоинту обновлять и customFields, если клиент их передаст
    if (customFields !== undefined) {
        if (!Array.isArray(customFields)) {
            return res.status(400).json({ message: 'customFields должен быть массивом.' });
        }
        // (Можно добавить более строгую валидацию для customFields здесь, как в эндпоинте /customfields)
        updateData.customFields = customFields;
    }
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'Нет данных для обновления.' });
    }

    const updatedSession = await SequencerSession.findByIdAndUpdate(
      sessionId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedSession) {
      return res.status(404).json({ message: 'Сессия не найдена для обновления.' });
    }

    res.status(200).json({ message: 'Основные данные сессии успешно обновлены.', session: updatedSession });

  } catch (error) {
    console.error('Ошибка при обновлении основных данных сессии:', error);
    if (error.name === 'ValidationError') {
        return res.status(400).json({ message: 'Ошибка валидации', errors: error.errors });
    }
    res.status(500).json({ message: 'Ошибка сервера при обновлении сессии', error: error.message });
  }
});

// Заменяем эндпоинт для тегов на эндпоинт для кастомных полей
app.put('/api/sequencer/sessions/:id/customfields', async (req, res) => {
  try {
    const sessionId = req.params.id;
    const { fields } = req.body; // Ожидаем массив объектов [{ key: "ключ", value: "значение" }]

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ message: 'Неверный ID сессии.' });
    }

    if (!Array.isArray(fields)) {
      return res.status(400).json({ message: 'Кастомные поля должны быть массивом.' });
    }

    // Валидация, что все элементы в массиве fields являются объектами с обязательным ключом (строка)
    // и опциональным значением (строка)
    for (const field of fields) {
      if (typeof field !== 'object' || field === null) {
        return res.status(400).json({ message: 'Каждый элемент в массиве кастомных полей должен быть объектом.' });
      }
      if (!field.hasOwnProperty('key') || typeof field.key !== 'string' || field.key.trim() === '') {
        return res.status(400).json({ message: 'Каждое кастомное поле должно иметь непустой строковый ключ (key).' });
      }
      if (field.hasOwnProperty('value') && typeof field.value !== 'string') {
        return res.status(400).json({ message: 'Значение (value) кастомного поля должно быть строкой.' });
      }
    }
    // Приводим к ожидаемому формату (на случай, если пришли лишние поля в объектах)
    const sanitizedFields = fields.map(f => ({ 
      key: f.key.trim(), 
      value: (f.value || '').trim() 
    }));

    const updatedSession = await SequencerSession.findByIdAndUpdate(
      sessionId,
      { $set: { customFields: sanitizedFields } }, // Полностью заменяем массив кастомных полей
      { new: true, runValidators: true } // Возвращаем обновленный документ и запускаем валидаторы схемы
    );

    if (!updatedSession) {
      return res.status(404).json({ message: 'Сессия не найдена для обновления кастомных полей.' });
    }

    res.status(200).json({ message: `Кастомные поля для сессии '${updatedSession.sessionName}' успешно обновлены.`, session: updatedSession });

  } catch (error) {
    console.error('Ошибка при обновлении кастомных полей сессии:', error);
    if (error.name === 'ValidationError') {
        return res.status(400).json({ message: 'Ошибка валидации при обновлении кастомных полей', errors: error.errors });
    }
    res.status(500).json({ message: 'Ошибка сервера при обновлении кастомных полей сессии', error: error.message });
  }
});

// --- API для коллекции упражнений пользователя ---

// Получить все элементы коллекции (папки и ссылки на упражнения)
app.get('/api/my-collection', async (req, res) => {
  try {
    // Пока просто возвращаем все. В будущем можно добавить фильтрацию по parentId
    const items = await ExerciseCollectionItem.find().sort({ parentId: 1, itemType: 1, name: 1 });
    res.status(200).json(items);
  } catch (error) {
    console.error('Ошибка при получении коллекции упражнений:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении коллекции', error: error.message });
  }
});

// Создать новую папку в коллекции
app.post('/api/my-collection/folder', async (req, res) => {
  try {
    const { name, parentId, isBundle, bundleDescription } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Имя папки не может быть пустым.' });
    }
    // Проверка на валидность parentId, если он предоставлен
    if (parentId && !mongoose.Types.ObjectId.isValid(parentId)) {
      return res.status(400).json({ message: 'Неверный ID родительской папки.' });
    }
    if (parentId) {
        const parentFolder = await ExerciseCollectionItem.findById(parentId);
        if (!parentFolder || parentFolder.itemType !== 'folder') {
            return res.status(404).json({ message: 'Родительская папка не найдена или не является папкой.'});
        }
    }

    const newFolder = new ExerciseCollectionItem({
      name: name.trim(),
      itemType: 'folder',
      parentId: parentId || null, // Если parentId не предоставлен, это корневая папка
      isBundle: typeof isBundle === 'boolean' ? isBundle : false, // Устанавливаем значение или дефолт
      bundleDescription: typeof bundleDescription === 'string' ? bundleDescription.trim() : '' // Устанавливаем значение или дефолт
    });
    await newFolder.save();
    res.status(201).json(newFolder);
  } catch (error) {
    console.error('Ошибка при создании папки в коллекции:', error);
    res.status(500).json({ message: 'Ошибка сервера при создании папки', error: error.message });
  }
});

// Добавить ссылки на упражнения в папку коллекции
app.post('/api/my-collection/add-exercise-links', async (req, res) => {
  try {
    const { targetParentId, exercises } = req.body; // exercises - массив объектов { originalSessionId, originalSessionNameCache, name (новое имя в коллекции) }

    if (!exercises || !Array.isArray(exercises) || exercises.length === 0) {
      return res.status(400).json({ message: 'Не предоставлены упражнения для добавления.' });
    }

    // Проверка targetParentId (может быть null для корня)
    if (targetParentId && !mongoose.Types.ObjectId.isValid(targetParentId)) {
      return res.status(400).json({ message: 'Неверный ID целевой папки.' });
    }
    if (targetParentId) {
        const parentFolder = await ExerciseCollectionItem.findById(targetParentId);
        if (!parentFolder || parentFolder.itemType !== 'folder') {
            return res.status(404).json({ message: 'Целевая папка не найдена или не является папкой.'});
        }
    }

    const createdItems = [];
    for (const ex of exercises) {
      if (!ex.originalSessionId || !mongoose.Types.ObjectId.isValid(ex.originalSessionId)) {
        // Можно пропустить это упражнение или вернуть ошибку для всего запроса
        console.warn('Пропущено упражнение с неверным originalSessionId:', ex);
        continue;
      }
      if (!ex.name || ex.name.trim() === '') {
        return res.status(400).json({ message: `Имя для упражнения '${ex.originalSessionNameCache || ex.originalSessionId}' не может быть пустым.` });
      }

      const newExerciseLink = new ExerciseCollectionItem({
        name: ex.name.trim(), // Имя, которое будет в вашей коллекции
        itemType: 'exerciseLink',
        parentId: targetParentId || null,
        originalSessionId: ex.originalSessionId,
        originalSessionNameCache: ex.originalSessionNameCache || 'Упражнение' // Если имя не передано, используем дефолтное
      });
      await newExerciseLink.save();
      createdItems.push(newExerciseLink);
    }

    res.status(201).json(createdItems);

  } catch (error) {
    console.error('Ошибка при добавлении ссылок на упражнения:', error);
    res.status(500).json({ message: 'Ошибка сервера при добавлении упражнений', error: error.message });
  }
});

// Удалить элемент (папку или ссылку на упражнение) из коллекции
app.delete('/api/my-collection/item/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ message: 'Неверный ID элемента.' });
    }

    const itemToDelete = await ExerciseCollectionItem.findById(itemId);
    if (!itemToDelete) {
      return res.status(404).json({ message: 'Элемент не найден.' });
    }

    // Если это папка, проверяем, пуста ли она
    if (itemToDelete.itemType === 'folder') {
      const childrenCount = await ExerciseCollectionItem.countDocuments({ parentId: itemId });
      if (childrenCount > 0) {
        return res.status(400).json({ message: 'Папка не пуста. Сначала удалите или переместите ее содержимое.' });
      }
    }

    await ExerciseCollectionItem.findByIdAndDelete(itemId);
    res.status(200).json({ message: `Элемент '${itemToDelete.name}' успешно удален.` });

  } catch (error) {
    console.error('Ошибка при удалении элемента из коллекции:', error);
    res.status(500).json({ message: 'Ошибка сервера при удалении элемента', error: error.message });
  }
});

// НОВЫЙ ЭНДПОИНТ для обновления настроек папки (isBundle, bundleDescription)
app.put('/api/my-collection/folder/:folderId/settings', async (req, res) => {
  try {
    const { folderId } = req.params;
    const { isBundle, bundleDescription } = req.body;

    if (!mongoose.Types.ObjectId.isValid(folderId)) {
      return res.status(400).json({ message: 'Неверный ID папки.' });
    }

    const updateData = {};
    if (typeof isBundle === 'boolean') {
      updateData.isBundle = isBundle;
    }
    // Разрешаем пустую строку для bundleDescription
    if (bundleDescription !== undefined) { // Проверяем на undefined, чтобы можно было передать пустую строку
        updateData.bundleDescription = typeof bundleDescription === 'string' ? bundleDescription.trim() : '';
    }

    // Если isBundle устанавливается в false, очищаем описание
    if (updateData.isBundle === false && updateData.bundleDescription !== undefined) {
        updateData.bundleDescription = '';
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'Нет данных для обновления настроек папки.' });
    }

    const updatedFolder = await ExerciseCollectionItem.findOneAndUpdate(
      { _id: folderId, itemType: 'folder' }, 
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedFolder) {
      return res.status(404).json({ message: 'Папка не найдена или элемент не является папкой.' });
    }

    res.status(200).json({ message: 'Настройки папки успешно обновлены.', folder: updatedFolder });

  } catch (error) {
    console.error('Ошибка при обновлении настроек папки:', error);
    res.status(500).json({ message: 'Ошибка сервера при обновлении настроек папки.', error: error.message });
  }
});

// --- API для Предопределенных Ключей ---

// Получить все предопределенные ключи
app.get('/api/admin/predefined-keys', async (req, res) => {
  try {
    const keys = await PredefinedKey.find().sort({ keyName: 1 }); // Сортируем по keyName
    res.status(200).json(keys);
  } catch (error) {
    console.error('Ошибка при получении предопределенных ключей:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении предопределенных ключей', error: error.message });
  }
});

// Добавить новый предопределенный ключ
app.post('/api/admin/predefined-keys', async (req, res) => {
  try {
    const { keyName } = req.body; // Принимаем только keyName
    if (!keyName || !keyName.trim()) {
      return res.status(400).json({ message: 'keyName является обязательным полем.' });
    }
    const existingKey = await PredefinedKey.findOne({ keyName: keyName.trim() });
    if (existingKey) {
        return res.status(400).json({ message: `Предопределенный ключ с именем (keyName) "${keyName}" уже существует.` });
    }

    const newKey = new PredefinedKey({
      keyName: keyName.trim(),
    });
    await newKey.save();
    res.status(201).json(newKey);
  } catch (error) {
    console.error('Ошибка при создании предопределенного ключа:', error);
    if (error.code === 11000) {
        return res.status(400).json({ message: `Предопределенный ключ с таким keyName уже существует.` });
    }
    res.status(500).json({ message: 'Ошибка сервера при создании предопределенного ключа', error: error.message });
  }
});

// Удалить предопределенный ключ по ID
app.delete('/api/admin/predefined-keys/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Неверный ID предопределенного ключа.' });
    }
    const result = await PredefinedKey.findByIdAndDelete(id);
    if (!result) {
      return res.status(404).json({ message: 'Предопределенный ключ не найден для удаления.' });
    }
    // Важно: Удаление PredefinedKey не удаляет автоматически соответствующие поля из customFields существующих сессий.
    // Это нужно будет обрабатывать отдельно, если такая логика потребуется (например, при отображении или миграции).
    res.status(200).json({ message: `Предопределенный ключ '${result.keyName}' успешно удален.` });
  } catch (error) {
    console.error('Ошибка при удалении предопределенного ключа:', error);
    res.status(500).json({ message: 'Ошибка сервера при удалении предопределенного ключа', error: error.message });
  }
});

// (Опционально) Обновить предопределенный ключ
app.put('/api/admin/predefined-keys/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { keyName } = req.body; // Принимаем только keyName для обновления

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Неверный ID предопределенного ключа.' });
    }

    const updateData = {};
    if (keyName && keyName.trim()) {
        // Важно: Если keyName должно оставаться уникальным, нужно проверить, 
        // не существует ли уже другой ключ с таким новым keyName, исключая текущий обновляемый ключ.
        // Mongoose уникальный индекс позаботится об этом, но может выдать не очень дружелюбную ошибку.
        // Для простоты пока оставляем так, полагаясь на уникальный индекс в схеме.
        updateData.keyName = keyName.trim();
    }

    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'Нет данных для обновления (ожидается keyName).' });
    }

    const updatedKey = await PredefinedKey.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true });

    if (!updatedKey) {
      return res.status(404).json({ message: 'Предопределенный ключ не найден для обновления.' });
    }
    res.status(200).json(updatedKey);
  } catch (error) {
    console.error('Ошибка при обновлении предопределенного ключа:', error);
    if (error.code === 11000) { // Ошибка дублирования MongoDB для keyName
        return res.status(400).json({ message: `Предопределенный ключ с таким keyName уже существует.` });
    }
    res.status(500).json({ message: 'Ошибка сервера при обновлении предопределенного ключа', error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
