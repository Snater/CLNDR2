// @ts-check

import globals from 'globals';
import eslint from '@eslint/js';
import storybook from 'eslint-plugin-storybook';
import stylistic from '@stylistic/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

/**
 * @type {import('eslint').Linter.Config[]}
 */
export default [
	eslint.configs.recommended,
	...storybook.configs['flat/recommended'],
	{
		languageOptions: {
			parser: tsParser,
			globals: {
				...globals.browser,
				...globals.es2020,
				...globals.jest,
				...globals.node,
			},
			parserOptions: {
				ecmaVersion: 'latest',
				projectService: {
					allowDefaultProject: ['*.js', '.storybook/*.ts', 'src/*.stories.ts'],
				},
				sourceType: 'module',
			},
		},
		plugins: {
			'@typescript-eslint': tsPlugin,
			'@stylistic': stylistic,
		},
		rules: {
			'@stylistic/arrow-parens': ['error', 'as-needed'],
			'@stylistic/comma-dangle': ['error', {
				arrays: 'always-multiline',
				objects: 'always-multiline',
				imports: 'always-multiline',
				exports: 'always-multiline',
				functions: 'never',
			}],
			'@stylistic/dot-location': ['error', 'property'],
			'@stylistic/indent': ['error', 'tab'],
			'@stylistic/max-len': ['error', {
				code: 100,
				tabWidth: 2,
				ignoreComments: true,
				ignoreStrings: true,
				ignoreTemplateLiterals: true,
			}],
			'@stylistic/no-multiple-empty-lines': ['error', {'max': 1}],
			'@stylistic/operator-linebreak': ['error', 'before'],
			'@stylistic/quotes': ['error', 'single'],
		},
	},
	{
		ignores: [
			'!.storybook/**',
			'coverage/**',
			'dist/**',
			'docs/**',
			'storybook-static/**',
		],
	},
];
