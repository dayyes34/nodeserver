// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const sequencerRoutes = require('./routes/sequencer');
const exerciseCollectionRoutes = require('./routes/exerciseCollection');
const predefinedKeysRoutes = require('./routes/predefinedKeys');
const userPurchasesRoutes = require('./routes/userPurchases');

const app = express();
const PORT = process.env.PORT || 5002;

// Логирование запросов
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  next();
});

// CORS configuration
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
const corsOptions = {
  origin: function (origin, callback) {
    console.log('Request origin:', origin);
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Connect to Database
connectDB();

// Routes
app.get('/', (req, res) => {
  res.send('Сервер секвенсора работает!');
});

app.use('/api/sequencer', sequencerRoutes);
app.use('/api/my-collection', exerciseCollectionRoutes);
app.use('/api/admin/predefined-keys', predefinedKeysRoutes);
app.use('/api', userPurchasesRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  console.error('Stack:', err.stack);
  
  if (err.message === 'Not allowed by CORS') {
    res.status(403).json({ 
      message: 'CORS Error: Origin not allowed',
      allowedOrigins 
    });
        } else {
    res.status(500).json({ 
      message: 'Что-то пошло не так!',
      error: err.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log('Разрешенные origins:', allowedOrigins);
});
