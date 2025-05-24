const mongoose = require('mongoose');

const sequencerSessionSchema = new mongoose.Schema({
  sessionName: {
    type: String,
    required: true,
    trim: true
  },
  folderName: {
    type: String,
    trim: true,
    default: null
  },
  lastReturnPath: {
    type: String,
    trim: true,
    default: null
  },
  version: String,
  bpm: Number,
  trackNames: [String],
  currentSequencerStructure: mongoose.Schema.Types.Mixed,
  currentBars: mongoose.Schema.Types.Mixed,
  cellsState: mongoose.Schema.Types.Mixed,
  loopedBlockIndices: [Number],
  mutedTracks: [String],
  isMetronomeEnabled: Boolean,
  createdAt: {
    type: Date,
    default: Date.now
  },
  customFields: {
    type: [{
      key: { type: String, required: true, trim: true },
      value: { type: String, trim: true, default: '' }
    }],
    default: []
  }
});

module.exports = mongoose.model('SequencerSession', sequencerSessionSchema); 