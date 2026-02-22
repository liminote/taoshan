const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

// Map raw tailwind colors to our Vanny semantic aliases
const replacements = {
    'emerald': 'primary',
    'blue': 'secondary',
    'indigo': 'secondary',
    'purple': 'accent',
    'pink': 'accent',
    'red': 'error',
    'yellow': 'warning',
    'orange': 'warning',
    'amber': 'warning',
    // Exact hex matches found in SVG charts inside the codebase
    '#10b981': '#5E7182', // emerald-500 to primary
    '#3b82f6': '#9DBEDB', // blue-500 to secondary
    '#8b5cf6': '#FFD7D5', // purple-500 to accent
    '#f59e0b': '#FEC89A', // amber-500 to warning
    '#ef4444': '#FFD7D5', // red-500 to error
};

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            for (const [key, value] of Object.entries(replacements)) {
                // For tailwind classes like text-emerald-500, bg-blue-100
                const tailwindRegex = new RegExp(`([a-z]+)-${key}-([0-9]{2,3}(?:\\/[0-9]{2})?)`, 'g');
                if (tailwindRegex.test(content)) {
                    content = content.replace(tailwindRegex, `$1-${value}-$2`);
                    modified = true;
                }
                
                // For exact hex colors
                if (key.startsWith('#') && content.includes(key)) {
                    content = content.split(key).join(value);
                    modified = true;
                }
                
                // Also replace generic raw word if followed by a dash for safety check
                const literalRegex = new RegExp(`\\b${key}\\b`, 'g');
                // only modify if it looks like a hex color assignment or generic name in tooltip
            }
            
            if (modified) {
                fs.writeFileSync(fullPath, content);
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

walkDir(srcDir);
console.log('Class replacement complete.');
