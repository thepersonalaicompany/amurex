module.exports = {
  bundler: '@parcel/bundler-default',
  namers: ['@parcel/namer-default'],
  resolvers: ['@parcel/resolver-default'],
  transformers: {
    '*.{js,jsx}': ['@parcel/transformer-js'],
    '*.{css,scss}': ['@parcel/transformer-css'],
    '*.html': ['@parcel/transformer-html']
  },
  optimizers: {
    '*.js': ['@parcel/optimizer-terser']
  },
  packagers: {
    '*.html': '@parcel/packager-html',
    '*': '@parcel/packager-default'
  },
  validators: {
    '*.{js,jsx}': ['@parcel/validator-eslint']
  },
  reporters: ['@parcel/reporter-cli'],
  runtimes: {
    browser: ['@parcel/runtime-browser-hmr', '@parcel/runtime-js']
  },
  // Disable code splitting
  defaultConfig: {
    ...require('@parcel/config-default'),
    bundler: '@parcel/bundler-default',
    optimizers: {
      '*.js': ['@parcel/optimizer-terser']
    },
    packagers: {
      '*.html': '@parcel/packager-html',
      '*': '@parcel/packager-default'
    }
  },
  // Disable chunking
  bundler: {
    disableCodeSplitting: true
  }
}; 