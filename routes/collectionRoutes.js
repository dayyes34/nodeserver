const express = require('express');
const router = express.Router();
const ExerciseCollectionItem = require('../models/ExerciseCollectionItem');
const SequencerSession = require('../models/SequencerSession');
const mongoose = require('mongoose');

// GET items from organized collection (folders and sessions for a given parentId)
router.get('/', async (req, res) => {
  try {
    const parentIdQuery = req.query.parentId;
    // mongoose.Types.ObjectId.isValid(parentIdQuery) ? mongoose.Types.ObjectId(parentIdQuery) : null;
    // ^^^ Более строгая проверка и преобразование parentIdQuery в ObjectId или null
    // Пока оставим простую проверку на 'null' строку для корневых элементов
    const queryParentId = parentIdQuery === 'null' || parentIdQuery === undefined ? null : parentIdQuery;

    // 1. Fetch folders (ExerciseCollectionItem with itemType: 'folder')
    const folderQuery = { itemType: 'folder' };
    if (queryParentId) {
      folderQuery.parentId = queryParentId;
    } else {
      folderQuery.parentId = null; // Явно для корневых папок
    }
    const folders = await ExerciseCollectionItem.find(folderQuery).sort({ name: 1 });

    // 2. Fetch sessions (SequencerSession) with the same parentId
    const sessionQuery = {};
    if (queryParentId) {
      sessionQuery.parentId = queryParentId;
    } else {
      sessionQuery.parentId = null; // Явно для корневых сессий в коллекции
    }
    const sessions = await SequencerSession.find(sessionQuery).sort({ sessionName: 1 });

    // 3. Combine and add itemType for client differentiation
    const combinedResults = [
      ...folders.map(f => ({ ...f.toObject(), itemTypeFromBackend: 'folder' })),
      ...sessions.map(s => ({ ...s.toObject(), itemTypeFromBackend: 'session' }))
    ];
    
    // Возможно, потребуется дополнительная сортировка, если важен строгий порядок папки/файлы
    // Например, сначала все папки, потом все сессии (уже сделано сортировкой выше и порядком слияния)
    // Или смешанная сортировка по имени, но тогда нужно общее поле для имени.
    // Пока оставляем так: сначала папки, потом сессии, каждая группа отсортирована по имени.

    res.json(combinedResults);
  } catch (error) {
    console.error('[GET /api/my-collection]', error);
    res.status(500).json({ message: 'Ошибка загрузки организованной коллекции', details: error.message });
  }
});

// ... (POST /folder - остается как есть) ...
router.post('/folder', async (req, res) => {
  try {
    const { name, parentId } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Имя папки не может быть пустым.' });
    }
    const newItem = new ExerciseCollectionItem({
      name: name.trim(),
      itemType: 'folder',
      parentId: parentId || null,
    });
    const savedItem = await newItem.save();
    res.status(201).json(savedItem);
  } catch (error) {
    console.error('[POST /api/my-collection/folder]', error);
    res.status(500).json({ message: 'Ошибка при создании папки', details: error.message });
  }
});


// POST add-exercise-links - ЭТОТ ЭНДПОИНТ БОЛЬШЕ НЕ НУЖЕН для нового потока сохранения.
// Оставляем его, если есть старая логика, которая его использует, или для будущего.
// Если он точно не нужен, его можно удалить.
router.post('/add-exercise-links', async (req, res) => {
  try {
    const { targetParentId, exercises } = req.body;
    if (!Array.isArray(exercises) || exercises.length === 0) {
      return res.status(400).json({ message: 'Список упражнений для добавления пуст.' });
    }

    const itemsToSave = exercises.map(ex => ({
      name: ex.name || 'Без имени',
      itemType: 'exerciseLink', // Старая логика
      parentId: targetParentId || null,
      originalSessionId: ex.originalSessionId,
      originalSessionNameCache: ex.originalSessionNameCache || ex.name || 'Без имени',
      customFields: ex.customFields || [] // Если они хранились здесь
    }));

    const savedItems = await ExerciseCollectionItem.insertMany(itemsToSave);
    res.status(201).json({ message: 'Ссылки успешно добавлены', items: savedItems });
  } catch (error) {
    console.error('[POST /api/my-collection/add-exercise-links]', error);
    res.status(500).json({ message: 'Ошибка добавления ссылок в коллекцию', details: error.message });
  }
});


// DELETE an item from the organized collection (folder or old exerciseLink)
// Также обрабатывает каскадное удаление сессий при удалении папки
router.delete('/item/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ message: 'Некорректный ID элемента.' });
    }

    const itemToDelete = await ExerciseCollectionItem.findById(itemId);

    if (!itemToDelete) {
      return res.status(404).json({ message: 'Элемент коллекции не найден.' });
    }

    // Если это папка, каскадно удаляем связанные SequencerSession
    if (itemToDelete.itemType === 'folder') {
      // Находим все дочерние папки (рекурсивно, если потребуется более глубокое удаление)
      // Пока что удаляем сессии только из непосредственно удаляемой папки.
      // Для рекурсивного удаления папок и их содержимого потребуется более сложная логика.
      const childSessions = await SequencerSession.find({ parentId: itemToDelete._id });
      if (childSessions.length > 0) {
        await SequencerSession.deleteMany({ parentId: itemToDelete._id });
        console.log(`Удалено ${childSessions.length} сессий из папки ${itemToDelete.name}`);
      }
      // TODO: Рекурсивно удалить дочерние папки и их содержимое, если это требуется.
      // Пока что, если есть дочерние папки, они станут "осиротевшими" (их parentId будет указывать на удаленную папку)
      // или их нужно перепривязать/удалить.
    }

    await ExerciseCollectionItem.findByIdAndDelete(itemId);
    res.json({ message: `Элемент '${itemToDelete.name}' (${itemToDelete.itemType}) успешно удален.` });

  } catch (error) {
    console.error('[DELETE /api/my-collection/item/:itemId]', error);
    res.status(500).json({ message: 'Ошибка при удалении элемента из коллекции', details: error.message });
  }
});

module.exports = router; 