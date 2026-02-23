const fs = require('fs');
const file = '../src/components/ReportsContent.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fixing amount to a vibrant orange
content = content.replace(/{ backgroundColor: '#9DBEDB' }(.*?)generateBarChart\(salesData, 'amount', 200, '#9DBEDB'\)/s, `{ backgroundColor: '#FEC89A' }$1generateBarChart(salesData, 'amount', 200, '#FEC89A')`);

// Fixing order count
content = content.replace(/{ backgroundColor: '#BFACC8' }(.*?)generateBarChart\(salesData, 'orderCount', 200, '#BFACC8'\)/s, `{ backgroundColor: '#FFD7D5' }$1generateBarChart(salesData, 'orderCount', 200, '#FFD7D5')`);

// Fixing avg value
content = content.replace(/{ backgroundColor: '#FFD7D5' }(.*?)generateBarChart\(salesData, 'avgOrderValue', 200, '#FFD7D5'\)/s, `{ backgroundColor: '#9DBEDB' }$1generateBarChart(salesData, 'avgOrderValue', 200, '#9DBEDB')`);

// Fixing discount
content = content.replace(/{ backgroundColor: '#FEC89A' }(.*?)generateBarChart\(discountData, 'discountAmount', 200, '#FEC89A'\)/s, `{ backgroundColor: '#FCD5CE' }$1generateBarChart(discountData, 'discountAmount', 200, '#FCD5CE')`);

// Fixing item count
content = content.replace(/{ backgroundColor: '#E9ECEF' }(.*?)generateBarChart\(salesData, 'productItemCount', 200, '#E9ECEF'\)/s, `{ backgroundColor: '#BFACC8' }$1generateBarChart(salesData, 'productItemCount', 200, '#BFACC8')`);

fs.writeFileSync(file, content);
console.log('Fixed Trend Chart Bars');
