const mongoose = require('mongoose');

const sequencerSessionSchema = new mongoose.Schema({
  sessionName: { type: String, required: true },
  folderName: { type: String, default: null }, // Для удобства отображения полного пути, если нужно
  bpm: { type: Number, required: true },
  trackNames: { type: [String], required: true },
  currentSequencerStructure: { type: mongoose.Schema.Types.Mixed, required: true },
  currentBars: { type: mongoose.Schema.Types.Mixed, required: true },
  cellsState: { type: mongoose.Schema.Types.Mixed, required: true },
  loopedBlockIndices: { type: [Number], default: [] },
  mutedTracks: { type: [String], default: [] },
  isMetronomeEnabled: { type: Boolean, default: false },
  version: { type: String, default: "1.0" },
  customFields: [{ // Остается здесь, так как это метаданные самой сессии
    key: String,
    value: String,
    _id: false
  }],
  parentId: { // <-- НОВОЕ ПОЛЕ
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExerciseCollectionItem', // Ссылка на папку в коллекции
    default: null // null означает, что сессия либо в корне коллекции, либо "сырая"
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SequencerSession', sequencerSessionSchema); 