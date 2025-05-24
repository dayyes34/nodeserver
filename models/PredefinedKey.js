const mongoose = require('mongoose');

const predefinedKeySchema = new mongoose.Schema({
  keyName: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('PredefinedKey', predefinedKeySchema); 