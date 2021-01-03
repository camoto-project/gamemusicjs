import lint from 'mocha-eslint';

const paths = [
	'cli',
	'formats',
	'test',
	'util',
];

lint(paths);
