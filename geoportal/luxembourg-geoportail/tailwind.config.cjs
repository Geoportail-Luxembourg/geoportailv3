const themes = [
  'main',
  'tourisme',
  'emwelt',
  'eau',
  'pag',
  'agriculture',
  'lenoz',
  'preizerdaul' /*PRIVATE THEME*/,
  'wellenstein' /*PRIVATE THEME*/,
  'lintgen' /*PRIVATE THEME*/,
  'remich' /*PRIVATE THEME*/,
  'at',
  'cadastre_hertzien',
  'urban_farming',
  'energie',
  'atlas_demographique',
  'logement',
  'np_our' /*USED ON PROD BUT NOT MIGRATION*/,
  'geosciences' /*USED ON PROD BUT NOT MIGRATION*/,
  'ahc' /*USED ON PROD BUT NOT MIGRATION*/,
  'municipalities' /*PRIVATE THEME*/,
  'Amenagement_du_territoire' /*PRIVATE THEME*/,
  'Environnement_naturel' /*PRIVATE THEME*/,
  'Environnement_humain' /*PRIVATE THEME*/,
  'Occupation_du_sol' /*PRIVATE THEME*/,
  'intranet-at' /*PRIVATE THEME*/,
  'prof' /*PRIVATE THEME*/,
  'go' /*PRIVATE THEME*/,
  'sig_secours' /*PRIVATE THEME*/,
]

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['index.html', './src/**/*.{html,js,ts}'],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        default: 'var(--color-default)',
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        tertiary: 'var(--color-tertiary)',
        ...generateThemeColors(),
      },
      fontFamily: {
        sans: 'DINNextLTPro-Condensed, Arial, sans-serif',
        body: 'DINNextLTPro-Condensed, Arial, sans-serif',
        icons: 'geoportail-icons-wc',
      },
      fontSize: {
        'title-xl': ['40px', '40px'],
      },
      boxShadow: {
        header: '0px 2px 6px -1px rgb(0 0 0 / 50%)',
      },
      screens: {
        hd: {
          raw: 'only screen and (min-device-pixel-ratio: 1.25), only screen and ( min-resolution: 200dpi), only screen and ( min-resolution: 1.25dppx)',
        },
        hd_md: {
          raw: 'only screen and (min-device-pixel-ratio: 1.25) and (min-width: 768px), only screen and ( min-resolution: 200dpi) and (min-width: 768px), only screen and ( min-resolution: 1.25dppx) and (min-width: 768px)',
        },
      },
      backgroundImage: {
        route: "url('../images/backgroundselector/routiere.png')",
        topo_bw: "url('../images/backgroundselector/topo_nb.png')",
        topo: "url('../images/backgroundselector/topo.png')",
        ortho: "url('../images/backgroundselector/orthophoto.png')",
        hybrid: "url('../images/backgroundselector/hybrid.png')",
        route_sm: "url('../images/backgroundselector/routiere_sm.png')",
        topo_bw_sm: "url('../images/backgroundselector/topo_nb_sm.png')",
        topo_sm: "url('../images/backgroundselector/topo_sm.png')",
        ortho_sm: "url('../images/backgroundselector/orthophoto_sm.png')",
        hybrid_sm: "url('../images/backgroundselector/hybrid_sm.png')",
        route_hi: "url('../images/backgroundselector/routiere_retina.png')",
        topo_bw_hi: "url('../images/backgroundselector/topo_nb_retina.png')",
        topo_hi: "url('../images/backgroundselector/topo_retina.png')",
        ortho_hi: "url('../images/backgroundselector/orthophoto_retina.png')",
        hybrid_hi: "url('../images/backgroundselector/hybrid_retina.png')",
        route_sm_hi:
          "url('../images/backgroundselector/routiere_sm_retina.png')",
        topo_bw_sm_hi:
          "url('../images/backgroundselector/topo_nb_sm_retina.png')",
        topo_sm_hi: "url('../images/backgroundselector/topo_sm_retina.png')",
        ortho_sm_hi:
          "url('../images/backgroundselector/orthophoto_sm_retina.png')",
        hybrid_sm_hi:
          "url('../images/backgroundselector/hybrid_sm_retina.png')",
      },
      content: {
        main: '"\\e02d"',
        tourisme: '"\\e04e"',
        emwelt: '"\\e04b"',
        eau: '"\\e016"',
        pag: '"\\e018"',
        agriculture: '"\\e043"',
        lenoz: '"\\e01A"',
        preizerdaul: '"\\e00c"',
        wellenstein: '"\\e00c"',
        lintgen: '"\\e00c"',
        remich: '"\\e00c"',
        at: '"\\e044"',
        cadastre_hertzien: '"\\e02d"',
        urban_farming: '"\\e054"',
        energie: '"\\e048"',
        atlas_demographique: '"\\e05c"',
        logement: '"\\e055"',
        np_our: '"\\e005"',
        geosciences: '"\\e05b"',
        ahc: '"\\e016"',
        municipalities: '"\\e042"',
        Amenagement_du_territoire: '"\\e044"',
        Environnement_naturel: '"\\e04b"',
        Environnement_humain: '"\\e048"',
        Occupation_du_sol: '"\\e051"',
        'intranet-at': '"\\e018"',
        prof: '"\\e00a"',
        go: '"\\e00b"',
        sig_secours: '"\\e00a"',
      },
    },
  },
  safelist: [
    'md:bg-route',
    'md:bg-topo_bw',
    'md:bg-topo',
    'md:bg-ortho',
    'md:bg-hybrid',
    'bg-route_sm',
    'bg-topo_bw_sm',
    'bg-topo_sm',
    'bg-ortho_sm',
    'bg-hybrid_sm',
    'hd_md:bg-route_hi',
    'hd_md:bg-topo_bw_hi',
    'hd_md:bg-topo_hi',
    'hd_md:bg-ortho_hi',
    'hd_md:bg-hybrid_hi',
    'hd:bg-route_sm_hi',
    'hd:bg-topo_bw_sm_hi',
    'hd:bg-topo_sm_hi',
    'hd:bg-ortho_sm_hi',
    'hd:bg-hybrid_sm_hi',
    ...generateThemeSafelist(),
  ],
  plugins: [],
}

function generateThemeSafelist() {
  return themes.flatMap(theme => [
    `${theme}-primary`,
    `bg-${theme}-primary`,
    `hover:text-${theme}-primary`,
    `after:content-${theme}`,
  ])
}
function generateThemeColors() {
  return Object.fromEntries(
    themes.flatMap(theme => [
      [`${theme}-primary`, `var(--${theme}-primary)`],
      [`${theme}-secondary`, `var(--${theme}-secondary)`],
      [`${theme}-tertiary`, `var(--${theme}-tertiary)`],
    ])
  )
}
