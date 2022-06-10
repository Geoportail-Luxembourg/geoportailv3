module.exports = {
  locales: ['en', 'de', 'fr', 'lb'],
  defaultNamespace: 'app',
  input: [
    '../../js/**/*.{js,ts}'
  ],
  output: 'locales/$NAMESPACE.$LOCALE.json',
  createOldCatalogs: false,
  sort: true,
  keySeparator: false,
};
