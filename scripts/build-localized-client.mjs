#!/usr/bin/env node

import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const clientRoot = path.join(root, 'upstream', 'pokemon-showdown-client');
const graphicsPath = path.join(clientRoot, 'play.pokemonshowdown.com', 'data', 'graphics.js');
const graphicsBuilder = path.join(root, 'scripts', 'build-battle-graphics.mjs');

function run(command, args, cwd = root) {
	const result = spawnSync(command, args, {cwd, stdio: 'inherit'});
	if (result.error) throw result.error;
	if (result.status) process.exit(result.status);
}

run(process.execPath, ['scripts/audit-localization.mjs']);
run(process.execPath, ['scripts/generate-client-localization.mjs']);
run(process.execPath, ['--test', 'test/localization.test.mjs']);
run('npx', ['tsc', '--noEmit'], clientRoot);
run('npx', [
	'eslint',
	'play.pokemonshowdown.com/src/battle-animations.ts',
	'play.pokemonshowdown.com/src/battle-dex-search.ts',
	'play.pokemonshowdown.com/src/battle-log.ts',
	'play.pokemonshowdown.com/src/battle-searchresults.tsx',
	'play.pokemonshowdown.com/src/battle-tooltips.ts',
], clientRoot);
if (process.argv.includes('--full')) {
	// The upstream full build cachebusts commands.js before generating it on a
	// pristine checkout. Seed that index when possible, then run the full build.
	spawnSync(process.execPath, ['build', 'commands'], {cwd: clientRoot, stdio: 'inherit'});
	run(process.execPath, ['build', 'full'], clientRoot);
} else {
	run(process.execPath, ['build'], clientRoot);
}
// This generated bundle is absent from clean upstream checkouts and the
// incremental upstream build can skip it. Build it explicitly every time so
// battle.js never loads without the BattleScene global it requires.
run(process.execPath, [graphicsBuilder]);
if (!fs.readFileSync(graphicsPath, 'utf8').includes('BattleScene')) {
	throw new Error('Battle graphics bundle is missing BattleScene');
}
