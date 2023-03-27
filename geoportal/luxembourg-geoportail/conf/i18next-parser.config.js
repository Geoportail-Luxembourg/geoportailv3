module.exports = {
  locales: ['en', 'de', 'fr', 'lb'],
  defaultNamespace: 'app',
  input: [
    '../src/**/*.{js,ts}'
  ],
  output: 'assets/locales/$NAMESPACE.$LOCALE.json',
  createOldCatalogs: false,
  sort: true,
  namespaceSeparator: false,
  keySeparator: false,
};
