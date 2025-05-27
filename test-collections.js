// Простой тест API коллекций
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:5002/api';

async function testCollectionsAPI() {
  try {
    console.log('Тестирование API коллекций...');
    
    // Тест получения всех коллекций
    console.log('\n1. Получение всех коллекций:');
    const collectionsResponse = await fetch(`${API_BASE}/bundle-collections`);
    const collections = await collectionsResponse.json();
    console.log('Статус:', collectionsResponse.status);
    console.log('Коллекции:', collections);
    
    if (collections.length > 0) {
      const firstCollection = collections[0];
      console.log(`\n2. Получение бандлов коллекции "${firstCollection.name}":`)
      const bundlesResponse = await fetch(`${API_BASE}/bundle-collections/${firstCollection._id}/bundles`);
      const bundlesData = await bundlesResponse.json();
      console.log('Статус:', bundlesResponse.status);
      console.log('Данные:', bundlesData);
    }
    
    // Тест получения элементов коллекции
    console.log('\n3. Получение всех элементов коллекции:');
    const itemsResponse = await fetch(`${API_BASE}/my-collection`);
    const items = await itemsResponse.json();
    console.log('Статус:', itemsResponse.status);
    console.log('Количество элементов:', items.length);
    
    const bundles = items.filter(item => item.itemType === 'folder' && item.isBundle);
    console.log('Количество бандлов:', bundles.length);
    
    if (bundles.length > 0) {
      console.log('Первый бандл:', {
        name: bundles[0].name,
        collectionId: bundles[0].collectionId,
        collectionOrder: bundles[0].collectionOrder
      });
    }
    
  } catch (error) {
    console.error('Ошибка тестирования:', error.message);
  }
}

testCollectionsAPI(); 