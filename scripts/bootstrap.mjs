#!/usr/bin/env node

import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const upstream = path.join(root, 'upstream');
const repositories = [
	['pokemon-showdown', 'https://github.com/smogon/pokemon-showdown.git'],
	['pokemon-showdown-client', 'https://github.com/smogon/pokemon-showdown-client.git'],
	['PKHeX', 'https://github.com/kwsch/PKHeX.git'],
];

function run(command, args, cwd = root, allowFailure = false) {
	const result = spawnSync(command, args, {cwd, stdio: allowFailure ? 'ignore' : 'inherit'});
	if (result.error) throw result.error;
	if (result.status && !allowFailure) process.exit(result.status);
	return result.status === 0;
}

fs.mkdirSync(upstream, {recursive: true});
for (const [directory, url] of repositories) {
	const target = path.join(upstream, directory);
	if (!fs.existsSync(path.join(target, '.git'))) {
		run('git', ['clone', '--depth=1', url, target]);
	}
}

const clientRoot = path.join(upstream, 'pokemon-showdown-client');
const patches = [
	'pokemon-showdown-client.zh-Hans.patch',
	'pokemon-showdown-client.ai.patch',
];
for (const patchName of patches) {
	const patch = path.join(root, 'patches', patchName);
	if (!run('git', ['apply', '--reverse', '--check', patch], clientRoot, true)) {
		run('git', ['apply', '--check', patch], clientRoot);
		run('git', ['apply', patch], clientRoot);
	}
}
run('npm', ['ci', '--no-audit', '--no-fund'], clientRoot);
