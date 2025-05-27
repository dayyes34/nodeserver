const mongoose = require('mongoose');

const exerciseCollectionItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  itemType: {
    type: String,
    required: true,
    enum: ['folder', 'exerciseLink']
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExerciseCollectionItem',
    default: null
  },
  originalSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SequencerSession',
    default: null
  },
  originalSessionNameCache: {
    type: String,
    trim: true,
    default: ''
  },
  isBundle: {
    type: Boolean,
    default: false 
  },
  bundleDescription: {
    type: String,
    trim: true,
    default: '' 
  },
  bundlePrice: {
    type: Number,
    default: null
  },
  bundleCurrency: {
    type: String,
    trim: true,
    uppercase: true,
    default: null
  },
  collectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BundleCollection',
    default: null
  },
  collectionOrder: {
    type: Number,
    default: 0 // Порядок отображения внутри коллекции
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

exerciseCollectionItemSchema.index({ parentId: 1, itemType: 1, name: 1 });
exerciseCollectionItemSchema.index({ collectionId: 1, isBundle: 1 });
exerciseCollectionItemSchema.index({ collectionId: 1, collectionOrder: 1 });

module.exports = mongoose.model('ExerciseCollectionItem', exerciseCollectionItemSchema); 