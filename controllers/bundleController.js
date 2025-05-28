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

    // Конвертируем цену в наименьшие единицы валюты
    // bundlePrice в базе хранится в основных единицах (рубли, доллары)
    // Telegram API ожидает цену в наименьших единицах (копейки, центы)
    const priceInSmallestUnit = bundle.bundlePrice ? Math.round(bundle.bundlePrice * 100) : 0;

    // Формируем URL изображения бандла
    const isDevelopment = process.env.NODE_ENV === 'development';
    // Принудительно используем HTTPS для совместимости с мобильными клиентами Telegram
    const baseUrl = 'https://rhythmcapsule.ru';
    const photoUrl = `${baseUrl}/images/base/${bundle._id}.jpg`; // Предполагаем, что изображения в формате jpg

    // Формируем ответ в формате, ожидаемом telegram сервером
    const bundleDetails = {
      id: bundle._id,
      title: bundle.name,
      description: bundle.bundleDescription || '',
      price_in_smallest_unit: priceInSmallestUnit, // Цена в копейках/центах
      currency: bundle.bundleCurrency || 'RUB',
      photo_url: photoUrl, // URL изображения для инвойса
    };

    console.log(`Bundle details for ${bundleId}: price ${bundle.bundlePrice} ${bundle.bundleCurrency} -> ${priceInSmallestUnit} smallest units`);
    res.status(200).json(bundleDetails);

  } catch (error) {
    console.error('Ошибка при получении деталей бандла:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера при получении деталей бандла.' });
  }
};

module.exports = {
  getBundleDetails
}; 