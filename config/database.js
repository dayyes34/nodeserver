const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI;
  
  if (!mongoURI) {
    console.error('Ошибка: MONGODB_URI не задана в переменных окружения.');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoURI);
    console.log('Успешное подключение к MongoDB');
  } catch (err) {
    console.error('Ошибка подключения к MongoDB:', err);
    process.exit(1);
  }
};

module.exports = connectDB; 