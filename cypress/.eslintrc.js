const path = require('path');

module.exports = {
  extends: path.resolve(__dirname, '../.eslintrc.js'),
  rules: {
    // Allow testing dependencies to be listed as `devDependencies` (instead of
    // normal `dependencies`).
    // @see {@link https://github.com/benmosher/eslint-plugin-import/blob/master/docs/rules/no-extraneous-dependencies.md}
    'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
    // Allow overriding the Cypress namespace with custom defined commands.
    '@typescript-eslint/no-namespace': ['off'],
    // Allow Cypress `.then(() => {` chaining functions to not return.
    'promise/catch-or-return': ['off'],
    'promise/always-return': ['off'],
  },
};
