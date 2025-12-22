import globals from 'globals';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import jest from 'eslint-plugin-jest';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores([
    '**/vue.config.js',
    '**/babel.config.js',
    '**/jest.config.js',
    'pkg/rancher-ai-ui/index.ts',
    'dist-pkg/**',
    'cypress.config.ts',
    'utils/**/*.js',
  ]),
  {
    files:           ['**/*.{js,mjs,cjs,ts,mts,cts,vue}'],
    languageOptions: { globals: globals.browser }
  },
  tseslint.configs.recommended,
  {
    files:           ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser } }
  },
  pluginVue.configs['flat/recommended'],
  {
    rules: {
      'no-multiple-empty-lines': ['error', {
        max:    1,
        maxEOF: 0
      }],
      'vue/no-empty-component-block':               'error',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-explicit-any':         'off',
      '@typescript-eslint/no-unused-vars':          'off',
      '@typescript-eslint/no-var-requires':         'off',
      '@typescript-eslint/no-this-alias':           'off',
      'array-bracket-spacing':                      'warn',
      'arrow-parens':                               'warn',
      'arrow-spacing':                              [
        'warn',
        {
          before: true,
          after:  true
        }
      ],
      'array-callback-return':                  'off',
      'block-spacing':         [
        'warn',
        'always'
      ],
      'brace-style': [
        'warn',
        '1tbs'
      ],
      'comma-dangle': [
        'warn',
        'only-multiline'
      ],
      'comma-spacing':     'warn',
      'curly':             'warn',
      'eqeqeq':            'warn',
      'func-call-spacing': [
        'warn',
        'never'
      ],
      'implicit-arrow-linebreak': 'warn',
      'indent':                   [
        'warn',
        2
      ],
      'keyword-spacing':             'warn',
      'lines-between-class-members': [
        'warn',
        'always',
        { exceptAfterSingleLine: true }
      ],
      'multiline-ternary': [
        'warn',
        'never'
      ],
      'newline-per-chained-call': [
        'warn',
        { ignoreChainWithDepth: 4 }
      ],
      'no-caller':      'warn',
      'no-cond-assign': [
        'warn',
        'except-parens'
      ],
      'no-console':                    'warn',
      'no-debugger':                   'warn',
      'no-eq-null':                    'warn',
      'no-eval':                       'warn',
      'no-trailing-spaces':            'warn',
      'no-undef':                      'warn',
      'no-unused-vars':                'warn',
      'no-whitespace-before-property': 'warn',
      'object-curly-spacing':          [
        'warn',
        'always'
      ],
      'object-property-newline': 'warn',
      'object-shorthand':        'warn',
      'padded-blocks':           [
        'warn',
        'never'
      ],
      'prefer-arrow-callback': 'warn',
      'prefer-template':       'warn',
      'rest-spread-spacing':   'warn',
      'semi':                  [
        'warn',
        'always'
      ],
      'semi-spacing':                'off',
      'space-before-function-paren': [
        'warn',
        'never'
      ],
      'space-in-parens':        'off',
      'space-infix-ops':        'warn',
      'spaced-comment':         'warn',
      'switch-colon-spacing':   'warn',
      'template-curly-spacing': [
        'warn',
        'always'
      ],
      'yield-star-spacing': [
        'warn',
        'both'
      ],
      'key-spacing': [
        'warn',
        {
          align: {
            beforeColon: false,
            afterColon:  true,
            on:          'value',
            mode:        'minimum'
          },
          multiLine: {
            beforeColon: false,
            afterColon:  true
          }
        }
      ],
      'object-curly-newline': [
        'warn',
        {
          ObjectExpression: {
            multiline:     true,
            minProperties: 3
          },
          ObjectPattern: {
            multiline:     true,
            minProperties: 4
          },
          ImportDeclaration: {
            multiline:     true,
            minProperties: 5
          },
          ExportDeclaration: {
            multiline:     true,
            minProperties: 3
          }
        }
      ],
      'padding-line-between-statements': [
        'warn',
        {
          blankLine: 'always',
          prev:      '*',
          next:      'return'
        },
        {
          blankLine: 'always',
          prev:      'function',
          next:      'function'
        },
        {
          blankLine: 'always',
          prev:      [
            'const',
            'let',
            'var'
          ],
          next: '*'
        },
        {
          blankLine: 'any',
          prev:      [
            'const',
            'let',
            'var'
          ],
          next: [
            'const',
            'let',
            'var'
          ]
        }
      ],
      'quotes': [
        'warn',
        'single',
        {
          avoidEscape:           true,
          allowTemplateLiterals: true
        }
      ],
      'space-unary-ops': [
        'warn',
        {
          words:    true,
          nonwords: false
        }
      ],
      // Add the rule here
      'vue/one-component-per-file':             'off',
      'vue/no-deprecated-slot-attribute':       'off',
      'vue/require-explicit-emits':             'off',
      'vue/v-on-event-hyphenation':             'off',
      'dot-notation':                           'off',
      'generator-star-spacing':                 'off',
      'guard-for-in':                           'off',
      'linebreak-style':                        'off',
      'new-cap':                                'off',
      'no-empty':                               'off',
      'no-extra-boolean-cast':                  'off',
      'no-new':                                 'off',
      'no-plusplus':                            'off',
      'no-useless-escape':                      'off',
      'nuxt/no-cjs-in-config':                  'off',
      'strict':                                 'off',
      'unicorn/no-new-buffer':                  'off',
      'vue/html-self-closing':                  'off',
      'vue/no-reserved-component-names':        'off',
      'vue/no-deprecated-v-on-native-modifier': 'off',
      'vue/no-useless-template-attributes':     'off',
      'vue/no-unused-components':               'warn',
      'vue/no-v-html':                          'error',
      'wrap-iife':                              'off',
      'vue/no-lone-template':                   'off',
      'vue/v-slot-style':                       'off',
      'vue/component-tags-order':               'off',
      'vue/no-mutating-props':                  'off',
      'vue/multi-word-component-names':         'off'
    },
  },
  {
    files: [
      'cypress/**/*.js',
      'cypress/**/*.ts',
      'cypress/e2e/**/*.spec.{js,ts}',
      'cypress/e2e/**/*.cy.{js,ts}'
    ],
    languageOptions: {
      globals: {
        cy:         'readonly',
        Cypress:    'readonly',
        describe:   'readonly',
        it:         'readonly',
        before:     'readonly',
        after:      'readonly',
        beforeEach: 'readonly',
        afterEach:  'readonly',
        expect:     'readonly'
      }
    },
    rules: {
      'no-unused-vars':                    'off',
      '@typescript-eslint/no-unused-vars': 'off',
    }
  },
  {
    plugins:         { jest },
    files:           ['**/__tests__/**/*.test.ts'],
    rules:           { ...jest.configs.recommended.rules },
    languageOptions: { globals: { ...jest.environments.globals.globals } },
  },
]);