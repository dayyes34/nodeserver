const express = require('express');
const router = express.Router();
const { 
  saveSession, 
  getSessionById, 
  updateSession, 
  updateSessionCustomFields,
  deleteSession,
  openSession
} = require('../controllers/sequencerController');

router.post('/save', saveSession);
router.get('/sessions/:id', getSessionById);
router.put('/sessions/:id', updateSession);
router.put('/sessions/:id/customfields', updateSessionCustomFields);
router.delete('/sessions/:id', deleteSession);
router.post('/sessions/:id/open', openSession);

module.exports = router; 