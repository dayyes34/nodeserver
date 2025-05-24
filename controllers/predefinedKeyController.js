const PredefinedKey = require('../models/PredefinedKey');
const mongoose = require('mongoose');

// Получить все предопределенные ключи
const getAllKeys = async (req, res) => {
  try {
    const keys = await PredefinedKey.find().sort({ keyName: 1 });
    res.status(200).json(keys);
  } catch (error) {
    console.error('Ошибка при получении предопределенных ключей:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении предопределенных ключей', error: error.message });
  }
};

// Создать новый предопределенный ключ
const createKey = async (req, res) => {
  try {
    const { keyName } = req.body;
    
    if (!keyName || !keyName.trim()) {
      return res.status(400).json({ message: 'keyName является обязательным полем.' });
    }

    const existingKey = await PredefinedKey.findOne({ keyName: keyName.trim() });
    if (existingKey) {
      return res.status(400).json({ message: `Предопределенный ключ с именем (keyName) "${keyName}" уже существует.` });
    }

    const newKey = new PredefinedKey({
      keyName: keyName.trim(),
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
};

// Удалить предопределенный ключ
const deleteKey = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Неверный ID предопределенного ключа.' });
    }

    const result = await PredefinedKey.findByIdAndDelete(id);
    if (!result) {
      return res.status(404).json({ message: 'Предопределенный ключ не найден для удаления.' });
    }

    res.status(200).json({ message: `Предопределенный ключ '${result.keyName}' успешно удален.` });
  } catch (error) {
    console.error('Ошибка при удалении предопределенного ключа:', error);
    res.status(500).json({ message: 'Ошибка сервера при удалении предопределенного ключа', error: error.message });
  }
};

// Обновить предопределенный ключ
const updateKey = async (req, res) => {
  try {
    const { id } = req.params;
    const { keyName } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Неверный ID предопределенного ключа.' });
    }

    const updateData = {};
    if (keyName && keyName.trim()) {
      updateData.keyName = keyName.trim();
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'Нет данных для обновления (ожидается keyName).' });
    }

    const updatedKey = await PredefinedKey.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedKey) {
      return res.status(404).json({ message: 'Предопределенный ключ не найден для обновления.' });
    }
    res.status(200).json(updatedKey);
  } catch (error) {
    console.error('Ошибка при обновлении предопределенного ключа:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: `Предопределенный ключ с таким keyName уже существует.` });
    }
    res.status(500).json({ message: 'Ошибка сервера при обновлении предопределенного ключа', error: error.message });
  }
};

module.exports = {
  getAllKeys,
  createKey,
  deleteKey,
  updateKey
}; 