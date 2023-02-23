module.exports = {
  locales: ['en', 'de', 'fr', 'lb'],
  defaultNamespace: 'app',
  input: [
    '../../**/*.{js,ts}'
  ],
  output: 'locales/$NAMESPACE.$LOCALE.json',
  createOldCatalogs: false,
  sort: true,
  namespaceSeparator: false,
  keySeparator: false,
};
