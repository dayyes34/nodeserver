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
  folderName: { 
    type: String,
    trim: true,
    default: null 
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
  customFields: {
    type: [{
      key: { type: String, required: true, trim: true },
      value: { type: String, trim: true, default: '' }
      // _id: false // Раскомментируйте, если не нужны ID для каждой пары ключ-значение в массиве
    }],
    default: []
  },
  parentId: { // <-- ИЗМЕНЕНИЕ: Добавлено поле parentId
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExerciseCollectionItem', // Ссылка на папку в коллекции
    default: null // null означает, что сессия либо в корне коллекции, либо "сырая"
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: { // <-- ИЗМЕНЕНИЕ: Добавлено поле updatedAt для отслеживания изменений
    type: Date,
    default: Date.now
  }
});

// Обновляем поле updatedAt перед каждым сохранением
sequencerSessionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const SequencerSession = mongoose.model('SequencerSession', sequencerSessionSchema);

// Схема и модель для элементов коллекции упражнений пользователя (Папки)
const exerciseCollectionItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  itemType: { // Остается только 'folder', так как 'exerciseLink' больше не используется напрямую для новых сессий
    type: String,
    required: true,
    enum: ['folder', 'exerciseLink'], // 'exerciseLink' может остаться для совместимости или старых данных
    default: 'folder'
  },
  parentId: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExerciseCollectionItem',
    default: null 
  },
  // originalSessionId и originalSessionNameCache больше не являются основными для новой логики,
  // но могут остаться для старых данных типа 'exerciseLink'
  originalSessionId: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SequencerSession',
    default: null
  },
  originalSessionNameCache: { 
    type: String,
    trim: true,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

exerciseCollectionItemSchema.index({ parentId: 1, itemType: 1, name: 1 });

const ExerciseCollectionItem = mongoose.model('ExerciseCollectionItem', exerciseCollectionItemSchema);

const predefinedKeySchema = new mongoose.Schema({
  keyName: { 
    type: String,
    required: true,
    trim: true,
    unique: true 
  },
  keyLabel: { 
    type: String,
    required: true,
    trim: true
  },
  order: { 
    type: Number,
    default: 0
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

// --- API для SequencerSession ---

app.post('/api/sequencer/save', async (req, res) => {
  try {
    const {
      sessionName,
      folderName, // Это строковый путь, который мы продолжим сохранять для информации
      bpm,
      trackNames,
      currentSequencerStructure,
      currentBars,
      cellsState,
      loopedBlockIndices,
      mutedTracks,
      isMetronomeEnabled,
      version,
      customFields,
      targetCollectionParentId // <-- ИЗМЕНЕНИЕ: ID папки из коллекции
    } = req.body;

    // Валидация базовых полей
    if (!sessionName || !bpm || !trackNames || !currentSequencerStructure || !currentBars || !cellsState) {
      return res.status(400).json({ message: 'Отсутствуют обязательные поля для сохранения сессии.' });
    }
    // parentId может быть null, поэтому дополнительная проверка не нужна, если он не передан

    const newSession = new SequencerSession({
      sessionName: sessionName.trim(),
      folderName: folderName ? folderName.trim() : null,
      version: version || "1.0",
      bpm,
      trackNames,
      currentSequencerStructure,
      currentBars,
      cellsState,
      loopedBlockIndices: loopedBlockIndices || [],
      mutedTracks: mutedTracks || [],
      isMetronomeEnabled: isMetronomeEnabled || false,
      customFields: customFields || [],
      parentId: targetCollectionParentId || null // <-- ИЗМЕНЕНИЕ: Устанавливаем parentId
    });

    const savedSession = await newSession.save();
    res.status(201).json({ 
      message: `Сессия '${savedSession.sessionName}' успешно сохранена!`, 
      sessionId: savedSession._id, 
      session: savedSession // Возвращаем сохраненную сессию
    });

  } catch (error) {
    console.error('[POST /api/sequencer/save] Ошибка сохранения сессии:', error);
    res.status(500).json({ message: 'Ошибка сервера при сохранении сессии', error: error.message });
  }
});

app.get('/api/sequencer/sessions', async (req, res) => {
  try {
    // Возвращаем все сессии, клиент будет фильтровать "сырые" по parentId === null при необходимости
    // Добавляем parentId и folderName в выборку для отображения на клиенте
    const sessions = await SequencerSession.find({})
                                           .sort({ updatedAt: -1, createdAt: -1 }); // Сортируем по дате обновления/создания
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
    const session = await SequencerSession.findById(sessionId); 
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
    // Перед удалением сессии, если она была привязана к ExerciseCollectionItem (старая логика exerciseLink),
    // то такие ссылки должны стать "битыми" или их нужно удалять отдельно, если такая логика была.
    // В новой унифицированной системе, сессия - это и есть элемент коллекции, если у нее есть parentId.
    // Если мы удаляем сессию, которая была в коллекции (имела parentId),
    // то она просто исчезнет из этой коллекции при следующем запросе GET /api/my-collection.
    // Никаких специальных действий с ExerciseCollectionItem здесь не требуется при удалении самой SequencerSession.
    
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

app.put('/api/sequencer/sessions/:id/customfields', async (req, res) => {
  try {
    const sessionId = req.params.id;
    const { fields } = req.body; 

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ message: 'Неверный ID сессии.' });
    }
    if (!Array.isArray(fields)) {
      return res.status(400).json({ message: 'Кастомные поля должны быть массивом.' });
    }

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
    const sanitizedFields = fields.map(f => ({ 
      key: f.key.trim(), 
      value: (f.value || '').trim() 
    }));

    const session = await SequencerSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Сессия не найдена для обновления кастомных полей.' });
    }
    
    session.customFields = sanitizedFields;
    // session.updatedAt будет обновлено pre('save') хуком
    const updatedSession = await session.save();

    res.status(200).json({ message: `Кастомные поля для сессии '${updatedSession.sessionName}' успешно обновлены.`, session: updatedSession });

  } catch (error) {
    console.error('Ошибка при обновлении кастомных полей сессии:', error);
    if (error.name === 'ValidationError') {
        return res.status(400).json({ message: 'Ошибка валидации при обновлении кастомных полей', errors: error.errors });
    }
    res.status(500).json({ message: 'Ошибка сервера при обновлении кастомных полей сессии', error: error.message });
  }
});

// --- ИЗМЕНЕНИЕ: Новый эндпоинт для установки parentId (привязки к папке коллекции) ---
app.put('/api/sequencer/sessions/:id/set-collection-parent', async (req, res) => {
  try {
    const sessionId = req.params.id;
    const { parentId, folderPath } = req.body; // parentId - ID папки ExerciseCollectionItem, folderPath - строковый путь

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ message: 'Некорректный ID сессии.' });
    }
    // parentId может быть null (для отвязки от коллекции или перемещения в корень "Моей коллекции")
    // или валидным ObjectId, если привязываем к папке.
    if (parentId !== null && parentId !== undefined && parentId !== 'null' && !mongoose.Types.ObjectId.isValid(parentId)) {
      return res.status(400).json({ message: 'Некорректный ID родительской папки.' });
    }

    const sessionToUpdate = await SequencerSession.findById(sessionId);
    if (!sessionToUpdate) {
      return res.status(404).json({ message: 'Сессия для обновления не найдена.' });
    }

    // Если parentId передан и он валиден (или это строка 'null'), проверяем папку
    let targetParentIdFinal = null;
    if (parentId && parentId !== 'null') {
        targetParentIdFinal = new mongoose.Types.ObjectId(parentId);
        const parentFolder = await ExerciseCollectionItem.findOne({ _id: targetParentIdFinal, itemType: 'folder' });
        if (!parentFolder) {
            return res.status(404).json({ message: 'Целевая папка в коллекции не найдена или не является папкой.' });
        }
    } else if (parentId === 'null' || parentId === null || parentId === undefined) {
        targetParentIdFinal = null; // Отвязка от папки или помещение в корень
    }
    
    sessionToUpdate.parentId = targetParentIdFinal;
    sessionToUpdate.folderName = folderPath === undefined ? sessionToUpdate.folderName : (folderPath || null);
    // updatedAt будет обновлен pre('save') хуком
    const updatedSession = await sessionToUpdate.save();
    res.json({ message: 'Привязка сессии к коллекции обновлена.', session: updatedSession });

  } catch (error) {
    console.error('[PUT /sessions/:id/set-collection-parent]', error);
    res.status(500).json({ message: 'Ошибка при обновлении привязки сессии к коллекции', details: error.message });
  }
});


