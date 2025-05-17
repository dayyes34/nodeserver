const express = require('express');
const router = express.Router();
const SequencerSession = require('../models/SequencerSession');
const mongoose = require('mongoose'); // Убедимся, что mongoose импортирован

// Сохранение новой сессии или обновление существующей (если есть ID в теле)
router.post('/save', async (req, res) => {
  try {
    const {
      sessionName,
      folderName, // Это строковый путь, который мы продолжим сохранять
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
      targetCollectionParentId, // <-- Новое поле из запроса (ID папки из коллекции)
      // sessionIdToUpdate // Если мы захотим обновлять существующую сессию этим же эндпоинтом
    } = req.body;

    // Валидация базовых полей
    if (!sessionName || !bpm || !trackNames || !currentSequencerStructure || !currentBars || !cellsState) {
      return res.status(400).json({ message: 'Отсутствуют обязательные поля для сохранения сессии.' });
    }

    const newSession = new SequencerSession({
      sessionName,
      folderName, // Сохраняем строковый путь
      bpm,
      trackNames,
      currentSequencerStructure,
      currentBars,
      cellsState,
      loopedBlockIndices,
      mutedTracks,
      isMetronomeEnabled,
      version,
      customFields: customFields || [],
      parentId: targetCollectionParentId || null // <-- Устанавливаем parentId
    });

    const savedSession = await newSession.save();
    res.status(201).json({ 
      message: 'Сессия успешно сохранена!', 
      sessionId: savedSession._id, 
      session: savedSession // Возвращаем сохраненную сессию
    });

  } catch (error) {
    console.error('[POST /api/sequencer/save] Ошибка сохранения сессии:', error);
    res.status(500).json({ message: 'Ошибка сервера при сохранении сессии', error: error.message });
  }
});

// GET all sessions (или по папке, если query param folderName указан)
router.get('/sessions', async (req, res) => {
  try {
    const query = {};
    if (req.query.folderName) {
      query.folderName = req.query.folderName;
    }
    // TODO: В будущем, возможно, фильтровать "сырые" сессии (parentId === null)
    // или добавить параметр для фильтрации по parentId
    const sessions = await SequencerSession.find(query).sort({ createdAt: -1 });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET a specific session by ID
router.get('/sessions/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Некорректный ID сессии' });
    }
    const session = await SequencerSession.findById(req.params.id);
    if (session == null) {
      return res.status(404).json({ message: 'Сессия не найдена' });
    }
    res.json(session);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE a session by ID
router.delete('/sessions/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Некорректный ID сессии' });
    }
    const session = await SequencerSession.findById(req.params.id);
    if (session == null) {
      return res.status(404).json({ message: 'Сессия не найдена для удаления' });
    }
    await session.deleteOne(); // Используем deleteOne на экземпляре
    res.json({ message: 'Сессия успешно удалена' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update custom fields for a session
router.put('/sessions/:id/customfields', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Некорректный ID сессии' });
    }
    const { fields } = req.body;
    if (!Array.isArray(fields)) {
      return res.status(400).json({ message: 'Поле \'fields\' должно быть массивом' });
    }

    const session = await SequencerSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Сессия не найдена' });
    }

    session.customFields = fields.map(f => ({ key: f.key, value: f.value }));
    session.updatedAt = Date.now();
    const updatedSession = await session.save();
    res.json({ message: 'Кастомные поля обновлены', session: updatedSession });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// НОВЫЙ ЭНДПОИНТ: PUT для установки parentId (привязки к папке коллекции)
router.put('/sessions/:id/set-collection-parent', async (req, res) => {
  try {
    const sessionId = req.params.id;
    const { parentId, folderPath } = req.body; // parentId - это ID папки ExerciseCollectionItem или null
                                      // folderPath - это строковый путь "Папка1/Папка2", или null

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ message: 'Некорректный ID сессии.' });
    }
    // parentId может быть null (для корня коллекции) или валидным ObjectId
    if (parentId !== null && !mongoose.Types.ObjectId.isValid(parentId)) {
      return res.status(400).json({ message: 'Некорректный ID родительской папки.' });
    }

    const sessionToUpdate = await SequencerSession.findById(sessionId);
    if (!sessionToUpdate) {
      return res.status(404).json({ message: 'Сессия для обновления не найдена.' });
    }

    sessionToUpdate.parentId = parentId === 'null' || parentId === '' ? null : parentId; // Убедимся, что строка 'null' становится настоящим null
    sessionToUpdate.folderName = folderPath === undefined ? sessionToUpdate.folderName : folderPath; // Обновляем folderName, если предоставлен
    sessionToUpdate.updatedAt = Date.now();

    const updatedSession = await sessionToUpdate.save();
    res.json({ message: 'Привязка сессии к коллекции обновлена.', session: updatedSession });

  } catch (error) {
    console.error('[PUT /sessions/:id/set-collection-parent]', error);
    res.status(500).json({ message: 'Ошибка при обновлении привязки сессии к коллекции', details: error.message });
  }
});

module.exports = router; 