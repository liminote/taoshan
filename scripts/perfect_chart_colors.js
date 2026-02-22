const fs = require('fs');
const file = '../src/components/ReportsContent.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/const chartColors = \[\s*['"]#[A-Fa-f0-9]{6}['"][\s\S]*?\]/m, `const chartColors = [
    '#FEC89A', // 暖陽橘 (最舒適的大面積底色)
    '#EDE9E1', // 沙地米底 (極其輕透的次大面積)
    '#9DBEDB', // 工作藍底 (核心品牌色，放第三位收斂視覺)
    '#FFD7D5', // 櫻花粉紅 (活潑的點綴)
    '#E9ECEF', // 中性灰底 (平衡用空氣感)
    '#BFACC8', // 薰衣草紫 (冷色調次要強調)
    '#FCD5CE'  // 柔霧水蜜桃 (暖色調收尾)
  ]`);

// Replace row highlight to exact VDS card background #F5F5F7 or #F2F4F8
content = content.replace(/bg-primary-50/g, 'bg-[#F5F5F7]');

// Neutralize the extremely bright tags to elegant VDS gray borders
content = content.replace(/text-success-600 bg-success-100/g, 'text-gray-600 bg-gray-100 border border-gray-200');
content = content.replace(/text-secondary-700 bg-secondary-100/g, 'text-gray-600 bg-gray-100 border border-gray-200');
content = content.replace(/text-warning-700 bg-warning-100/g, 'text-gray-600 bg-gray-100 border border-gray-200');

fs.writeFileSync(file, content);
console.log('Colors perfected.');
