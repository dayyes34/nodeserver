const mongoose = require('mongoose');

const bundleCollectionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  icon: {
    type: String,
    trim: true,
    default: '📚' // Эмодзи по умолчанию для коллекции
  },
  color: {
    type: String,
    trim: true,
    default: '#00AFFF' // Цвет по умолчанию
  },
  order: {
    type: Number,
    default: 0 // Для сортировки коллекций
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Индекс для быстрого поиска активных коллекций
bundleCollectionSchema.index({ isActive: 1, order: 1 });

// Middleware для обновления updatedAt
bundleCollectionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('BundleCollection', bundleCollectionSchema); 