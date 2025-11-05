export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}"
  ],
  theme: {
  extend: {
    colors: {
      aubergine:'#2B2D42',
      mist: '#FAF6F2',     // cremet baggrund
      petal: '#E5C9C5',    // støvet rosa
      mauve: '#C6B8D9',    // lys lavendel
      plum: '#5A496E',     // dyb lavendel
      gold: '#D6AD60',  // varm guld til detaljer
      softTomato: '#e29a9a',
      brightBlue: '#36288c',
      white: '#FFFFFF'
    },
    maskImage: {
      'fade-top': 'linear-gradient(to top, transparent 0%, black 60%)',
    },
    fontFamily: {
      // 'sans': ['Work Sans', 'sans-serif'],
      // 'sans': ['Crimson Text', 'sans-serif'],
      sans: ['IBM Plex Sans', 'sans-serif'],
      display: ['Italiana'],
    },
    keyframes: {
      fadeIn: {
        '0%': { opacity: '0' },
        '100%': { opacity: '1' },
      },
      slideInLeft: {
        '0%': { opacity: '0', translateX: '-100px' },
        '100%': { opacity: '1', translateX: '100px' },
      }
    },
    animation: {
      fadeIn: 'fadeIn 1s ease-out forwards',
      slideInLeft: 'slideInLeft 2s ease-in'
    },
  },
},
plugins: [],
}
