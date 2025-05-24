const express = require('express');
const router = express.Router();
const bundleController = require('../controllers/bundleController');

// Получить детали бандла по ID
router.get('/:bundleId/details', bundleController.getBundleDetails);

module.exports = router; 