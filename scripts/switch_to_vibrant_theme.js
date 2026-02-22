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

// User requested to switch primary colors to the VDS Labels & Accents palette to be more "vibrant"
// Let's use the warm, vibrant colors from that specific section:
// '#FEC89A', // 暖陽橘
// '#FFD7D5', // 櫻花粉紅 
// '#FCD5CE', // 柔霧水蜜桃
// '#9DBEDB', // 工作藍底
// '#BFACC8', // 薰衣草紫

const baseColors = {
  primary: '#FEC89A', // 暖陽橘 - (Vibrant orange for primary buttons, focus state, active states)
  secondary: '#FFD7D5', // 櫻花粉紅 - (Vibrant pink for secondary actions, hovers)
  accent: '#9DBEDB', // 工作藍底 - (Calm blue for accents to balance out the warmth)
  success: '#8FBDBA', // 霧青綠 - (Kept same for semantic meaning)
  warning: '#FEC89A', // 暖陽橘 - (Kept same)
  error: '#BC9898', // 暖玫瑰 - (Kept same)
  info: '#9DBEDB' // same as accent
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

const globalCSSContent = `@import "tailwindcss";\n\n${themeCSS}\n\n/* Vanny Design System - Core Setup */\n@theme inline {\n  --color-background: var(--background);\n  --color-foreground: var(--foreground);\n  --font-sans: var(--font-geist-sans);\n  --font-mono: var(--font-geist-mono);\n}\n\n:root {\n  --background: #FDF9F3; /* changed background to a very soft, warm cream to match the vibrant warm primary colors, rather than the cool gray */ \n  --foreground: #2d3748; /* softer dark gray instead of 1f2937 */\n  --primary: ${baseColors.primary};\n  --secondary: ${baseColors.secondary};\n  --accent: ${baseColors.accent};\n}\n\n/* 禁用暗模式 - 保持設計系統一致性 */\n@media (prefers-color-scheme: dark) {\n  :root {\n    --background: #FDF9F3;\n    --foreground: #2d3748;\n  }\n}\n\nbody {\n  background: var(--background);\n  color: var(--foreground);\n  font-family: 'Noto Sans TC', Arial, Helvetica, sans-serif;\n}\n\n/* 修復字色打架問題：放入 base 中確保 Tailwind 工具類可以覆寫 */\n@layer base {\n  a {\n    color: var(--color-gray-800);\n    text-decoration: none;\n  }\n  \n  a:hover {\n    color: var(--primary);\n  }\n  \n  button:not([class*="bg-"]) {\n    background-color: var(--primary);\n    color: var(--color-gray-900);\n  }\n  \n  button:not([class*="bg-"]):hover {\n    background-color: var(--secondary);\n  }\n\n  /* 表單元素顏色強制 */\n  input:focus,\n  textarea:focus,\n  select:focus {\n    border-color: var(--primary) !important;\n    outline-color: var(--primary) !important;\n    box-shadow: 0 0 0 3px rgba(254, 200, 154, 0.25) !important;\n  }\n}\n\n/* 修復會議記錄標籤太螢光的問題，強制覆寫 secondary-100 與 secondary-700 預設樣式 */\n@layer utilities {\n  .bg-secondary-100 {\n    background-color: var(--color-secondary-50) !important;\n  }\n  .text-secondary-700 {\n    color: var(--color-secondary-800) !important;\n  }\n}\n`;

fs.writeFileSync(cssFile, globalCSSContent);
console.log('Successfully switched to vibrant Labels & Accents theme.');
