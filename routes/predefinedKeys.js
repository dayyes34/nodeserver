const express = require('express');
const router = express.Router();
const {
  getAllKeys,
  createKey,
  deleteKey,
  updateKey
} = require('../controllers/predefinedKeyController');

// Получить все предопределенные ключи
router.get('/', getAllKeys);

// Создать новый предопределенный ключ
router.post('/', createKey);

// Удалить предопределенный ключ
router.delete('/:id', deleteKey);

// Обновить предопределенный ключ
router.put('/:id', updateKey);

module.exports = router; 