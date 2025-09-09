/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    // 完全覆蓋預設主題，只保留你的設計系統
    colors: {
      // 基礎系統色彩 (必需保留)
      transparent: 'transparent',
      current: 'currentColor',
      inherit: 'inherit',
      white: '#FFFFFF',
      black: '#000000',
      
      // 僅灰階 - 用於文字和邊框
      gray: {
        50: '#F9FAFB',
        100: '#F3F4F6', 
        200: '#E5E7EB',
        300: '#D1D5DB',
        400: '#9CA3AF',
        500: '#6B7280',
        600: '#4B5563',
        700: '#374151',
        800: '#1F2937',
        900: '#111827'
      },
      
      // 餐廳管理系統 - 你的 10 色專用設計系統
      lemon_chiffon: {
        DEFAULT: '#FBF8CC',
        50: '#FEFDF8',
        100: '#FDF9E6',
        200: '#FBF8CC',
        300: '#F9F5B0',
        400: '#F7F294',
        500: '#F5EF78',
        600: '#F3EC5C',
        700: '#F1E940',
        800: '#EFE624',
        900: '#EDE308'
      },
      fawn: {
        DEFAULT: '#FDE4CF',
        50: '#FEF7F2',
        100: '#FDF2E8',
        200: '#FDE4CF',
        300: '#FCD7B6',
        400: '#FBC99D',
        500: '#FABC84',
        600: '#F9AE6B',
        700: '#F8A152',
        800: '#F79339',
        900: '#F68620'
      },
      melon: {
        DEFAULT: '#FFCFD2',
        50: '#FFF5F5',
        100: '#FFEBEC',
        200: '#FFCFD2',
        300: '#FFB3B8',
        400: '#FF979E',
        500: '#FF7B84',
        600: '#FF5F6A',
        700: '#FF4350',
        800: '#FF2736',
        900: '#FF0B1C'
      },
      lavender_blush: {
        DEFAULT: '#F1C0E8',
        50: '#FCF7FB',
        100: '#F9EFF7',
        200: '#F1C0E8',
        300: '#EA91D9',
        400: '#E362CA',
        500: '#DC33BB',
        600: '#D504AC',
        700: '#B00390',
        800: '#8B0274',
        900: '#660158'
      },
      mauve: {
        DEFAULT: '#CFBAF0',
        50: '#F5F1FC',
        100: '#EBE3F9',
        200: '#CFBAF0',
        300: '#B391E7',
        400: '#9768DE',
        500: '#7B3FD5',
        600: '#5F16CC',
        700: '#4C11A3',
        800: '#390C7A',
        900: '#260751'
      },
      periwinkle: {
        DEFAULT: '#A3C4F3',
        50: '#F0F6FE',
        100: '#E1EDFD',
        200: '#A3C4F3',
        300: '#659BE9',
        400: '#2772DF',
        500: '#1E5BC2',
        600: '#18489F',
        700: '#12357C',
        800: '#0C2259',
        900: '#060F36'
      },
      sky_blue: {
        DEFAULT: '#90DBF4',
        50: '#EDF9FE',
        100: '#DBF3FD',
        200: '#90DBF4',
        300: '#45C3EB',
        400: '#21B4E6',
        500: '#1B96C0',
        600: '#15789A',
        700: '#0F5A74',
        800: '#093C4E',
        900: '#031E28'
      },
      aquamarine: {
        DEFAULT: '#8EECF5',
        50: '#ECFDFE',
        100: '#D9FBFD',
        200: '#8EECF5',
        300: '#43DDED',
        400: '#20D4E8',
        500: '#1AB5C4',
        600: '#1496A0',
        700: '#0E777C',
        800: '#085858',
        900: '#023934'
      },
      mint_green: {
        DEFAULT: '#98F5E1',
        50: '#EDFDF9',
        100: '#DBFBF3',
        200: '#98F5E1',
        300: '#55EFCF',
        400: '#2EEBCA',
        500: '#26C4A7',
        600: '#1E9D84',
        700: '#167661',
        800: '#0E4F3E',
        900: '#06281B'
      },
      tea_green: {
        DEFAULT: '#B9FBC0',
        50: '#F1FEF2',
        100: '#E3FDE5',
        200: '#B9FBC0',
        300: '#8FF99B',
        400: '#65F776',
        500: '#3BF551',
        600: '#2FD441',
        700: '#25B335',
        800: '#1B9229',
        900: '#11711D'
      },
      
      // 語意化顏色別名 - 方便使用
      primary: {
        DEFAULT: '#90DBF4', // sky_blue
        50: '#EDF9FE',
        100: '#DBF3FD', 
        200: '#90DBF4',
        300: '#45C3EB',
        400: '#21B4E6',
        500: '#1B96C0',
        600: '#15789A',
        700: '#0F5A74',
        800: '#093C4E',
        900: '#031E28'
      },
      secondary: {
        DEFAULT: '#A3C4F3', // periwinkle
        50: '#F0F6FE',
        100: '#E1EDFD',
        200: '#A3C4F3',
        300: '#659BE9',
        400: '#2772DF',
        500: '#1E5BC2',
        600: '#18489F',
        700: '#12357C',
        800: '#0C2259',
        900: '#060F36'
      },
      accent: {
        DEFAULT: '#FFCFD2', // melon
        50: '#FFF5F5',
        100: '#FFEBEC',
        200: '#FFCFD2',
        300: '#FFB3B8',
        400: '#FF979E',
        500: '#FF7B84',
        600: '#FF5F6A',
        700: '#FF4350',
        800: '#FF2736',
        900: '#FF0B1C'
      },
      success: {
        DEFAULT: '#8EECF5', // aquamarine  
        50: '#ECFDFE',
        100: '#D9FBFD',
        200: '#8EECF5',
        300: '#43DDED',
        400: '#20D4E8',
        500: '#1AB5C4',
        600: '#1496A0',
        700: '#0E777C',
        800: '#085858',
        900: '#023934'
      },
      warning: {
        DEFAULT: '#FBF8CC', // lemon_chiffon
        50: '#FEFDF8',
        100: '#FDF9E6',
        200: '#FBF8CC',
        300: '#F9F5B0',
        400: '#F7F294',
        500: '#F5EF78',
        600: '#F3EC5C',
        700: '#F1E940',
        800: '#EFE624',
        900: '#EDE308'
      },
      error: {
        DEFAULT: '#FFCFD2', // melon (same as accent)
        50: '#FFF5F5',
        100: '#FFEBEC',
        200: '#FFCFD2',
        300: '#FFB3B8',
        400: '#FF979E',
        500: '#FF7B84',
        600: '#FF5F6A',
        700: '#FF4350',
        800: '#FF2736',
        900: '#FF0B1C'
      },
      info: {
        DEFAULT: '#90DBF4', // sky_blue (same as primary)
        50: '#EDF9FE',
        100: '#DBF3FD',
        200: '#90DBF4',
        300: '#45C3EB',
        400: '#21B4E6',
        500: '#1B96C0',
        600: '#15789A',
        700: '#0F5A74',
        800: '#093C4E',
        900: '#031E28'
      }
    },
    // 保留其他 Tailwind 功能
    spacing: {},
    screens: {
      'sm': '640px',
      'md': '768px', 
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    fontFamily: {
      'sans': ['ui-sans-serif', 'system-ui'],
      'serif': ['ui-serif', 'Georgia'],
      'mono': ['ui-monospace', 'SFMono-Regular'],
    },
    fontSize: {
      'xs': ['0.75rem', { lineHeight: '1rem' }],
      'sm': ['0.875rem', { lineHeight: '1.25rem' }],
      'base': ['1rem', { lineHeight: '1.5rem' }],
      'lg': ['1.125rem', { lineHeight: '1.75rem' }],
      'xl': ['1.25rem', { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }],
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
    },
    extend: {
      // 這裡可以添加額外的擴展，但不會添加顏色
    },
  },
  plugins: [],
}