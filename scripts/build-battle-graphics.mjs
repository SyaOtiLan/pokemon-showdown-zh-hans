#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const clientRoot = path.join(root, 'upstream', 'pokemon-showdown-client');
const compilerPath = path.join(clientRoot, 'build-tools', 'compiler.mjs');
const output = path.join(clientRoot, 'play.pokemonshowdown.com', 'data', 'graphics.js');
const sources = [
	path.join(clientRoot, 'play.pokemonshowdown.com', 'src', 'battle-animations.ts'),
	path.join(clientRoot, 'play.pokemonshowdown.com', 'src', 'battle-animations-moves.ts'),
];

process.chdir(clientRoot);
const babelConfigText = fs.readFileSync(path.join(clientRoot, '.babelrc'), 'utf8');
// Match the upstream builder: .babelrc is a JavaScript object literal with
// comments, rather than strict JSON.
// eslint-disable-next-line no-eval
const babelOptions = eval(`(${babelConfigText})`);
babelOptions.babelrc = false;
babelOptions.incremental = false;

const compiler = await import(pathToFileURL(compilerPath));
const previousMtime = fs.statSync(output, { throwIfNoEntry: false })?.mtimeMs;
compiler.compileToFile(sources, output, babelOptions);

for (let attempt = 0; attempt < 100; attempt++) {
	await new Promise(resolve => setTimeout(resolve, 50));
	const outputStat = fs.statSync(output, { throwIfNoEntry: false });
	if (outputStat?.mtimeMs !== previousMtime && fs.readFileSync(output, 'utf8').includes('BattleScene')) {
		console.log(`Built ${path.relative(root, output)}`);
		process.exit(0);
	}
}
throw new Error('Timed out while building data/graphics.js');
