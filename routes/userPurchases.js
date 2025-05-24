const express = require('express');
const router = express.Router();
const {
  getBundleDetails,
  grantBundleAccess,
  getUserPurchases
} = require('../controllers/userPurchaseController');

// Получить детали бандла для платежной системы
router.get('/bundles/:bundleId/details', getBundleDetails);

// Предоставить доступ к бандлу
router.post('/users/:telegramUserId/grant-bundle-access', grantBundleAccess);

// Получить список покупок пользователя
router.get('/users/:telegramUserId/my-purchases', getUserPurchases);

module.exports = router; 