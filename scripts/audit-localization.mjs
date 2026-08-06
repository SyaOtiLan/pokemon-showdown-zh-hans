#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const userscriptPath = path.join(root, 'PSChina Server Translation SV-1.7.2.txt');
const showdownDataPath = path.join(root, 'upstream', 'pokemon-showdown', 'data');
const pkhexTextPath = path.join(root, 'upstream', 'PKHeX', 'PKHeX.Core', 'Resources', 'text');
const overridesPath = path.join(root, 'localization', 'overrides.zh-Hans.json');
const outputDir = path.join(root, 'localization', 'generated');

const typeNames = {
	Bug: '虫', Dark: '恶', Dragon: '龙', Electric: '电', Fairy: '妖精', Fighting: '格斗',
	Fire: '火', Flying: '飞行', Ghost: '幽灵', Grass: '草', Ground: '地面', Ice: '冰',
	Normal: '一般', Poison: '毒', Psychic: '超能力', Rock: '岩石', Steel: '钢', Water: '水',
};
const statNames = {
	Attack: '攻击', Defense: '防御', Speed: '速度', Accuracy: '命中率', evasiveness: '闪避率',
	'Sp. Atk': '特攻', 'Sp. Def': '特防', 'Special Attack': '特攻', 'Special Defense': '特防',
};

function readUserscriptDictionary() {
	const source = fs.readFileSync(userscriptPath, 'utf8');
	const startMarker = 'var translations = {';
	const start = source.indexOf(startMarker);
	const endMatch = /\r?\n};\r?\nfunction trans_from_dict/.exec(source.slice(start));
	const end = endMatch ? start + endMatch.index + endMatch[0].indexOf('};') + 2 : -1;
	if (start < 0 || end < 0) throw new Error('Could not locate the userscript translations object.');

	const objectLiteral = source.slice(start + 'var translations = '.length, end - 1);
	const translations = vm.runInNewContext(`(${objectLiteral})`, Object.create(null), {timeout: 1_000});
	return Object.fromEntries(Object.entries(translations));
}