// --- API для коллекции (Папки и Сессии внутри них) ---

// ИЗМЕНЕНИЕ: Получить элементы коллекции (папки И сессии) для указанного parentId
app.get('/api/my-collection', async (req, res) => {
  try {
    const parentIdQuery = req.query.parentId; // Может быть ID папки или undefined/null/'null' для корня
    let queryParentId = null;

    if (parentIdQuery && parentIdQuery !== 'null' && mongoose.Types.ObjectId.isValid(parentIdQuery)) {
      queryParentId = new mongoose.Types.ObjectId(parentIdQuery);
    }
    
    // 1. Fetch folders (ExerciseCollectionItem с itemType: 'folder')
    const folderCriteria = { itemType: 'folder', parentId: queryParentId };
    const folders = await ExerciseCollectionItem.find(folderCriteria).sort({ name: 1 });

    // 2. Fetch sessions (SequencerSession) с тем же parentId
    const sessionCriteria = { parentId: queryParentId };
    const sessions = await SequencerSession.find(sessionCriteria).sort({ sessionName: 1 });

    // 3. Combine and add itemTypeFromBackend для удобства клиента
    const combinedResults = [
      ...folders.map(f => ({ ...f.toObject(), itemTypeFromBackend: 'folder' })),
      ...sessions.map(s => ({ 
          ...s.toObject(), 
          name: s.sessionName, // Добавляем поле name для унификации с папками на клиенте
          itemTypeFromBackend: 'session' 
      }))
    ];
    
    // Сортируем смешанный результат: сначала все папки по имени, потом все сессии по имени
    combinedResults.sort((a, b) => {
        if (a.itemTypeFromBackend === 'folder' && b.itemTypeFromBackend !== 'folder') return -1;
        if (a.itemTypeFromBackend !== 'folder' && b.itemTypeFromBackend === 'folder') return 1;
        // Если типы одинаковые (обе папки или обе сессии), сортируем по имени
        const nameA = a.name || a.sessionName || '';
        const nameB = b.name || b.sessionName || '';
        return nameA.localeCompare(nameB);
    });

    res.status(200).json(combinedResults);
  } catch (error) {
    console.error('[GET /api/my-collection]', error);
    res.status(500).json({ message: 'Ошибка загрузки организованной коллекции', details: error.message });
  }
});

