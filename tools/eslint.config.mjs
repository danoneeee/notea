import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import vue from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/dist/**', '**/src/generated/**', '**/test-results/**', '**/playwright-report/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/essential'],
  {
    files: ['**/*.{js,cjs,mjs,ts,vue}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    files: ['**/*.{ts,vue}'],
    // TypeScript owns name resolution, including types and Vue macros.
    rules: { 'no-undef': 'off' },
  },
  {
    files: ['**/ChinaTeaMap.vue', '**/CountryTeaMap.vue'],
    // Existing third-party GeoJSON adapters are not fully typed yet.
    rules: { '@typescript-eslint/no-explicit-any': 'warn' },
  },
  {
    files: ['**/components/note-form/*.vue'],
    // Form steps intentionally receive refs from their parent as a shared model.
    rules: { 'vue/no-mutating-props': ['error', { shallowOnly: true }] },
  },
  {
    files: ['**/*.cjs'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: tseslint.parser, extraFileExtensions: ['.vue'] },
    },
  },
);
