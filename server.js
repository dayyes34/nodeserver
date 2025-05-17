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

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});