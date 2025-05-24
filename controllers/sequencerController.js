const SequencerSession = require('../models/SequencerSession');
const ExerciseCollectionItem = require('../models/ExerciseCollectionItem');

const saveSession = async (req, res) => {
  try {
    const sessionData = req.body;
    const { 
      sessionName, 
      folderName, 
      version, 
      bpm, 
      trackNames, 
      currentSequencerStructure, 
      currentBars, 
      cellsState, 
      loopedBlockIndices, 
      mutedTracks, 
      isMetronomeEnabled, 
      customFields 
    } = sessionData;

    const requiredCoreFields = [
      'sessionName', 'version', 'bpm', 'trackNames', 'currentSequencerStructure',
      'currentBars', 'cellsState', 'loopedBlockIndices', 'mutedTracks', 'isMetronomeEnabled'
    ];

    for (const field of requiredCoreFields) {
      if (!sessionData.hasOwnProperty(field) || sessionData[field] === null || 
         (typeof sessionData[field] === 'string' && sessionData[field].trim() === '' && field === 'sessionName')) {
        return res.status(400).json({ message: `Отсутствует или не заполнено обязательное поле: ${field}` });
      }
    }

    const newSession = new SequencerSession(sessionData);
    await newSession.save();

    res.status(201).json({
      message: 'Сессия успешно сохранена',
      sessionId: newSession._id
    });
  } catch (error) {
    console.error('Ошибка при сохранении сессии:', error);
    res.status(500).json({ message: 'Ошибка при сохранении сессии' });
  }
};

const getSessionById = async (req, res) => {
  try {
    const session = await SequencerSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Сессия не найдена' });
    }
    res.json(session);
  } catch (error) {
    console.error('Ошибка при получении сессии:', error);
    res.status(500).json({ message: 'Ошибка при получении сессии' });
  }
};

const updateSession = async (req, res) => {
  try {
    const { sessionName, bpm, folderName } = req.body;
    
    // Проверяем обязательные поля
    if (!sessionName || sessionName.trim() === '') {
      return res.status(400).json({ message: 'Имя сессии обязательно' });
    }
    if (typeof bpm !== 'undefined' && (isNaN(bpm) || bpm <= 0)) {
      return res.status(400).json({ message: 'BPM должен быть положительным числом' });
    }

    const session = await SequencerSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Сессия не найдена' });
    }

    // Обновляем только разрешенные поля
    session.sessionName = sessionName.trim();
    if (typeof bpm !== 'undefined') session.bpm = bpm;
    session.folderName = folderName ? folderName.trim() : null;

    await session.save();

    res.json({ 
      message: 'Сессия успешно обновлена',
      session: session
    });
  } catch (error) {
    console.error('Ошибка при обновлении сессии:', error);
    res.status(500).json({ message: 'Ошибка при обновлении сессии' });
  }
};

const updateSessionCustomFields = async (req, res) => {
  try {
    const { fields } = req.body;
    
    if (!Array.isArray(fields)) {
      return res.status(400).json({ message: 'Поле fields должно быть массивом' });
    }

    // Проверяем формат каждого поля
    for (const field of fields) {
      if (!field.key || typeof field.key !== 'string' || field.key.trim() === '') {
        return res.status(400).json({ message: 'Каждое поле должно иметь непустой ключ (key)' });
      }
      if (typeof field.value !== 'string') {
        return res.status(400).json({ message: 'Значение (value) должно быть строкой' });
      }
    }

    const session = await SequencerSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Сессия не найдена' });
    }

    // Обновляем кастомные поля
    session.customFields = fields.map(field => ({
      key: field.key.trim(),
      value: field.value.trim()
    }));

    await session.save();

    res.json({ 
      message: 'Кастомные поля успешно обновлены',
      session: session
    });
  } catch (error) {
    console.error('Ошибка при обновлении кастомных полей:', error);
    res.status(500).json({ message: 'Ошибка при обновлении кастомных полей' });
  }
};

const deleteSession = async (req, res) => {
  try {
    const session = await SequencerSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Сессия не найдена' });
    }

    // Сначала удаляем все ссылки на эту сессию из коллекции
    await ExerciseCollectionItem.deleteMany({ 
      itemType: 'exerciseLink',
      originalSessionId: session._id 
    });

    // Затем удаляем саму сессию
    await session.deleteOne();
    
    res.json({ message: 'Сессия и все ссылки на неё успешно удалены' });
  } catch (error) {
    console.error('Ошибка при удалении сессии:', error);
    res.status(500).json({ message: 'Ошибка при удалении сессии' });
  }
};

const openSession = async (req, res) => {
  try {
    const session = await SequencerSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Сессия не найдена' });
    }

    // Сохраняем путь возврата в сессии
    if (req.body.returnPath !== undefined) {
      session.lastReturnPath = req.body.returnPath;
      await session.save();
    }

    res.json({ 
      message: 'Сессия готова к открытию',
      session: session
    });
  } catch (error) {
    console.error('Ошибка при открытии сессии:', error);
    res.status(500).json({ message: 'Ошибка при открытии сессии' });
  }
};

module.exports = {
  saveSession,
  getSessionById,
  updateSession,
  updateSessionCustomFields,
  deleteSession,
  openSession
}; 