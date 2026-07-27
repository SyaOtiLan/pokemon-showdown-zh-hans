#!/usr/bin/env node

import {spawnSync} from 'node:child_process';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const clientRoot = path.join(root, 'upstream', 'pokemon-showdown-client');

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
