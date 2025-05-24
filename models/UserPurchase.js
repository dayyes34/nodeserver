const mongoose = require('mongoose');

const userPurchaseSchema = new mongoose.Schema({
  telegramUserId: {
    type: Number,
    required: true,
    index: true,
  },
  bundleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExerciseCollectionItem',
    required: true,
    index: true,
  },
  purchaseDate: {
    type: Date,
    default: Date.now,
  },
  telegramPaymentChargeId: {
    type: String,
    index: true,
    sparse: true,
  },
  providerPaymentChargeId: {
    type: String,
    index: true,
    sparse: true,
  }
});

userPurchaseSchema.index({ telegramUserId: 1, bundleId: 1 }, { unique: true });

module.exports = mongoose.model('UserPurchase', userPurchaseSchema); 