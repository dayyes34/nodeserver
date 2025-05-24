const ExerciseCollectionItem = require('../models/ExerciseCollectionItem');

// Получить детали бандла по ID
const getBundleDetails = async (req, res) => {
  try {
    const { bundleId } = req.params;
    
    if (!bundleId) {
      return res.status(400).json({ message: 'ID бандла не предоставлен.' });
    }

    const bundle = await ExerciseCollectionItem.findById(bundleId);
    
    if (!bundle) {
      return res.status(404).json({ message: 'Бандл не найден.' });
    }

    if (!bundle.isBundle) {
      return res.status(400).json({ message: 'Указанный элемент не является бандлом.' });
    }

    // Формируем ответ в формате, ожидаемом telegram сервером
    const bundleDetails = {
      id: bundle._id,
      title: bundle.name,
      description: bundle.bundleDescription || '',
      price_in_smallest_unit: bundle.bundlePrice || 0, // Цена в копейках/центах
      currency: bundle.bundleCurrency || 'RUB',
      // Дополнительные поля при необходимости
      // photo_url: bundle.photoUrl,
    };

    res.status(200).json(bundleDetails);

  } catch (error) {
    console.error('Ошибка при получении деталей бандла:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера при получении деталей бандла.' });
  }
};

module.exports = {
  getBundleDetails
}; 