const mongoose = require('mongoose');
const BundleCollection = require('../models/BundleCollection');
const ExerciseCollectionItem = require('../models/ExerciseCollectionItem');

// Подключение к базе данных
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rhythmcapsule');
    console.log('MongoDB подключена');
  } catch (error) {
    console.error('Ошибка подключения к MongoDB:', error);
    process.exit(1);
  }
};

// Создание тестовых коллекций
const createTestCollections = async () => {
  try {
    // Проверяем, есть ли уже коллекции
    const existingCollections = await BundleCollection.find();
    if (existingCollections.length > 0) {
      console.log('Коллекции уже существуют:', existingCollections.map(c => c.name));
      return existingCollections;
    }

    const testCollections = [
      {
        name: 'Основы',
        description: 'Базовые упражнения для начинающих',
        icon: '🥁',
        color: '#00AFFF',
        order: 1
      },
      {
        name: 'Ритмы',
        description: 'Различные ритмические паттерны',
        icon: '🎵',
        color: '#32F9E5',
        order: 2
      },
      {
        name: 'Техника',
        description: 'Упражнения для развития техники',
        icon: '⚡',
        color: '#FDA20A',
        order: 3
      },
      {
        name: 'Джаз',
        description: 'Джазовые стандарты и импровизация',
        icon: '🎷',
        color: '#9B59B6',
        order: 4
      },
      {
        name: 'Рок',
        description: 'Рок-ритмы и грувы',
        icon: '🤘',
        color: '#E74C3C',
        order: 5
      }
    ];

    const createdCollections = await BundleCollection.insertMany(testCollections);
    console.log('Созданы тестовые коллекции:');
    createdCollections.forEach(collection => {
      console.log(`- ${collection.name} (${collection.icon})`);
    });

    return createdCollections;
  } catch (error) {
    console.error('Ошибка при создании коллекций:', error);
    return [];
  }
};

// Назначение бандлов в коллекции
const assignBundlesToCollections = async (collections) => {
  try {
    // Получаем все бандлы
    const bundles = await ExerciseCollectionItem.find({ 
      itemType: 'folder', 
      isBundle: true 
    });

    if (bundles.length === 0) {
      console.log('Нет бандлов для назначения в коллекции');
      return;
    }

    console.log(`Найдено ${bundles.length} бандлов для назначения в коллекции`);

    // Назначаем бандлы в коллекции по очереди
    let assignedCount = 0;
    for (let i = 0; i < bundles.length; i++) {
      const bundle = bundles[i];
      const collection = collections[i % collections.length]; // Циклически назначаем в коллекции
      
      // Обновляем бандл
      bundle.collectionId = collection._id;
      bundle.collectionOrder = Math.floor(i / collections.length); // Порядок внутри коллекции
      await bundle.save();
      
      console.log(`Бандл "${bundle.name}" назначен в коллекцию "${collection.name}" с порядком ${bundle.collectionOrder}`);
      assignedCount++;
    }

    console.log(`Успешно назначено ${assignedCount} бандлов в коллекции`);
  } catch (error) {
    console.error('Ошибка при назначении бандлов в коллекции:', error);
  }
};

// Запуск скрипта
const run = async () => {
  await connectDB();
  const collections = await createTestCollections();
  if (collections.length > 0) {
    await assignBundlesToCollections(collections);
  }
  await mongoose.disconnect();
  console.log('Скрипт завершен');
};

run(); 