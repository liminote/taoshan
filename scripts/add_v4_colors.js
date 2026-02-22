const fs = require('fs');
const path = require('path');

const cssFile = path.join(__dirname, '../src/app/globals.css');
let css = fs.readFileSync(cssFile, 'utf8');

const themeBlock = `
@theme {
  --color-primary: #5E7182;
  --color-primary-50: #EFF1F3;
  --color-primary-100: #DFE3E6;
  --color-primary-200: #BFC6CD;
  --color-primary-300: #9EAAB4;
  --color-primary-400: #7E8D9B;
  --color-primary-500: #5E7182;
  --color-primary-600: #475562;
  --color-primary-700: #2F3941;
  --color-primary-800: #181C21;
  --color-primary-900: #000000;

  --color-secondary: #9DBEDB;
  --color-secondary-50: #F5F9FB;
  --color-secondary-100: #EBF2F8;
  --color-secondary-200: #D8E5F1;
  --color-secondary-300: #C4D8E9;
  --color-secondary-400: #B1CBE2;
  --color-secondary-500: #9DBEDB;
  --color-secondary-600: #768FA4;
  --color-secondary-700: #4F5F6E;
  --color-secondary-800: #273037;
  --color-secondary-900: #000000;

  --color-accent: #FFD7D5;
  --color-accent-50: #FFFBFB;
  --color-accent-100: #FFF7F7;
  --color-accent-200: #FFEFEE;
  --color-accent-300: #FFE7E6;
  --color-accent-400: #FFDFDD;
  --color-accent-500: #FFD7D5;
  --color-accent-600: #BFA1A0;
  --color-accent-700: #806C6B;
  --color-accent-800: #403635;
  --color-accent-900: #000000;

  --color-success: #708898;
  --color-success-50: #F1F3F5;
  --color-success-100: #E2E7EA;
  --color-success-200: #C6CFD6;
  --color-success-300: #A9B8C1;
  --color-success-400: #8DA0AD;
  --color-success-500: #708898;
  --color-success-600: #546672;
  --color-success-700: #38444C;
  --color-success-800: #1C2226;
  --color-success-900: #000000;

  --color-warning: #FEC89A;
  --color-warning-50: #FFFAF5;
  --color-warning-100: #FFF4EB;
  --color-warning-200: #FFE9D7;
  --color-warning-300: #FEDEC2;
  --color-warning-400: #FED3AE;
  --color-warning-500: #FEC89A;
  --color-warning-600: #BF9674;
  --color-warning-700: #7F644D;
  --color-warning-800: #403227;
  --color-warning-900: #000000;

  --color-error: #FFD7D5;
  --color-error-50: #FFFBFB;
  --color-error-100: #FFF7F7;
  --color-error-200: #FFEFEE;
  --color-error-300: #FFE7E6;
  --color-error-400: #FFDFDD;
  --color-error-500: #FFD7D5;
  --color-error-600: #BFA1A0;
  --color-error-700: #806C6B;
  --color-error-800: #403635;
  --color-error-900: #000000;

  --color-info: #5E7182;
  --color-info-50: #EFF1F3;
  --color-info-100: #DFE3E6;
  --color-info-200: #BFC6CD;
  --color-info-300: #9EAAB4;
  --color-info-400: #7E8D9B;
  --color-info-500: #5E7182;
  --color-info-600: #475562;
  --color-info-700: #2F3941;
  --color-info-800: #181C21;
  --color-info-900: #000000;
}
`;

if (!css.includes('--color-primary-500')) {
    css = css.replace('@theme inline {', themeBlock + '\n@theme inline {');
    fs.writeFileSync(cssFile, css);
    console.log('Added v4 colors to globals.css');
}