app.post('/api/my-collection/folder', async (req, res) => {
  try {
    const { name, parentId } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Имя папки не может быть пустым.' });
    }
    
    let finalParentId = null;
    if (parentId && parentId !== 'null') {
        if (!mongoose.Types.ObjectId.isValid(parentId)) {
            return res.status(400).json({ message: 'Неверный ID родительской папки.' });
        }
        finalParentId = new mongoose.Types.ObjectId(parentId);
        const parentFolder = await ExerciseCollectionItem.findById(finalParentId);
        if (!parentFolder || parentFolder.itemType !== 'folder') {
            return res.status(404).json({ message: 'Родительская папка не найдена или не является папкой.'});
        }
    }

    const newFolder = new ExerciseCollectionItem({
      name: name.trim(),
      itemType: 'folder', // Явно указываем тип
      parentId: finalParentId,
    });
    await newFolder.save();
    res.status(201).json(newFolder);
  } catch (error) {
    console.error('Ошибка при создании папки в коллекции:', error);
    res.status(500).json({ message: 'Ошибка сервера при создании папки', error: error.message });
  }
});

// Эндпоинт POST /api/my-collection/add-exercise-links остается для совместимости или специфичных нужд,
// но основной поток добавления упражнений теперь идет через сохранение SequencerSession с parentId.
// Если он больше не нужен, его можно будет удалить.
app.post('/api/my-collection/add-exercise-links', async (req, res) => {
  // Логика этого эндпоинта остается прежней, так как он может использоваться для старых сценариев
  // или если вы решите вернуть функционал "ссылок" в каком-то виде.
  // Но для нового унифицированного подхода он не является основным.
  try {
    const { targetParentId, exercises } = req.body; 
    if (!exercises || !Array.isArray(exercises) || exercises.length === 0) {
      return res.status(400).json({ message: 'Не предоставлены упражнения для добавления.' });
    }
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
        console.warn('Пропущено упражнение с неверным originalSessionId:', ex);
        continue;
      }
      if (!ex.name || ex.name.trim() === '') {
        return res.status(400).json({ message: `Имя для упражнения '${ex.originalSessionNameCache || ex.originalSessionId}' не может быть пустым.` });
      }
      const newExerciseLink = new ExerciseCollectionItem({
        name: ex.name.trim(), 
        itemType: 'exerciseLink',
        parentId: targetParentId || null,
        originalSessionId: ex.originalSessionId,
        originalSessionNameCache: ex.originalSessionNameCache || 'Упражнение' 
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

// ИЗМЕНЕНИЕ: Удаление элемента из коллекции (только папки ExerciseCollectionItem)
// При удалении папки, также удаляются все SequencerSession, которые на нее ссылались.
app.delete('/api/my-collection/item/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ message: 'Неверный ID элемента.' });
    }

    const itemToDelete = await ExerciseCollectionItem.findById(itemId);
    if (!itemToDelete) {
      return res.status(404).json({ message: 'Элемент коллекции (папка) не найден.' });
    }

    if (itemToDelete.itemType !== 'folder') {
        // Этот эндпоинт теперь предназначен ТОЛЬКО для удаления папок.
        // Старые 'exerciseLink' если и остались, можно удалить, но основной кейс - папки.
        // Если это exerciseLink, его можно просто удалить.
        if (itemToDelete.itemType === 'exerciseLink') {
            await ExerciseCollectionItem.findByIdAndDelete(itemId);
            return res.status(200).json({ message: `Ссылка на упражнение '${itemToDelete.name}' успешно удалена.` });
        }
        return res.status(400).json({ message: 'Удаление через этот эндпоинт поддерживается только для папок.' });
    }

    // Если это папка, каскадно удаляем связанные SequencerSession
    // Сначала рекурсивно удаляем все дочерние папки и их содержимое
    const deleteFolderAndContentsRecursive = async (folderId) => {
        // Найти и удалить все сессии в текущей папке
        const childSessions = await SequencerSession.find({ parentId: folderId });
        if (childSessions.length > 0) {
            await SequencerSession.deleteMany({ parentId: folderId });
            console.log(`Удалено ${childSessions.length} сессий из папки ${folderId}`);
        }

        // Найти и рекурсивно удалить все дочерние папки
        const childFolders = await ExerciseCollectionItem.find({ parentId: folderId, itemType: 'folder' });
        for (const childFolder of childFolders) {
            await deleteFolderAndContentsRecursive(childFolder._id);
        }

        // Удалить саму папку
        await ExerciseCollectionItem.findByIdAndDelete(folderId);
        console.log(`Удалена папка ${folderId}`);
    };

    await deleteFolderAndContentsRecursive(itemToDelete._id);
    
    res.status(200).json({ message: `Папка '${itemToDelete.name}' и все ее содержимое успешно удалены.` });

  } catch (error) {
    console.error('[DELETE /api/my-collection/item/:itemId]', error);
    res.status(500).json({ message: 'Ошибка при удалении элемента из коллекции', details: error.message });
  }
});

// --- API для Предопределенных Ключей ---
// (Эта часть остается без изменений, так как она уже была корректной)
app.get('/api/admin/predefined-keys', async (req, res) => {
  try {
    const keys = await PredefinedKey.find().sort({ order: 1, keyLabel: 1 });
    res.status(200).json(keys);
  } catch (error) {
    console.error('Ошибка при получении предопределенных ключей:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении предопределенных ключей', error: error.message });
  }
});

