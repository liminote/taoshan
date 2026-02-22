const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

// Map all previous "dirty" shades to the 7 allowed Labels & Accents
const colorMap = {
    '#90b9ca': '#9DBEDB',
    '#B0BCCC': '#9DBEDB',
    '#8FBDBA': '#E9ECEF',
    '#C4B8D8': '#BFACC8',
    '#D8E2DC': '#EDE9E1',
    '#C4B498': '#EDE9E1',
    '#FAE1DD': '#FCD5CE',
    '#FFD7D5': '#FFD7D5', // Keep
    '#FEC89A': '#FEC89A', // Keep
    '#BFACC8': '#BFACC8', // Keep
    '#FCD5CE': '#FCD5CE', // Keep
    '#EDE9E1': '#EDE9E1', // Keep
    '#E9ECEF': '#E9ECEF', // Keep
    '#9DBEDB': '#9DBEDB'  // Keep
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
            for (const [oldHex, newHex] of Object.entries(colorMap)) {
                // Ignore case and replace globally
                const reg = new RegExp(oldHex, 'gi');
                content = content.replace(reg, newHex);
            }

            // Also rewrite the chartColors array in ReportsContent.tsx
            // to loop strictly through the 7 allowed colors
            if (file === 'ReportsContent.tsx') {
                const arrRegex = /const chartColors = \[\s*['"]#[A-Fa-f0-9]{6}['"][\s\S]*?\]/m;
                if (arrRegex.test(content)) {
                    content = content.replace(arrRegex, `const chartColors = [
    '#9DBEDB', // 工作藍底
    '#EDE9E1', // 沙地米底
    '#FFD7D5', // 櫻花粉紅
    '#FCD5CE', // 柔霧水蜜桃
    '#BFACC8', // 薰衣草紫
    '#FEC89A', // 暖陽橘
    '#E9ECEF'  // 中性灰底
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
console.log('Clean Labels & Accents replacement complete.');