function parseShowdownCatalog(filename) {
	const source = fs.readFileSync(path.join(showdownDataPath, filename), 'utf8');
	const lines = source.split(/\r?\n/);
	const entries = [];
	let current = null;

	for (const line of lines) {
		const entryMatch = line.match(/^\t(?:"([^"]+)"|([a-zA-Z0-9_]+)):\s*\{$/);
		if (entryMatch) {
			if (current?.name) entries.push(current);
			current = {
				id: entryMatch[1] ?? entryMatch[2], name: '', num: null, nonstandard: null,
				baseSpecies: null, forme: null,
			};
			continue;
		}
		if (!current) continue;

		const nameMatch = line.match(/^\t\tname:\s*(["'])(.*?)\1,/);
		if (nameMatch && !current.name) {
			current.name = vm.runInNewContext(`${nameMatch[1]}${nameMatch[2]}${nameMatch[1]}`);
		}
		const numMatch = line.match(/^\t\tnum:\s*(-?\d+),/);
		if (numMatch) current.num = Number(numMatch[1]);
		const nonstandardMatch = line.match(/^\t\tisNonstandard:\s*(["'])(.*?)\1,/);
		if (nonstandardMatch) current.nonstandard = nonstandardMatch[2];
		const baseSpeciesMatch = line.match(/^\t\tbaseSpecies:\s*(["'])(.*?)\1,/);
		if (baseSpeciesMatch) current.baseSpecies = baseSpeciesMatch[2];
		const formeMatch = line.match(/^\t\tforme:\s*(["'])(.*?)\1,/);
		if (formeMatch) current.forme = formeMatch[2];
	}
	if (current?.name) entries.push(current);
	return entries;
}

function parseShowdownTextCatalog(filename) {
	const source = fs.readFileSync(path.join(showdownDataPath, 'text', filename), 'utf8');
	const lines = source.split(/\r?\n/);
	const entries = [];
	let current = null;

	for (const line of lines) {
		const entryMatch = line.match(/^\t(?:"([^"]+)"|([a-zA-Z0-9_]+)):\s*\{$/);
		if (entryMatch) {
			if (current?.name) entries.push(current);
			current = {id: entryMatch[1] ?? entryMatch[2], name: '', desc: '', shortDesc: ''};
			continue;
		}
		if (!current) continue;

		const nameMatch = line.match(/^\t\tname:\s*(["'`])((?:\\.|(?!\1).)*)\1,/);
		if (nameMatch && !current.name) current.name = vm.runInNewContext(`${nameMatch[1]}${nameMatch[2]}${nameMatch[1]}`);
		const textMatch = line.match(/^\t\t(desc|shortDesc):\s*(["'`])((?:\\.|(?!\2).)*)\2,/);
		if (textMatch) current[textMatch[1]] = vm.runInNewContext(`${textMatch[2]}${textMatch[3]}${textMatch[2]}`);
	}
	if (current?.name) entries.push(current);
	return entries;
}

function readPkhexLists() {
	const files = {
		species: path.join(pkhexTextPath, 'other', 'zh-Hans', 'text_Species_zh-Hans.txt'),
		moves: path.join(pkhexTextPath, 'other', 'zh-Hans', 'text_Moves_zh-Hans.txt'),
		abilities: path.join(pkhexTextPath, 'other', 'zh-Hans', 'text_Abilities_zh-Hans.txt'),
		items: path.join(pkhexTextPath, 'items', 'text_Items_zh-Hans.txt'),
		natures: path.join(pkhexTextPath, 'other', 'zh-Hans', 'text_Natures_zh-Hans.txt'),
	};
	return Object.fromEntries(Object.entries(files).map(([key, filename]) => [
		key,
		fs.readFileSync(filename, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/),
	]));
}

function translateForme(forme, translations) {
	if (!forme) return null;
	const parts = forme.split('-');
	const translated = [];
	for (let start = 0; start < parts.length;) {
		let match = null;
		for (let end = parts.length; end > start; end--) {
			const key = `-${parts.slice(start, end).join('-')}`;
			if (translations[key]) {
				match = {end, value: translations[key]};
				break;
			}
		}
		if (!match) return null;
		translated.push(match.value);
		start = match.end;
	}
	return translated.join('');
}

function resolveTranslation(entry, category, translations, pkhexLists, overrides) {
	if (overrides[entry.name]) return {zhHans: overrides[entry.name], source: 'override'};
	if (translations[entry.name]) return {zhHans: translations[entry.name], source: 'userscript'};

	if (category === 'species' && entry.baseSpecies && entry.forme) {
		const base = translations[entry.baseSpecies] || (entry.num >= 0 ? pkhexLists.species[entry.num] : null);
		const forme = translateForme(entry.forme, translations);
		if (base && forme) return {zhHans: `${base}${forme}`, source: 'composed'};
	}

	const pkhexValue = entry.num >= 0 ? pkhexLists[category]?.[entry.num] : null;
	if (pkhexValue) return {zhHans: pkhexValue, source: 'pkhex'};
	return null;
}

function classify(catalog, category, translations, pkhexLists, overrides) {
	const translated = [];
	const missing = [];
	for (const entry of catalog) {
		const resolved = resolveTranslation(entry, category, translations, pkhexLists, overrides);
		(resolved ? translated : missing).push(resolved ? {...entry, ...resolved} : entry);
	}
	return {translated, missing};
}

function summarize(result) {
	const total = result.translated.length + result.missing.length;
	const isCurrentOfficial = entry => !entry.nonstandard && (entry.num === null || entry.num >= 0);
	const standardTranslated = result.translated.filter(isCurrentOfficial).length;
	const standardMissing = result.missing.filter(isCurrentOfficial).length;
	const standardTotal = standardTranslated + standardMissing;
	return {
		all: {
			total,
			translated: result.translated.length,
			coverage: total ? Number((result.translated.length / total * 100).toFixed(2)) : 0,
		},
		current: {
			total: standardTotal,
			translated: standardTranslated,
			coverage: standardTotal ? Number((standardTranslated / standardTotal * 100).toFixed(2)) : 0,
		},
	};
}

function typeZh(type) {
	return typeNames[type] || type;
}

function statZh(stat) {
	return statNames[stat] || stat;
}

function translateDescriptionPattern(value, translations) {
	if (!value) return null;
	if (translations[value]) return {zhHans: translations[value], source: 'userscript'};

	let match = value.match(/^Holder's ([A-Za-z]+)-type attacks have ([\d.]+)x power\.$/);
	if (match) return {zhHans: `携带者的${typeZh(match[1])}属性招式威力变为 ${match[2]} 倍。`, source: 'pattern'};

	match = value.match(/^Holder's ([A-Za-z]+)-type attacks have ([\d.]+)x power\. Judgment is ([A-Za-z]+) type\.$/);
	if (match) return {zhHans: `携带者的${typeZh(match[1])}属性招式威力变为 ${match[2]} 倍。制裁光砾变为${typeZh(match[3])}属性。`, source: 'pattern'};

	match = value.match(/^Holder's ([A-Za-z]+)- and ([A-Za-z]+)-type attacks have ([\d.]+)x power\.$/);
	if (match) return {zhHans: `携带者的${typeZh(match[1])}和${typeZh(match[2])}属性招式威力变为 ${match[3]} 倍。`, source: 'pattern'};

	match = value.match(/^If held by an? (.+), its ([A-Za-z]+)- and ([A-Za-z]+)-type attacks have ([\d.]+)x power\.$/);
	if (match) return {zhHans: `${translations[match[1]] || match[1]}携带时，${typeZh(match[2])}和${typeZh(match[3])}属性招式威力变为 ${match[4]} 倍。`, source: 'pattern'};

	match = value.match(/^If held by an? (.+), this item allows it to Mega Evolve(?: into (.+))? in battle\.$/);
	if (match) return {zhHans: `${translations[match[1]] || match[1]}携带后，可以在对战中超级进化${match[2] ? `为${translations[match[2]] || match[2]}` : ''}。`, source: 'pattern'};

	match = value.match(/^Raises holder's (.+) by (\d+) stage if hit by an? ([A-Za-z]+)-type attack\. Single use\.$/);
	if (match) return {zhHans: `受到${typeZh(match[3])}属性招式攻击时，携带者的${statZh(match[1])}提高 ${match[2]} 级。使用后消耗。`, source: 'pattern'};

	match = value.match(/^Raises holder's (.+) by (\d+) stage when at 1\/4 max HP or less\. Single use\.$/);
	if (match) return {zhHans: `携带者 HP 低于或等于 1/4 时，${statZh(match[1])}提高 ${match[2]} 级。使用后消耗。`, source: 'pattern'};

	match = value.match(/^Halves damage taken from a supereffective ([A-Za-z]+)-type attack\. Single use\.$/);
	if (match) return {zhHans: `受到效果绝佳的${typeZh(match[1])}属性招式攻击时，伤害减半。使用后消耗。`, source: 'pattern'};

	match = value.match(/^Holder is cured if it is (.+)\. Single use\.$/);
	if (match) return {zhHans: `携带者陷入${match[1] === 'frozen' ? '冰冻' : match[1]}状态时会治愈。使用后消耗。`, source: 'pattern'};

	match = value.match(/^User recovers (\d+)% of the damage dealt\.$/);
	if (match) return {zhHans: `使用者回复造成伤害的 ${match[1]}%。`, source: 'pattern'};

	match = value.match(/^Raises the user's (.+) by (\d+)\.$/);
	if (match) return {zhHans: `使用者的${statZh(match[1])}提高 ${match[2]} 级。`, source: 'pattern'};

	match = value.match(/^Raises the user's (.+) by (\d+) stages\.$/);
	if (match) return {zhHans: `使用者的${statZh(match[1])}提高 ${match[2]} 级。`, source: 'pattern'};

	match = value.match(/^Has a (\d+)% chance to lower the target's (.+) by (\d+) stage\.$/);
	if (match) return {zhHans: `${match[1]}% 几率令目标的${statZh(match[2])}降低 ${match[3]} 级。`, source: 'pattern'};

	match = value.match(/^Has a (\d+)% chance to make the target flinch\.$/);
	if (match) return {zhHans: `${match[1]}% 几率使目标畏缩。`, source: 'pattern'};

	if (value === "Power is equal to the base move's Z-Power.") return {zhHans: '威力等于基础招式的 Z 招式威力。', source: 'pattern'};
	if (value === 'No additional effect.') return {zhHans: '没有追加效果。', source: 'pattern'};
	if (value === 'Does nothing.') return {zhHans: '没有效果。', source: 'pattern'};
	if (value === 'Usually goes first.') return {zhHans: '通常会先制出招。', source: 'pattern'};
	if (value === 'This move does not check accuracy.') return {zhHans: '这个招式不会进行命中判定。', source: 'pattern'};
	if (value === 'High critical hit ratio.') return {zhHans: '容易击中要害。', source: 'pattern'};
	if (value === 'Very high critical hit ratio.') return {zhHans: '非常容易击中要害。', source: 'pattern'};
	return null;
}

function classifyDescriptions(textEntries, officialIds, translations) {
	const translated = [];
	const missing = [];
	const exact = {};
	for (const entry of textEntries.filter(entry => officialIds.has(entry.id))) {
		const out = {id: entry.id, name: entry.name};
		const miss = {id: entry.id, name: entry.name};
		for (const field of ['shortDesc', 'desc']) {
			if (!entry[field]) continue;
			const resolved = translateDescriptionPattern(entry[field], translations);
			if (resolved) {
				out[field] = {en: entry[field], zhHans: resolved.zhHans, source: resolved.source};
				exact[entry[field]] = resolved.zhHans;
			} else {
				miss[field] = entry[field];
			}
		}
		if (out.shortDesc || out.desc) translated.push(out);
		if (miss.shortDesc || miss.desc) missing.push(miss);
	}
	return {translated, missing, exact};
}

function summarizeDescriptions(result) {
	let translated = 0;
	let missing = 0;
	for (const entry of result.translated) translated += Number(Boolean(entry.shortDesc)) + Number(Boolean(entry.desc));
	for (const entry of result.missing) missing += Number(Boolean(entry.shortDesc)) + Number(Boolean(entry.desc));
	const total = translated + missing;
	return {total, translated, coverage: total ? Number((translated / total * 100).toFixed(2)) : 0};
}

const translations = readUserscriptDictionary();
const pkhexLists = readPkhexLists();
const overrides = JSON.parse(fs.readFileSync(overridesPath, 'utf8'));
const sources = {
	species: 'pokedex.ts',
	moves: 'moves.ts',
	abilities: 'abilities.ts',
	items: 'items.ts',
	natures: 'natures.ts',
};
const results = {};
const summary = {userscriptEntries: Object.keys(translations).length, catalogs: {}};

for (const [category, filename] of Object.entries(sources)) {
	results[category] = classify(parseShowdownCatalog(filename), category, translations, pkhexLists, overrides);
	summary.catalogs[category] = summarize(results[category]);
}

const descriptionSources = {moves: 'moves.ts', abilities: 'abilities.ts', items: 'items.ts'};
const descriptionResults = {};
const descriptionExact = {};
summary.descriptions = {};
for (const [category, filename] of Object.entries(descriptionSources)) {
	const officialIds = new Set(results[category].translated
		.filter(entry => !entry.nonstandard && (entry.num === null || entry.num >= 0))
		.map(entry => entry.id));
	descriptionResults[category] = classifyDescriptions(parseShowdownTextCatalog(filename), officialIds, translations);
	Object.assign(descriptionExact, descriptionResults[category].exact);
	summary.descriptions[category] = summarizeDescriptions(descriptionResults[category]);
}

fs.mkdirSync(outputDir, {recursive: true});
fs.writeFileSync(path.join(outputDir, 'userscript-dictionary.json'), `${JSON.stringify(translations, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, 'description-dictionary.json'), `${JSON.stringify(descriptionExact, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, 'coverage.json'), `${JSON.stringify(summary, null, 2)}\n`);
for (const [category, result] of Object.entries(results)) {
	fs.writeFileSync(path.join(outputDir, `${category}.json`), `${JSON.stringify(result.translated, null, 2)}\n`);
	fs.writeFileSync(path.join(outputDir, `${category}.missing.json`), `${JSON.stringify(result.missing, null, 2)}\n`);
}
for (const [category, result] of Object.entries(descriptionResults)) {
	fs.writeFileSync(path.join(outputDir, `${category}-descriptions.json`), `${JSON.stringify(result.translated, null, 2)}\n`);
	fs.writeFileSync(path.join(outputDir, `${category}-descriptions.missing.json`), `${JSON.stringify(result.missing, null, 2)}\n`);
}

const clientCatalog = Object.fromEntries(Object.entries(results).map(([category, result]) => [
	category,
	Object.fromEntries(result.translated.map(entry => [entry.id, entry.zhHans])),
]));
fs.writeFileSync(path.join(outputDir, 'catalog.zh-Hans.json'), `${JSON.stringify(clientCatalog, null, 2)}\n`);

console.log(JSON.stringify(summary, null, 2));
