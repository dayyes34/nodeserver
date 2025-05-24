const express = require('express');
const router = express.Router();
const {
  getAllItems,
  createFolder,
  addExerciseLinks,
  deleteItem,
  updateFolderSettings,
  moveItem,
  cleanupDanglingLinks,
  updateItem
} = require('../controllers/exerciseCollectionController');

// Получить все элементы коллекции
router.get('/', getAllItems);

// Создать новую папку
router.post('/folder', createFolder);

// Добавить ссылки на упражнения
router.post('/links', addExerciseLinks);
router.post('/add-exercise-links', addExerciseLinks); // Алиас для совместимости

// Удалить элемент
router.delete('/item/:itemId', deleteItem);

// Обновить настройки папки
router.put('/folder/:folderId/settings', updateFolderSettings);

// Переместить элемент
router.put('/item/:itemId/move', moveItem);

// Обновить элемент
router.put('/item/:itemId', updateItem);

// Очистить висящие ссылки
router.post('/cleanup-dangling-links', cleanupDanglingLinks);

module.exports = router; 