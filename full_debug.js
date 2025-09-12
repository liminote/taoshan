const fetch = require('node-fetch');

async function fullDebugTest() {
  console.log('🔍 開始完整調試測試...\n');
  
  // 1. 載入商品主檔
  console.log('📋 載入商品主檔...');
  const masterResponse = await fetch('https://docs.google.com/spreadsheets/d/18iWZVRT8LB7I_WBNXGPl3WI8S3zEVq5ANq5yTj8Nzd8/export?format=csv&gid=909084406');
  const masterCsv = await masterResponse.text();
  const masterLines = masterCsv.split('\n').filter(line => line.trim());
  const masterHeaders = masterLines[0].split(',').map(h => h.replace(/"/g, '').trim());
  
  console.log(`📋 商品主檔標題: ${masterHeaders.join(' | ')}`);
  
  const oldNameIndex = masterHeaders.findIndex(h => h.includes('商品名稱') && !h.includes('新'));
  const newNameIndex = masterHeaders.findIndex(h => h.includes('新商品名稱'));
  const largeCategoryIndex = masterHeaders.findIndex(h => h === '大分類');
  const smallCategoryIndex = masterHeaders.findIndex(h => h === '小分類');
  
  console.log(`📋 欄位索引: 商品名稱=${oldNameIndex}, 新商品名稱=${newNameIndex}, 大分類=${largeCategoryIndex}, 小分類=${smallCategoryIndex}`);
  
  // 建立商品分類映射
  const categoryMap = new Map();
  let asahiCount = 0;
  
  if ((oldNameIndex !== -1 || newNameIndex !== -1) && largeCategoryIndex !== -1 && smallCategoryIndex !== -1) {
    masterLines.slice(1).forEach((line, index) => {
      const values = line.split(',').map(v => v.replace(/"/g, '').trim());
      const oldProductName = oldNameIndex !== -1 ? values[oldNameIndex] : '';
      const newProductName = newNameIndex !== -1 ? values[newNameIndex] : '';
      const largeCategory = values[largeCategoryIndex];
      const smallCategory = values[smallCategoryIndex];
      
      // 建立映射
      if (oldProductName && largeCategory && smallCategory) {
        categoryMap.set(oldProductName, {
          large: largeCategory,
          small: smallCategory
        });
        
        if (oldProductName.includes('Asahi')) {
          asahiCount++;
          console.log(`🍺 找到 Asahi 產品 #${asahiCount}: "${oldProductName}" → ${largeCategory}/${smallCategory}`);
        }
      }
      
      if (newProductName && newProductName !== oldProductName && largeCategory && smallCategory) {
        categoryMap.set(newProductName, {
          large: largeCategory,
          small: smallCategory
        });
        
        if (newProductName.includes('Asahi')) {
          asahiCount++;
          console.log(`🍺 找到 Asahi 產品 (新名稱) #${asahiCount}: "${newProductName}" → ${largeCategory}/${smallCategory}`);
        }
      }
    });
  }
  
  console.log(`\n📊 商品分類映射載入完成: ${categoryMap.size} 個產品，其中 ${asahiCount} 個 Asahi 產品\n`);
  
  // 2. 載入訂單資料
  console.log('📥 載入訂單資料...');
  const orderResponse = await fetch('https://docs.google.com/spreadsheets/d/1EWPECWQp_Ehz43Lfks_I8lcvEig8gV9DjyjEIzC5EO4/export?format=csv&gid=0');
  const orderCsv = await orderResponse.text();
  const orderLines = orderCsv.split('\n').filter(line => line.trim());
  const orderHeaders = orderLines[0].split(',').map(h => h.replace(/"/g, '').trim());
  
  const checkoutTimeIndex = orderHeaders.findIndex(h => h.includes('結帳時間'));
  const checkoutAmountIndex = orderHeaders.findIndex(h => h.includes('結帳金額'));
  const customerNameIndex = orderHeaders.findIndex(h => h.includes('顧客姓名'));
  const customerPhoneIndex = orderHeaders.findIndex(h => h.includes('顧客電話'));
  const itemsIndex = orderHeaders.findIndex(h => h.includes('品項'));
  
  console.log(`📋 訂單欄位索引: 結帳時間=${checkoutTimeIndex}, 金額=${checkoutAmountIndex}, 姓名=${customerNameIndex}, 電話=${customerPhoneIndex}, 品項=${itemsIndex}`);
  
  // 3. 找到吳先生的2025-09訂單
  const wuOrders = [];
  orderLines.slice(1).forEach((line, index) => {
    const values = line.split(',').map(v => v.replace(/"/g, '').trim());
    const phone = values[customerPhoneIndex] || '';
    const name = values[customerNameIndex] || '';
    const checkoutTime = values[checkoutTimeIndex] || '';
    const items = values[itemsIndex] || '';
    
    if (phone === '988202618' || name === '吳先生') {
      const dateStr = checkoutTime.replace(/\//g, '-');
      const date = new Date(dateStr);
      
      if (!isNaN(date.getTime())) {
        const orderMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (orderMonth === '2025-09') {
          wuOrders.push({
            phone,
            name,
            checkoutTime,
            items,
            date
          });
        }
      }
    }
  });
  
  console.log(`\n🎯 找到吳先生在 2025-09 的 ${wuOrders.length} 筆訂單:\n`);
  
  // 4. 分析每筆訂單的酒類檢測
  function isAlcoholProduct(productName, categoryMap) {
    const exactMatch = categoryMap.get(productName);
    if (exactMatch) {
      const isAlcohol = exactMatch.large === '6酒水' && (
        exactMatch.small === '東洋酒' || 
        exactMatch.small === '西洋酒' || 
        exactMatch.small === '啤酒'
      );
      return { match: true, isAlcohol, category: exactMatch };
    }
    return { match: false, isAlcohol: false };
  }
  
  let totalAlcoholFound = 0;
  
  wuOrders.forEach((order, orderIndex) => {
    console.log(`\n--- 訂單 ${orderIndex + 1} ---`);
    console.log(`📅 時間: ${order.checkoutTime}`);
    console.log(`📞 電話: ${order.phone}`);
    console.log(`👤 姓名: ${order.name}`);
    
    if (order.items) {
      const itemNames = order.items.split(',').map(item => {
        const trimmed = item.trim();
        const priceIndex = trimmed.lastIndexOf(' $');
        return priceIndex !== -1 ? trimmed.substring(0, priceIndex).trim() : trimmed;
      });
      
      console.log(`🛒 品項數量: ${itemNames.length}`);
      
      itemNames.forEach((itemName, itemIndex) => {
        if (itemName.includes('Asahi')) {
          const detection = isAlcoholProduct(itemName, categoryMap);
          console.log(`🍺 品項 ${itemIndex + 1}: "${itemName}"`);
          console.log(`   檢測結果: 匹配=${detection.match}, 是酒類=${detection.isAlcohol}`);
          if (detection.category) {
            console.log(`   分類: ${detection.category.large}/${detection.category.small}`);
          }
          if (detection.isAlcohol) totalAlcoholFound++;
        }
      });
    }
  });
  
  console.log(`\n🍺 總結: 在吳先生的 2025-09 訂單中找到 ${totalAlcoholFound} 個酒類產品`);
  console.log(`${totalAlcoholFound > 0 ? '✅ 應該顯示 hasAlcohol: true' : '❌ 沒有酒類產品'}`);
}

// 使用 IIFE 來支援 top-level await
(async () => {
  try {
    await fullDebugTest();
  } catch (error) {
    console.error('❌ 測試失敗:', error);
  }
})();