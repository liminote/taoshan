// 模擬實際的訂單品項解析
const orderItems = "牛舌 $279.0,比目魚握壽司/貫 $90.0,紅喉/生 $249.0,紅喉/生 $249.0,青武鯛（鸚哥魚） $90.0,Asahi生啤酒機 $149.0,虎蝦 $478.0,備註 $0.0,牛舌 $279.0,鹽烤土雞翅/隻 $159.0,溫泉空心菜 $159.0,日本秋刀魚/生 $249.0,日本秋刀魚/生 $249.0,紅喉/生 $249.0,加志魚 $90.0,鹽烤土雞翅/隻 $159.0,燕魚 $90.0,燕魚 $90.0,牛舌凍 $119.0,加志魚 $90.0,Asahi生啤酒機 $149.0,虎蝦 $478.0,圓鱈 $517.0,青武鯛（鸚哥魚） $90.0,鹽烤土雞翅/隻 $159.0,比目魚握壽司/貫 $90.0,比目魚握壽司/貫 $90.0,日本秋刀魚/生 $249.0,帕瑪森黑松露櫛瓜 $279.0,燕魚 $90.0,圓鱈 $517.0,圓鱈 $517.0,虎蝦 $478.0,鮭魚卵手卷 $159.0,Asahi生啤酒機 $149.0,Asahi生啤酒機 $149.0,比目魚握壽司/貫 $90.0,加志魚 $90.0";

// 解析品項字串，提取商品名稱（去除價格部分）
const itemNames = orderItems.split(',').map(item => {
  const trimmed = item.trim()
  const priceIndex = trimmed.lastIndexOf(' $')
  return priceIndex !== -1 ? trimmed.substring(0, priceIndex).trim() : trimmed
})

console.log('解析後的品項名稱:');
itemNames.forEach((name, index) => {
  if (name.includes('Asahi')) {
    console.log(`${index}: "${name}" (長度: ${name.length})`);
    // 檢查是否有不可見字符
    for (let i = 0; i < name.length; i++) {
      const charCode = name.charCodeAt(i);
      console.log(`  字符 ${i}: "${name[i]}" (${charCode})`);
    }
  }
})

// 模擬商品分類映射
const categoryMap = new Map([
  ['Asahi生啤酒機', { large: '6酒水', small: '啤酒' }],
  ['Asahi生啤酒', { large: '6酒水', small: '啤酒' }]
]);

function isAlcoholProduct(productName, categoryMap) {
  console.log(`🔍 檢查商品是否為酒類: "${productName}"`);
  
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
  
  return false;
}

// 檢查 Asahi 產品
const asahiItems = itemNames.filter(name => name.includes('Asahi'));
console.log(`\n找到 ${asahiItems.length} 個 Asahi 產品:`);
asahiItems.forEach(item => {
  const result = isAlcoholProduct(item, categoryMap);
  console.log(`結果: "${item}" -> ${result}`);
});