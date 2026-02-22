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

            // Replace green with success
            content = content.replace(/green-500/g, 'success-500');
            content = content.replace(/green-600/g, 'success-600');
            content = content.replace(/green-700/g, 'success-700');
            content = content.replace(/green-400/g, 'success-400');
            content = content.replace(/green-300/g, 'success-300');
            content = content.replace(/green-200/g, 'success-200');
            content = content.replace(/green-100/g, 'success-100');
            content = content.replace(/green-50/g, 'success-50');
            
            if (content !== original) {
                fs.writeFileSync(fullPath, content);
                console.log(`Updated green to success in ${fullPath}`);
            }
        }
    }
}

walkDir(srcDir);
