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
    'amber': 'warning'
};

const exactStringReplacements = [
    ['#10b981', '#5E7182'],
    ['#3b82f6', '#9DBEDB'],
    ['#8b5cf6', '#FFD7D5'],
    ['#f59e0b', '#FEC89A'],
    ['#ef4444', '#FFD7D5'],
    ['text-emerald-', 'text-primary-'],
    ['bg-emerald-', 'bg-primary-'],
    ['border-emerald-', 'border-primary-'],
    ['ring-emerald-', 'ring-primary-'],
    ['text-blue-', 'text-secondary-'],
    ['bg-blue-', 'bg-secondary-'],
    ['border-blue-', 'border-secondary-'],
    ['ring-blue-', 'ring-secondary-'],
    ['text-purple-', 'text-accent-'],
    ['bg-purple-', 'bg-accent-'],
    ['text-orange-', 'text-warning-'],
    ['bg-orange-', 'bg-warning-']
];

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let original = content;

            // Direct string replacements for Tailwind prefixes
            for (const [key, value] of exactStringReplacements) {
                content = content.split(key).join(value);
            }

            if (content !== original) {
                fs.writeFileSync(fullPath, content);
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

walkDir(srcDir);
console.log('Class replacement complete.');
