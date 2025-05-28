const BundleCollection = require('../models/BundleCollection');
const ExerciseCollectionItem = require('../models/ExerciseCollectionItem');

// Получить все активные коллекции с количеством бандлов
const getAllCollections = async (req, res) => {
  try {
    const collections = await BundleCollection.find({ isActive: true })
      .sort({ order: 1, name: 1 });

    // Для каждой коллекции получаем количество бандлов
    const collectionsWithCounts = await Promise.all(
      collections.map(async (collection) => {
        const bundleCount = await ExerciseCollectionItem.countDocuments({
          collectionId: collection._id,
          isBundle: true
        });

        return {
          _id: collection._id,
          name: collection.name,
          description: collection.description,
          icon: collection.icon,
          color: collection.color,
          order: collection.order,
          collectionPrice: collection.collectionPrice,
          collectionCurrency: collection.collectionCurrency,
          bundleCount,
          createdAt: collection.createdAt,
          updatedAt: collection.updatedAt
        };
      })
    );

    res.status(200).json(collectionsWithCounts);
  } catch (error) {
    console.error('Ошибка при получении коллекций:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера при получении коллекций.' });
  }
};

// Получить бандлы определенной коллекции
const getBundlesByCollection = async (req, res) => {
  try {
    const { collectionId } = req.params;

    if (!collectionId) {
      return res.status(400).json({ message: 'ID коллекции не предоставлен.' });
    }

    // Проверяем, существует ли коллекция
    const collection = await BundleCollection.findById(collectionId);
    if (!collection) {
      return res.status(404).json({ message: 'Коллекция не найдена.' });
    }

    // Получаем бандлы этой коллекции с сортировкой по collectionOrder, затем по имени
    const bundles = await ExerciseCollectionItem.find({
      collectionId: collectionId,
      isBundle: true
    }).sort({ collectionOrder: 1, name: 1 });

    const bundlesData = bundles.map(bundle => ({
      id: bundle._id,
      name: bundle.name,
      description: bundle.bundleDescription || 'Нет описания.',
      price: bundle.bundlePrice,
      currency: bundle.bundleCurrency,
      collectionOrder: bundle.collectionOrder,
      createdAt: bundle.createdAt
    }));

    res.status(200).json({
      collection: {
        _id: collection._id,
        name: collection.name,
        description: collection.description,
        icon: collection.icon,
        color: collection.color
      },
      bundles: bundlesData
    });
  } catch (error) {
    console.error('Ошибка при получении бандлов коллекции:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера при получении бандлов коллекции.' });
  }
};

// Создать новую коллекцию
const createCollection = async (req, res) => {
  try {
    const { name, description, icon, color, order, collectionPrice, collectionCurrency } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Название коллекции обязательно.' });
    }

    // Валидация цены и валюты
    let price = null;
    let currency = null;
    
    if (collectionPrice !== undefined && collectionPrice !== null) {
      const parsedPrice = parseFloat(collectionPrice);
      if (!isNaN(parsedPrice) && parsedPrice >= 0) {
        price = parsedPrice;
        
        if (!collectionCurrency || typeof collectionCurrency !== 'string' || collectionCurrency.trim().length !== 3) {
          return res.status(400).json({ 
            message: 'collectionCurrency (3-х буквенный код) обязателен, если указана цена коллекции.' 
          });
        }
        currency = collectionCurrency.trim().toUpperCase();
      } else {
        return res.status(400).json({ message: 'collectionPrice должен быть неотрицательным числом.' });
      }
    }

    const newCollection = new BundleCollection({
      name: name.trim(),
      description: description ? description.trim() : '',
      icon: icon || '📚',
      color: color || '#00AFFF',
      order: order || 0,
      collectionPrice: price,
      collectionCurrency: currency
    });

    const savedCollection = await newCollection.save();
    res.status(201).json(savedCollection);
  } catch (error) {
    console.error('Ошибка при создании коллекции:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера при создании коллекции.' });
  }
};

