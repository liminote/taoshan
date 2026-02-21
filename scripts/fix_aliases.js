const fs = require('fs');
const file = '../tailwind.config.js';
let configStr = fs.readFileSync(file, 'utf8');

// I'll just write a quick script that replaces the entire `primary`, `secondary`, etc. section with references to the base palettes.
const regexSemantic = /\/\/ 語意化顏色別名 - 方便使用[\s\S]*?(?=},\n\s*\/\/ 保留其他)/;

const newSemantic = `// 語意化顏色別名 - 方便使用
      primary: {
        DEFAULT: '#5E7182',
        50: '#EFF1F3',
        100: '#DFE3E6',
        200: '#BFC6CD',
        300: '#9EAAB4',
        400: '#7E8D9B',
        500: '#5E7182',
        600: '#475562',
        700: '#2F3941',
        800: '#181C21',
        900: '#000000',
      },
      secondary: {
        DEFAULT: '#9DBEDB',
        50: '#F5F9FB',
        100: '#EBF2F8',
        200: '#D8E5F1',
        300: '#C4D8E9',
        400: '#B1CBE2',
        500: '#9DBEDB',
        600: '#768FA4',
        700: '#4F5F6E',
        800: '#273037',
        900: '#000000',
      },
      accent: {
        DEFAULT: '#FFD7D5',
        50: '#FFFBFB',
        100: '#FFF7F7',
        200: '#FFEFEE',
        300: '#FFE7E6',
        400: '#FFDFDD',
        500: '#FFD7D5',
        600: '#BFA1A0',
        700: '#806C6B',
        800: '#403635',
        900: '#000000',
      },
      success: {
        DEFAULT: '#708898',
        50: '#F1F3F5',
        100: '#E2E7EA',
        200: '#C6CFD6',
        300: '#A9B8C1',
        400: '#8DA0AD',
        500: '#708898',
        600: '#546672',
        700: '#38444C',
        800: '#1C2226',
        900: '#000000',
      },
      warning: {
        DEFAULT: '#FEC89A',
        50: '#FFFAF5',
        100: '#FFF4EB',
        200: '#FFE9D7',
        300: '#FEDEC2',
        400: '#FED3AE',
        500: '#FEC89A',
        600: '#BF9674',
        700: '#7F644D',
        800: '#403227',
        900: '#000000',
      },
      error: {
        DEFAULT: '#FFD7D5',
        50: '#FFFBFB',
        100: '#FFF7F7',
        200: '#FFEFEE',
        300: '#FFE7E6',
        400: '#FFDFDD',
        500: '#FFD7D5',
        600: '#BFA1A0',
        700: '#806C6B',
        800: '#403635',
        900: '#000000',
      },
      info: {
        DEFAULT: '#5E7182',
        50: '#EFF1F3',
        100: '#DFE3E6',
        200: '#BFC6CD',
        300: '#9EAAB4',
        400: '#7E8D9B',
        500: '#5E7182',
        600: '#475562',
        700: '#2F3941',
        800: '#181C21',
        900: '#000000',
      }`;

configStr = configStr.replace(regexSemantic, newSemantic);
fs.writeFileSync(file, configStr);
console.log('Fixed aliases in tailwind.config.js');
