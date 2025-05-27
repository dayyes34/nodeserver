const ExerciseCollectionItem = require('../models/ExerciseCollectionItem');
const BundleCollection = require('../models/BundleCollection');
const SequencerSession = require('../models/SequencerSession');
const mongoose = require('mongoose');

// Получить все элементы коллекции
const getAllItems = async (req, res) => {
  try {
    const items = await ExerciseCollectionItem.find()
      .populate('collectionId', 'name description icon color')
      .sort({ parentId: 1, itemType: 1, name: 1 });
    res.status(200).json(items);
  } catch (error) {
    console.error('Ошибка при получении коллекции упражнений:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении коллекции', error: error.message });
  }
};

// Создать новую папку
const createFolder = async (req, res) => {
  try {
    const { name, parentId, isBundle, bundleDescription } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Имя папки не может быть пустым.' });
    }

    if (parentId && !mongoose.Types.ObjectId.isValid(parentId)) {
      return res.status(400).json({ message: 'Неверный ID родительской папки.' });
    }

    if (parentId) {
      const parentFolder = await ExerciseCollectionItem.findById(parentId);
      if (!parentFolder || parentFolder.itemType !== 'folder') {
        return res.status(404).json({ message: 'Родительская папка не найдена или не является папкой.' });
      }
    }

    const newFolder = new ExerciseCollectionItem({
      name: name.trim(),
      itemType: 'folder',
      parentId: parentId || null,
      isBundle: typeof isBundle === 'boolean' ? isBundle : false,
      bundleDescription: typeof bundleDescription === 'string' ? bundleDescription.trim() : ''
    });

    await newFolder.save();
    res.status(201).json(newFolder);
  } catch (error) {
    console.error('Ошибка при создании папки в коллекции:', error);
    res.status(500).json({ message: 'Ошибка сервера при создании папки', error: error.message });
  }
};

// Добавить ссылки на упражнения
const addExerciseLinks = async (req, res) => {
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
        return res.status(404).json({ message: 'Целевая папка не найдена или не является папкой.' });
      }
    }

    const createdItems = [];
    for (const ex of exercises) {
      if (!ex.originalSessionId || !mongoose.Types.ObjectId.isValid(ex.originalSessionId)) {
        console.warn('Пропущено упражнение с неверным originalSessionId:', ex);
        continue;
      }
      
      if (!ex.name || ex.name.trim() === '') {
        return res.status(400).json({ 
          message: `Имя для упражнения '${ex.originalSessionNameCache || ex.originalSessionId}' не может быть пустым.` 
        });
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
};

// Удалить элемент
const deleteItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ message: 'Неверный ID элемента.' });
    }

    const itemToDelete = await ExerciseCollectionItem.findById(itemId);
    if (!itemToDelete) {
      return res.status(404).json({ message: 'Элемент не найден.' });
    }

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
};

