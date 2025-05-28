const express = require('express');
const router = express.Router();
const bundleCollectionController = require('../controllers/bundleCollectionController');

// Получить все активные коллекции
router.get('/', bundleCollectionController.getAllCollections);

// Получить детали коллекции для платежной системы
router.get('/:collectionId/details', bundleCollectionController.getCollectionDetails);

// Получить бандлы определенной коллекции
router.get('/:collectionId/bundles', bundleCollectionController.getBundlesByCollection);

// Создать новую коллекцию
router.post('/', bundleCollectionController.createCollection);

// Обновить коллекцию
router.put('/:collectionId', bundleCollectionController.updateCollection);

// Удалить коллекцию
router.delete('/:collectionId', bundleCollectionController.deleteCollection);

// Назначить бандл в коллекцию
router.post('/assign-bundle', bundleCollectionController.assignBundleToCollection);

module.exports = router; 