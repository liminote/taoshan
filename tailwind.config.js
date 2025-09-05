/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 餐廳管理系統自定義色彩系統
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
        }
      }
    },
  },
  plugins: [],
}