// Обновить настройки папки
const updateFolderSettings = async (req, res) => {
  try {
    const { folderId } = req.params;
    const { isBundle, bundleDescription, bundlePrice, bundleCurrency, collectionId, collectionOrder } = req.body;

    if (!mongoose.Types.ObjectId.isValid(folderId)) {
      return res.status(400).json({ message: 'Неверный ID папки.' });
    }

    const updateData = {};
    
    if (typeof isBundle === 'boolean') {
      updateData.isBundle = isBundle;
    }

    if (bundleDescription !== undefined) {
      updateData.bundleDescription = typeof bundleDescription === 'string' ? bundleDescription.trim() : '';
    }

    // Обработка коллекции и порядка отображения
    if (isBundle === true) {
      // Проверяем collectionId, если он указан
      if (collectionId !== undefined) {
        if (collectionId === null || collectionId === '') {
          updateData.collectionId = null;
          updateData.collectionOrder = 0; // Сбрасываем порядок, если коллекция не выбрана
        } else {
          if (!mongoose.Types.ObjectId.isValid(collectionId)) {
            return res.status(400).json({ message: 'Неверный ID коллекции.' });
          }
          
          // Проверяем, что коллекция существует
          const collection = await BundleCollection.findById(collectionId);
          if (!collection) {
            return res.status(404).json({ message: 'Коллекция не найдена.' });
          }
          
          updateData.collectionId = collectionId;
        }
      }

      // Обработка порядка отображения
      if (collectionOrder !== undefined) {
        const order = parseInt(collectionOrder);
        if (!isNaN(order) && order >= 0) {
          updateData.collectionOrder = order;
        } else {
          return res.status(400).json({ message: 'Порядок отображения должен быть неотрицательным числом.' });
        }
      }

      // Обработка цены и валюты
      if (bundlePrice !== undefined && bundlePrice !== null) {
        const price = parseFloat(bundlePrice);
        if (!isNaN(price) && price >= 0) {
          updateData.bundlePrice = price;
        } else {
          return res.status(400).json({ message: 'bundlePrice должен быть неотрицательным числом.' });
        }

        if (bundleCurrency !== undefined && bundleCurrency !== null && 
            typeof bundleCurrency === 'string' && bundleCurrency.trim().length === 3) {
          updateData.bundleCurrency = bundleCurrency.trim().toUpperCase();
        } else {
          return res.status(400).json({ 
            message: 'bundleCurrency (3-х буквенный код) обязателен, если указана цена бандла.' 
          });
        }
      } else {
        updateData.bundlePrice = null;
        updateData.bundleCurrency = null;
      }
    } else if (isBundle === false) {
      updateData.bundleDescription = '';
      updateData.bundlePrice = null;
      updateData.bundleCurrency = null;
      updateData.collectionId = null;
      updateData.collectionOrder = 0;
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
};

// Переместить элемент
const moveItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { newParentId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ message: 'Неверный ID элемента для перемещения.' });
    }

    const itemToMove = await ExerciseCollectionItem.findById(itemId);
    if (!itemToMove) {
      return res.status(404).json({ message: 'Элемент для перемещения не найден.' });
    }

    if (newParentId && !mongoose.Types.ObjectId.isValid(newParentId)) {
      return res.status(400).json({ message: 'Неверный ID новой родительской папки.' });
    }

    if (newParentId) {
      const parentFolder = await ExerciseCollectionItem.findById(newParentId);
      if (!parentFolder || parentFolder.itemType !== 'folder') {
        return res.status(404).json({ message: 'Новая родительская папка не найдена или не является папкой.' });
      }
    }

    if (itemToMove._id.equals(newParentId)) {
      return res.status(400).json({ message: "Элемент не может быть перемещен в самого себя." });
    }

    if (itemToMove.parentId === newParentId || 
       (itemToMove.parentId && newParentId && itemToMove.parentId.equals(newParentId))) {
      return res.status(200).json({ 
        message: 'Новое расположение совпадает с текущим. Перемещение не требуется.',
        item: itemToMove 
      });
    }

    itemToMove.parentId = newParentId;
    await itemToMove.save();

    res.status(200).json({ message: `Элемент '${itemToMove.name}' успешно перемещен.`, item: itemToMove });
  } catch (error) {
    console.error('Ошибка при перемещении элемента коллекции:', error);
    res.status(500).json({ message: 'Ошибка сервера при перемещении элемента.', error: error.message });
  }
};

// Очистить висящие ссылки
const cleanupDanglingLinks = async (req, res) => {
  try {
    // Находим все exerciseLink элементы
    const exerciseLinks = await ExerciseCollectionItem.find({ 
      itemType: 'exerciseLink' 
    });

    let removedCount = 0;
    const errors = [];

    // Проверяем каждую ссылку
    for (const link of exerciseLinks) {
      try {
        const sessionExists = await SequencerSession.exists({ 
          _id: link.originalSessionId 
        });
        
        if (!sessionExists) {
          await ExerciseCollectionItem.findByIdAndDelete(link._id);
          removedCount++;
        }
      } catch (err) {
        errors.push(`Ошибка при проверке ссылки ${link._id}: ${err.message}`);
      }
    }

    res.json({ 
      message: `Очистка завершена. Удалено ${removedCount} висящих ссылок.`,
      removedCount,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Ошибка при очистке висящих ссылок:', error);
    res.status(500).json({ 
      message: 'Ошибка сервера при очистке висящих ссылок', 
      error: error.message 
    });
  }
};

// Обновить элемент
const updateItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { name, originalSessionNameCache } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ message: 'Неверный ID элемента.' });
    }

    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Имя элемента не может быть пустым.' });
    }

    const itemToUpdate = await ExerciseCollectionItem.findById(itemId);
    if (!itemToUpdate) {
      return res.status(404).json({ message: 'Элемент не найден.' });
    }

    itemToUpdate.name = name.trim();
    if (originalSessionNameCache) {
      itemToUpdate.originalSessionNameCache = originalSessionNameCache.trim();
    }

    await itemToUpdate.save();
    res.status(200).json({ 
      message: `Элемент успешно обновлен.`,
      item: itemToUpdate 
    });
  } catch (error) {
    console.error('Ошибка при обновлении элемента коллекции:', error);
    res.status(500).json({ message: 'Ошибка сервера при обновлении элемента.', error: error.message });
  }
};

module.exports = {
  getAllItems,
  createFolder,
  addExerciseLinks,
  deleteItem,
  updateFolderSettings,
  moveItem,
  cleanupDanglingLinks,
  updateItem
}; 