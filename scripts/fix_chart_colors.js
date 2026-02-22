const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

// Map bright hardcoded colors to Vanny Design System chart / semantic colors
const newColors = [
    '#90b9ca', // 品牌主藍灰
    '#FFD7D5', // 櫻花粉
    '#D8E2DC', // 薄荷灰
    '#B0BCCC', // 灰紫藍
    '#BFACC8', // 薰衣草紫
    '#8FBDBA', // 霧青綠
    '#FEC89A', // 暖陽橘
    '#C4B498', // 沙米色
    '#FAE1DD', // 淡粉
    '#EDE9E1', // 沙地米
    '#C4B8D8'  // 淺薰衣草
];

const colorReplacements = {
    '#90DBF4': '#90b9ca',
    '#E0BBE4': '#BFACC8',
    '#FFCFD2': '#FFD7D5',
    '#FFFACD': '#FEC89A',
    '#98F5E1': '#8FBDBA',
    '#A3C4F3': '#B0BCCC',
    '#CFBCF2': '#C4B8D8',
    '#A8E6CF': '#D8E2DC',
    '#FFE5CC': '#FCD5CE',
    '#B5E7A0': '#C4B498',
    '#D7A3D7': '#FAE1DD'
};

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let original = content;

            // Simple exact string replacements for hex colors
            for (const [oldHex, newHex] of Object.entries(colorReplacements)) {
                // To safely replace case-insensitive logic, we use RegExp with flag
                const reg = new RegExp(oldHex, 'gi');
                content = content.replace(reg, newHex);
            }

            // Also specifically rewrite the chartColors array in ReportsContent.tsx
            if (file === 'ReportsContent.tsx') {
                const arrRegex = /const chartColors = \[\s*['"]#[A-Fa-f0-9]{6}['"],?[^\]]*\]/m;
                if (arrRegex.test(content)) {
                    content = content.replace(arrRegex, `const chartColors = [
    '#90b9ca',
    '#FEC89A',
    '#B0BCCC',
    '#FFD7D5',
    '#BFACC8',
    '#8FBDBA',
    '#C4B498',
    '#FCD5CE',
    '#C4B8D8',
    '#D8E2DC',
    '#EDE9E1',
    '#FAE1DD'
  ]`);
                }
            }

            if (content !== original) {
                fs.writeFileSync(fullPath, content);
                console.log(`Updated colors in ${fullPath}`);
            }
        }
    }
}

walkDir(srcDir);
console.log('Class & Color replacement complete.');
