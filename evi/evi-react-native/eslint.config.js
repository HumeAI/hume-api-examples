// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // expo-modules-core is a native dep; import/no-unresolved fails for platform-specific modules
    files: ['modules/**/*.ts'],
    rules: {
      'import/no-unresolved': 'off',
    },
  },
]);
