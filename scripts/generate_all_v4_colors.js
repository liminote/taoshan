const fs = require('fs');
const path = require('path');

const configFile = path.join(__dirname, '../tailwind.config.js');
const cssFile = path.join(__dirname, '../src/app/globals.css');

const config = require(configFile);

// Extract colors object
const colors = config.theme.colors;

let themeCSS = '\n@theme {\n';

// Loop through all colors defined in the tailwind config
for (const [colorName, colorValues] of Object.entries(colors)) {
    if (colorName === 'transparent' || colorName === 'current' || colorName === 'inherit') {
        continue;
    }
    
    // Skip if it's a string (e.g., 'white', 'black', 'transparent')
    if (typeof colorValues === 'string') {
        themeCSS += `  --color-${colorName}: ${colorValues};\n`;
        continue;
    }

    // It is an object with shades like 50, 100, DEFAULT...
    if (typeof colorValues === 'object') {
        for (const [shade, hex] of Object.entries(colorValues)) {
            if (shade === 'DEFAULT') {
                themeCSS += `  --color-${colorName}: ${hex};\n`;
            } else {
                themeCSS += `  --color-${colorName}-${shade}: ${hex};\n`;
            }
        }
        themeCSS += '\n';
    }
}

themeCSS += '}\n';

// Now replace the @theme inline and @theme blocks in globals.css
let css = fs.readFileSync(cssFile, 'utf8');

// We will remove any existing @theme blocks
// including @theme inline {...} and @theme {...}
// Replace everything between @theme and its closing brace
const themeBlockRegex = /@theme(?:\s+inline)?\s*{[\s\S]*?}/g;

css = css.replace(themeBlockRegex, '');
// Remove multiple blank lines
css = css.replace(/\n\n\n+/g, '\n\n');

css += themeCSS;
// Add back the font mappings as they were originally
css += `
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}
`;

fs.writeFileSync(cssFile, css);
console.log('Successfully generated complete Tailwind v4 @theme from tailwind.config.js');
