// 測試具體的 Asahi生啤酒機 檢測
function isAlcoholProduct(productName, categoryMap) {
  console.log(`🔍 檢查商品是否為酒類: "${productName}"`);
  
  // 清理商品名稱，移除規格信息
  const cleanProductName = productName.replace(/\s*\d+ml\s*/g, '').replace(/\s*\/\s*/g, ' ').trim();
  console.log(`🧽 清理後的商品名稱: "${cleanProductName}"`);
  
  // 直接匹配 - 原始名稱
  let exactMatch = categoryMap.get(productName);
  if (exactMatch) {
    const isAlcohol = exactMatch.large === '6酒水' && (
      exactMatch.small === '東洋酒' || 
      exactMatch.small === '西洋酒' || 
      exactMatch.small === '啤酒'
    );
    console.log(`✅ 直接匹配成功(原始): ${productName} → 大分類:${exactMatch.large}, 小分類:${exactMatch.small}, 是酒類:${isAlcohol}`);
    if (isAlcohol) return true;
  }
  
  // 直接匹配 - 清理後名稱
  exactMatch = categoryMap.get(cleanProductName);
  if (exactMatch) {
    const isAlcohol = exactMatch.large === '6酒水' && (
      exactMatch.small === '東洋酒' || 
      exactMatch.small === '西洋酒' || 
      exactMatch.small === '啤酒'
    );
    console.log(`✅ 直接匹配成功(清理): ${cleanProductName} → 大分類:${exactMatch.large}, 小分類:${exactMatch.small}, 是酒類:${isAlcohol}`);
    if (isAlcohol) return true;
  }
  
  // 部分匹配
  console.log(`🔍 嘗試部分匹配...`);
  for (const [masterProductName, category] of categoryMap.entries()) {
    const isAlcoholCategory = category.large === '6酒水' && (
      category.small === '東洋酒' || 
      category.small === '西洋酒' || 
      category.small === '啤酒'
    );
    
    if (!isAlcoholCategory) continue;
    
    const originalMatch = productName.includes(masterProductName) || masterProductName.includes(productName);
    const cleanMatch = cleanProductName.includes(masterProductName) || masterProductName.includes(cleanProductName);
    
    if (originalMatch || cleanMatch) {
      console.log(`✅ 部分匹配成功: "${productName}" ↔ "${masterProductName}" → 大分類:${category.large}, 小分類:${category.small}`);
      return true;
    }
  }
  
  console.log(`❌ 無匹配: "${productName}" (清理後: "${cleanProductName}") 不是酒類商品`);
  return false;
}

// 建立測試用的商品分類映射
const categoryMap = new Map([
  ['Asahi生啤酒機', { large: '6酒水', small: '啤酒' }],
  ['Asahi生啤酒', { large: '6酒水', small: '啤酒' }]
]);

console.log('商品主檔內容:');
categoryMap.forEach((category, name) => {
  console.log(`  ${name} → ${category.large}/${category.small}`);
});
console.log('\n');

// 測試 Asahi生啤酒機
const result = isAlcoholProduct('Asahi生啤酒機', categoryMap);
console.log(`\n最終結果: Asahi生啤酒機 -> ${result}`);