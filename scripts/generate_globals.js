const fs = require('fs');
const path = require('path');

const cssFile = path.join(__dirname, '../src/app/globals.css');

// Calculate shades function for dynamic hex colors
function lightenDarken(col, amt) {
    let usePound = false;
    if (col[0] === "#") {
        col = col.slice(1);
        usePound = true;
    }
    const num = parseInt(col, 16);
    let r = (num >> 16) + amt;
    if (r > 255) r = 255;
    else if (r < 0) r = 0;
    let b = ((num >> 8) & 0x00FF) + amt;
    if (b > 255) b = 255;
    else if (b < 0) b = 0;
    let g = (num & 0x0000FF) + amt;
    if (g > 255) g = 255;
    else if (g < 0) g = 0;
    return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
}

// Teller / Liminote New Colors
const baseColors = {
    primary: '#6e9aad', // 品牌深藍灰
    secondary: '#90b9ca', // 品牌主藍灰
    accent: '#b2ccd6', // 品牌淺藍灰
    success: '#8FBDBA', // 霧青綠 / 好順
    warning: '#FEC89A', // 暖陽橘
    error: '#BC9898', // 暖玫瑰 / 壞逆
    info: '#90b9ca' // same as secondary
};

function generateShades(baseHex) {
    return {
        50: lightenDarken(baseHex, 90),
        100: lightenDarken(baseHex, 75),
        200: lightenDarken(baseHex, 50),
        300: lightenDarken(baseHex, 25),
        400: lightenDarken(baseHex, 10),
        500: baseHex,
        600: lightenDarken(baseHex, -15),
        700: lightenDarken(baseHex, -30),
        800: lightenDarken(baseHex, -45),
        900: lightenDarken(baseHex, -60),
    };
}

let themeCSS = '\n@theme {\n';
// Basic colors
themeCSS += '  --color-white: #FFFFFF;\n';
themeCSS += '  --color-black: #000000;\n';

// Gray shades
for (let i = 1; i <= 9; i++) {
    const val = i * 100;
    themeCSS += `  --color-gray-${val}: #` + lightenDarken('#6B7280', (5 - i) * 20).replace('#', '') + ';\n';
}

for (const [name, hex] of Object.entries(baseColors)) {
    const shades = generateShades(hex);
    for (const [shade, val] of Object.entries(shades)) {
        themeCSS += `  --color-${name}-${shade}: ${val};\n`;
    }
    themeCSS += `  --color-${name}: ${hex};\n`;
}

themeCSS += '}\n';

const globalCSSContent = `@import "tailwindcss";

${themeCSS}

/* Vanny Design System - Core Setup */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

:root {
  --background: #F2F4F8; /* 霧藍灰 */
  --foreground: #1F2937;
  --primary: ${baseColors.primary};
  --secondary: ${baseColors.secondary};
  --accent: ${baseColors.accent};
}

/* 禁用暗模式 - 保持設計系統一致性 */
@media (prefers-color-scheme: dark) {
  :root {
    --background: #F2F4F8;
    --foreground: #1F2937;
  }
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: 'Noto Sans TC', Arial, Helvetica, sans-serif;
}

/* 修復字色打架問題：放入 base 中確保 Tailwind 工具類可以覆寫 */
@layer base {
  a {
    color: var(--primary);
    text-decoration: none;
  }
  
  a:hover {
    color: var(--secondary);
  }
  
  button:not([class*="bg-"]) {
    background-color: var(--primary);
    color: white;
  }
  
  button:not([class*="bg-"]):hover {
    background-color: var(--secondary);
  }

  /* 表單元素顏色強制 */
  input:focus,
  textarea:focus,
  select:focus {
    border-color: var(--primary) !important;
    outline-color: var(--primary) !important;
    box-shadow: 0 0 0 3px rgba(110, 154, 173, 0.15) !important;
  }
}

`;

fs.writeFileSync(cssFile, globalCSSContent);
console.log('Successfully re-generated globals.css with new Teller colors and fixed CSS specificity base layer');
