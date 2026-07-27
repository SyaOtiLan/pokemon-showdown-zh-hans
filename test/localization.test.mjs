import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const clientRoot = path.join(root, 'upstream', 'pokemon-showdown-client', 'play.pokemonshowdown.com');

function loadRuntime() {
	const source = fs.readFileSync(path.join(clientRoot, 'js', 'localization-zh-hans.js'), 'utf8');
	const context = {window: {}};
	vm.runInNewContext(source, context, {timeout: 3_000});
	return {localizer: context.window.PSLocalizer, source};
}

test('official localization catalogs have complete coverage', () => {
	const coverage = JSON.parse(fs.readFileSync(path.join(root, 'localization', 'generated', 'coverage.json')));
	for (const category of ['species', 'moves', 'abilities', 'items', 'natures']) {
		assert.equal(coverage.catalogs[category].current.coverage, 100, category);
	}
});

test('runtime translates names and resolves Chinese searches to protocol IDs', () => {
	const {localizer} = loadRuntime();
	assert.equal(localizer.name('species', 'pikachu', 'Pikachu'), '皮卡丘');
	assert.equal(localizer.name('moves', 'thunderbolt', 'Thunderbolt'), '十万伏特');
	assert.equal(localizer.name('items', 'prettyfeather', 'Pretty Feather'), '美丽之羽');
	assert.equal(localizer.exact('(no item)'), '（无道具）');
	assert.deepEqual(Array.from(localizer.search('十万伏特', 'move')[0]), ['move', 'thunderbolt']);
	assert.equal(localizer.catalog.species.syclar, undefined, 'CAP species must stay out of the official catalog');
});

test('runtime reuses battle rules and provides a guarded DOM observer', () => {
	const {localizer, source} = loadRuntime();
	assert.equal(localizer.battle('Pikachu used '), '皮卡丘使出了');
	assert.equal(localizer.battle('The opposing Pikachu fainted!'), '对手的皮卡丘倒下了！');
	assert.equal(typeof localizer.installDOM, 'function');
	assert.match(source, /MutationObserver/);
	assert.match(source, /username\|usernametext\|chat\|message-pm\|userlist/);
});

test('client loads locale before localized components', () => {
	const html = fs.readFileSync(path.join(clientRoot, 'index-new.html'), 'utf8');
	const runtime = html.indexOf('/js/localization-zh-hans.js?');
	const core = html.indexOf('/js/client-core.js?');
	const preact = html.indexOf('/js/lib/preact.min.js?');
	const init = html.indexOf('/js/localization-preact-init.js?');
	const panels = html.indexOf('/js/panels.js?');
	assert.ok(runtime >= 0 && runtime < core);
	assert.ok(preact >= 0 && preact < init && init < panels);
});

test('localized client keeps protocol values and chat content untouched', () => {
	const searchResults = fs.readFileSync(path.join(clientRoot, 'src', 'battle-searchresults.tsx'), 'utf8');
	const battleLog = fs.readFileSync(path.join(clientRoot, 'src', 'battle-log.ts'), 'utf8');
	assert.match(searchResults, /data-entry="pokemon\|\$\{escapeHTML\(pokemon\.name\)\}"/);
	assert.match(searchResults, /data-entry="item\|\$\{escapeHTML\(item\.name\)\}"/);
	assert.match(searchResults, /data-entry="ability\|\$\{escapeHTML\(ability\.name\)\}"/);
	assert.match(searchResults, /const entry = slot \? `move\|\$\{move\.name\}\|\$\{slot\}` : `move\|\$\{move\.name\}`/);
	assert.match(battleLog, /if \(!node\.classList\.contains\('chat'\) \|\| node\.classList\.contains\('message-error'\)\)/);
});

test('generated browser assets are syntactically valid', () => {
	const runtime = fs.readFileSync(path.join(clientRoot, 'js', 'localization-zh-hans.js'), 'utf8');
	const init = fs.readFileSync(path.join(clientRoot, 'js', 'localization-preact-init.js'), 'utf8');
	assert.doesNotThrow(() => new vm.Script(runtime));
	assert.doesNotThrow(() => new vm.Script(init));
	assert.match(init, /installDOM\(document\.body\)/);
});

test('local server login bypasses the unreachable public login service', () => {
	const clientMain = fs.readFileSync(path.join(clientRoot, 'src', 'client-main.ts'), 'utf8');
	const connection = fs.readFileSync(path.join(clientRoot, 'src', 'client-connection.ts'), 'utf8');
	const mainMenu = fs.readFileSync(path.join(clientRoot, 'src', 'panel-mainmenu.tsx'), 'utf8');
	const chat = fs.readFileSync(path.join(clientRoot, 'src', 'panel-chat.tsx'), 'utf8');
	const battle = fs.readFileSync(path.join(clientRoot, 'src', 'panel-battle.tsx'), 'utf8');
	assert.match(clientMain, /if \(Config\.localAuth\)/);
	assert.match(clientMain, /PS\.send\(`\/trn \$\{name\},0,`\)/);
	assert.match(clientMain, /localAuth\?: boolean/);
	assert.match(connection, /if \(Config\.localAuth\) return Promise\.resolve\(null\)/);
	assert.match(mainMenu, /if \(!Config\.localAuth\) PS\.teams\.loadRemoteTeams\(\)/);
	assert.match(chat, /Config\.localAuth \|\| PS\.teams\.usesLocalLadder/);
	assert.match(battle, /!Config\.localAuth && <button class="button" data-cmd="\/savereplay">/);

	const packager = fs.readFileSync(path.join(root, 'scripts', 'package-client.mjs'), 'utf8');
	assert.match(packager, /Config\.localAuth = \$\{!registered\}/);

	const nginx = fs.readFileSync(path.join(root, 'deploy', 'nginx-pokemon-showdown-client.conf'), 'utf8');
	const serverConfig = fs.readFileSync(path.join(root, 'deploy', 'pokemon-showdown', 'config.js'), 'utf8');
	assert.match(nginx, /return 200 '\]null'/);
	assert.match(serverConfig, /loginserver = 'http:\/\/127\.0\.0\.1:8080\/~~showdown\/'/);
});

test('standalone userscript works without a self-hosted server', () => {
	const userscript = fs.readFileSync(path.join(root, 'release', 'pokemon-showdown-zh-hans.user.js'), 'utf8');
	assert.match(userscript, /@match\s+https:\/\/play\.pokemonshowdown\.com\/\*/);
	assert.match(userscript, /installStandaloneZhHans/);
	assert.match(userscript, /installChineseSearch/);
	assert.equal(userscript.includes('PS_SERVER_HOST'), false);
	assert.doesNotThrow(() => new vm.Script(userscript));
});
