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
  // Возможно, в будущем: userId, order, etc.
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Индекс для быстрого поиска дочерних элементов
exerciseCollectionItemSchema.index({ parentId: 1, itemType: 1, name: 1 });

const ExerciseCollectionItem = mongoose.model('ExerciseCollectionItem', exerciseCollectionItemSchema);

app.get('/', (req, res) => {
  res.send('Сервер секвенсора работает!');
});

app.post('/api/sequencer/save', async (req, res) => {
  try {
    const sessionData = req.body;
    // folderName теперь тоже может прийти
    const { sessionName, folderName, version, bpm, trackNames, currentSequencerStructure, currentBars, cellsState, loopedBlockIndices, mutedTracks, isMetronomeEnabled } = sessionData;

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
        version, bpm, trackNames, currentSequencerStructure, currentBars, cellsState, loopedBlockIndices, mutedTracks, isMetronomeEnabled
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
    res.status(200).json({ message: `Сессия '${result.sessionName}' успешно удалена` });
  } catch (error) {
    console.error('Ошибка при удалении сессии по ID:', error);
    res.status(500).json({ message: 'Ошибка сервера при удалении сессии', error: error.message });
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
    const { name, parentId } = req.body;
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
