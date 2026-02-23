const fs = require('fs');
const file = '../src/components/ReportsContent.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix amount
content = content.replace(/<div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FCD5CE' }}>([\s\S]*?)generateBarChart\(salesData, 'amount', 200, '#FEC89A'\)/, 
`<div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FEC89A' }}>$1generateBarChart(salesData, 'amount', 200, '#FEC89A')`);

// Fix order count
content = content.replace(/<div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#9DBEDB' }}>([\s\S]*?)generateBarChart\(salesData, 'orderCount', 200, '#FFD7D5'\)/, 
`<div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FFD7D5' }}>$1generateBarChart(salesData, 'orderCount', 200, '#FFD7D5')`);

// Fix avg order value  
content = content.replace(/<div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FFD7D5' }}>([\s\S]*?)generateBarChart\(salesData, 'avgOrderValue', 200, '#9DBEDB'\)/, 
`<div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#9DBEDB' }}>$1generateBarChart(salesData, 'avgOrderValue', 200, '#9DBEDB')`);

// Fix discount
content = content.replace(/<div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FEC89A' }}>([\s\S]*?)generateBarChart\(discountData, 'discountAmount', 200, '#FCD5CE'\)/, 
`<div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FCD5CE' }}>$1generateBarChart(discountData, 'discountAmount', 200, '#FCD5CE')`);

// Fix item count
content = content.replace(/<div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#E9ECEF' }}>([\s\S]*?)generateBarChart\(salesData, 'productItemCount', 200, '#BFACC8'\)/, 
`<div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#BFACC8' }}>$1generateBarChart(salesData, 'productItemCount', 200, '#BFACC8')`);

fs.writeFileSync(file, content);
