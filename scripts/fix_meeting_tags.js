const fs = require('fs');
const file = '../src/app/meeting-records/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// The meeting record tags were using secondary-100 and secondary-700. Let's make sure they are elegant light gray pills with dark text to not fight with standard chart colors
content = content.replace(/bg-secondary-100/g, 'bg-[#f4f4f5]'); // zinc-100
content = content.replace(/text-secondary-700/g, 'text-[#52525b] border border-[#e4e4e7]'); // zinc-600 with border

fs.writeFileSync(file, content);
console.log('Meeting tags fixed.');
