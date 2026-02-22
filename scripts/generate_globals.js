const fs = require('fs');
const path = require('path');

const cssFile = path.join(__dirname, '../src/app/globals.css');

function blend(hexColor, targetColor, weight) {
  const r1 = parseInt(hexColor.substring(1, 3), 16);
  const g1 = parseInt(hexColor.substring(3, 5), 16);
  const b1 = parseInt(hexColor.substring(5, 7), 16);

  const r2 = parseInt(targetColor.substring(1, 3), 16);
  const g2 = parseInt(targetColor.substring(3, 5), 16);
  const b2 = parseInt(targetColor.substring(5, 7), 16);

  const r = Math.round(r1 * weight + r2 * (1 - weight));
  const g = Math.round(g1 * weight + g2 * (1 - weight));
  const b = Math.round(b1 * weight + b2 * (1 - weight));

  return '#' + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
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
    50: blend(baseHex, '#FFFFFF', 0.1),
    100: blend(baseHex, '#FFFFFF', 0.2),
    200: blend(baseHex, '#FFFFFF', 0.4),
    300: blend(baseHex, '#FFFFFF', 0.6),
    400: blend(baseHex, '#FFFFFF', 0.8),
    500: baseHex,
    600: blend(baseHex, '#000000', 0.8),
    700: blend(baseHex, '#000000', 0.6),
    800: blend(baseHex, '#000000', 0.4),
    900: blend(baseHex, '#000000', 0.2),
  };
}

let themeCSS = '\n@theme {\n';
themeCSS += '  --color-white: #FFFFFF;\n';
themeCSS += '  --color-black: #000000;\n';

// Gray shades (using Slate as base #64748b)
const grayShades = generateShades('#64748b');
for (const [shade, val] of Object.entries(grayShades)) {
  themeCSS += `  --color-gray-${shade}: ${val};\n`;
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

/* 修復會議記錄標籤太螢光的問題，強制覆寫 secondary-100 與 secondary-700 預設樣式 */
@layer utilities {
  .bg-secondary-100 {
    background-color: var(--color-secondary-50) !important;
  }
  .text-secondary-700 {
    color: var(--color-secondary-800) !important;
  }
}

`;

fs.writeFileSync(cssFile, globalCSSContent);
console.log('Successfully generated elegant shades using pure color blending');