// Обновить коллекцию
const updateCollection = async (req, res) => {
  try {
    const { collectionId } = req.params;
    const { name, description, icon, color, order, isActive, collectionPrice, collectionCurrency } = req.body;

    if (!collectionId) {
      return res.status(400).json({ message: 'ID коллекции не предоставлен.' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (icon !== undefined) updateData.icon = icon;
    if (color !== undefined) updateData.color = color;
    if (order !== undefined) updateData.order = order;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Обработка цены и валюты коллекции
    if (collectionPrice !== undefined) {
      if (collectionPrice === null) {
        updateData.collectionPrice = null;
        updateData.collectionCurrency = null;
      } else {
        const parsedPrice = parseFloat(collectionPrice);
        if (!isNaN(parsedPrice) && parsedPrice >= 0) {
          updateData.collectionPrice = parsedPrice;
          
          if (!collectionCurrency || typeof collectionCurrency !== 'string' || collectionCurrency.trim().length !== 3) {
            return res.status(400).json({ 
              message: 'collectionCurrency (3-х буквенный код) обязателен, если указана цена коллекции.' 
            });
          }
          updateData.collectionCurrency = collectionCurrency.trim().toUpperCase();
        } else {
          return res.status(400).json({ message: 'collectionPrice должен быть неотрицательным числом.' });
        }
      }
    }

    updateData.updatedAt = new Date();

    const updatedCollection = await BundleCollection.findByIdAndUpdate(
      collectionId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedCollection) {
      return res.status(404).json({ message: 'Коллекция не найдена.' });
    }

    res.status(200).json(updatedCollection);
  } catch (error) {
    console.error('Ошибка при обновлении коллекции:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера при обновлении коллекции.' });
  }
};

// Удалить коллекцию
const deleteCollection = async (req, res) => {
  try {
    const { collectionId } = req.params;

    if (!collectionId) {
      return res.status(400).json({ message: 'ID коллекции не предоставлен.' });
    }

    // Проверяем, есть ли бандлы в этой коллекции
    const bundleCount = await ExerciseCollectionItem.countDocuments({
      collectionId: collectionId,
      isBundle: true
    });

    if (bundleCount > 0) {
      return res.status(400).json({ 
        message: `Нельзя удалить коллекцию, в которой есть бандлы (${bundleCount} шт.). Сначала переместите или удалите бандлы.` 
      });
    }

    const deletedCollection = await BundleCollection.findByIdAndDelete(collectionId);

    if (!deletedCollection) {
      return res.status(404).json({ message: 'Коллекция не найдена.' });
    }

    res.status(200).json({ message: 'Коллекция успешно удалена.' });
  } catch (error) {
    console.error('Ошибка при удалении коллекции:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера при удалении коллекции.' });
  }
};

// Назначить бандл в коллекцию
const assignBundleToCollection = async (req, res) => {
  try {
    const { bundleId, collectionId } = req.body;

    if (!bundleId) {
      return res.status(400).json({ message: 'ID бандла не предоставлен.' });
    }

    // Проверяем, что бандл существует
    const bundle = await ExerciseCollectionItem.findById(bundleId);
    if (!bundle) {
      return res.status(404).json({ message: 'Бандл не найден.' });
    }

    if (!bundle.isBundle) {
      return res.status(400).json({ message: 'Указанный элемент не является бандлом.' });
    }

    // Если collectionId указан, проверяем, что коллекция существует
    if (collectionId) {
      const collection = await BundleCollection.findById(collectionId);
      if (!collection) {
        return res.status(404).json({ message: 'Коллекция не найдена.' });
      }
    }

    // Обновляем бандл
    bundle.collectionId = collectionId || null;
    await bundle.save();

    res.status(200).json({ 
      message: collectionId ? 'Бандл успешно назначен в коллекцию.' : 'Бандл успешно удален из коллекции.',
      bundle: {
        id: bundle._id,
        name: bundle.name,
        collectionId: bundle.collectionId
      }
    });
  } catch (error) {
    console.error('Ошибка при назначении бандла в коллекцию:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера при назначении бандла в коллекцию.' });
  }
};

// Получить детали коллекции для платежной системы
const getCollectionDetails = async (req, res) => {
  try {
    const { collectionId } = req.params;
    
    if (!collectionId) {
      return res.status(400).json({ message: 'ID коллекции не предоставлен.' });
    }

    const collection = await BundleCollection.findById(collectionId);
    
    if (!collection) {
      return res.status(404).json({ message: 'Коллекция не найдена.' });
    }

    if (!collection.isActive) {
      return res.status(400).json({ message: 'Коллекция неактивна.' });
    }

    if (!collection.collectionPrice) {
      return res.status(400).json({ message: 'У коллекции не установлена цена.' });
    }

    // Конвертируем цену в наименьшие единицы валюты
    // collectionPrice в базе хранится в основных единицах (рубли, доллары)
    // Telegram API ожидает цену в наименьших единицах (копейки, центы)
    const priceInSmallestUnit = Math.round(collection.collectionPrice * 100);

    // Формируем ответ в формате, ожидаемом telegram сервером
    const collectionDetails = {
      id: collection._id,
      title: collection.name,
      description: collection.description || '',
      price_in_smallest_unit: priceInSmallestUnit, // Цена в копейках/центах
      currency: collection.collectionCurrency || 'RUB',
      icon: collection.icon,
      color: collection.color
    };

    console.log(`Collection details for ${collectionId}: price ${collection.collectionPrice} ${collection.collectionCurrency} -> ${priceInSmallestUnit} smallest units`);
    res.status(200).json(collectionDetails);

  } catch (error) {
    console.error('Ошибка при получении деталей коллекции:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера при получении деталей коллекции.' });
  }
};

module.exports = {
  getAllCollections,
  getBundlesByCollection,
  createCollection,
  updateCollection,
  deleteCollection,
  assignBundleToCollection,
  getCollectionDetails
}; 