const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let original = content;

      // Soften extremely harsh texts
      content = content.replace(/text-gray-900/g, 'text-[#2d3748]'); // softening harsh blacks
      content = content.replace(/text-gray-800/g, 'text-[#4a5568]'); // softening dark grays

      if (content !== original) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated text colors in ${fullPath}`);
      }
    }
  }
}

walkDir(srcDir);
console.log('Text color soften complete.');