app.post('/api/admin/predefined-keys', async (req, res) => {
  try {
    const { keyName, keyLabel, order } = req.body;
    if (!keyName || !keyName.trim() || !keyLabel || !keyLabel.trim()) {
      return res.status(400).json({ message: 'keyName и keyLabel являются обязательными полями.' });
    }
    const existingKey = await PredefinedKey.findOne({ keyName: keyName.trim() });
    if (existingKey) {
        return res.status(400).json({ message: `Предопределенный ключ с именем (keyName) "${keyName}" уже существует.` });
    }
    const newKey = new PredefinedKey({
      keyName: keyName.trim(),
      keyLabel: keyLabel.trim(),
      order: order || 0
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
    res.status(200).json({ message: `Предопределенный ключ '${result.keyLabel}' успешно удален.` });
  } catch (error) {
    console.error('Ошибка при удалении предопределенного ключа:', error);
    res.status(500).json({ message: 'Ошибка сервера при удалении предопределенного ключа', error: error.message });
  }
});

app.put('/api/admin/predefined-keys/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { keyLabel, order } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Неверный ID предопределенного ключа.' });
    }
    const updateData = {};
    if (keyLabel && keyLabel.trim()) updateData.keyLabel = keyLabel.trim();
    if (order !== undefined && !isNaN(parseInt(order))) updateData.order = parseInt(order);


    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'Нет данных для обновления (keyLabel или order).' });
    }
    // Не позволяем редактировать keyName, он должен быть неизменным
    if (req.body.keyName) {
        return res.status(400).json({ message: 'Техническое имя ключа (keyName) не может быть изменено.' });
    }

    const updatedKey = await PredefinedKey.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true });

    if (!updatedKey) {
      return res.status(404).json({ message: 'Предопределенный ключ не найден для обновления.' });
    }
    res.status(200).json(updatedKey);
  } catch (error) {
    console.error('Ошибка при обновлении предопределенного ключа:', error);
    res.status(500).json({ message: 'Ошибка сервера при обновлении предопределенного ключа', error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
