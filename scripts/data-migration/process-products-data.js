// 處理商品資料的工具程式
const fs = require('fs')

// 原始商品資料
const rawData = `商品名稱	新商品名	大分類	小分類
(必點)極品十貫壽司	(必點)極品十貫壽司-	1壽司刺身	手卷/壽司（菜單）
(推薦)炙燒比目魚鰭邊握壽司/2貫	(推薦)炙燒比目魚鰭邊握壽司/2貫-	1壽司刺身	手卷/壽司（菜單）
(推薦)炙燒比目魚鰭邊握壽司/2貫*	(推薦)炙燒比目魚鰭邊握壽司/2貫-	1壽司刺身	手卷/壽司（菜單）
(推薦)炙燒焦糖鮭魚握壽司/2貫	(推薦)炙燒焦糖鮭魚握壽司/2貫-	1壽司刺身	手卷/壽司（菜單）
九州青干/貫	九州青干/貫-	1壽司刺身	手卷/壽司（菜單）
九州青干握壽司/2貫	九州青干握壽司/2貫-	1壽司刺身	手卷/壽司（菜單）
干貝蟹膏握壽司	干貝蟹膏握壽司-	1壽司刺身	手卷/壽司（菜單）
天使蝦/隻	天使蝦/隻-	1壽司刺身	手卷/壽司（菜單）
手卷(招待)	手卷(招待)-	1壽司刺身	手卷/壽司（菜單）
比目魚握壽司/貫	比目魚握壽司/貫-	1壽司刺身	手卷/壽司（菜單）
北海道干貝/貫	北海道干貝/貫-	1壽司刺身	手卷/壽司（菜單）
北海道海膽	北海道海膽/貫-	1壽司刺身	手卷/壽司（菜單）
北海道海膽/貫	北海道海膽/貫-	1壽司刺身	手卷/壽司（菜單）
北海道海膽手卷	北海道海膽手卷-	1壽司刺身	手卷/壽司（菜單）
北海道海膽手卷/支	北海道海膽手卷-	1壽司刺身	手卷/壽司（菜單）
本港紅甘/貫	本港紅甘/貫-	1壽司刺身	手卷/壽司（菜單）
本港紅甘握壽司/2貫	本港紅甘握壽司/2貫-	1壽司刺身	手卷/壽司（菜單）
本港紅甘握壽司/2貫*	本港紅甘握壽司/2貫-	1壽司刺身	手卷/壽司（菜單）
生魚片蛋糕	生魚片蛋糕-	1壽司刺身	手卷/壽司（菜單）
松葉蟹握壽司	松葉蟹握壽司-	1壽司刺身	手卷/壽司（菜單）`

// 這裡會包含所有您提供的商品資料...

function parseProductsData(rawData) {
  const lines = rawData.trim().split('\n')
  const products = []
  
  // 跳過標題行
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    const cols = line.split('\t')
    if (cols.length >= 4) {
      products.push({
        originalName: cols[0].trim(),
        newName: cols[1].trim(),
        categoryName: cols[2].trim(),
        subcategoryName: cols[3].trim()
      })
    }
  }
  
  return products
}

// 生成 TypeScript 陣列格式
function generateTSArray(products) {
  let output = 'const productsData = [\n'
  
  products.forEach((product, index) => {
    output += `  {originalName: "${product.originalName.replace(/"/g, '\\"')}", newName: "${product.newName.replace(/"/g, '\\"')}", categoryName: "${product.categoryName}", subcategoryName: "${product.subcategoryName}"}${index < products.length - 1 ? ',' : ''}\n`
  })
  
  output += ']'
  return output
}

// 處理資料
const products = parseProductsData(rawData)
const tsArray = generateTSArray(products)

console.log('處理完成，共', products.length, '筆資料')
console.log('生成的 TypeScript 陣列:')
console.log(tsArray)

// 寫入檔案
fs.writeFileSync('products-data.ts', tsArray)
console.log('已寫入 products-data.ts')