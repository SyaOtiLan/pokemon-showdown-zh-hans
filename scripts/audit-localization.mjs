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

fs.mkdirSync(outputDir, {recursive: true});
fs.writeFileSync(path.join(outputDir, 'userscript-dictionary.json'), `${JSON.stringify(translations, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, 'coverage.json'), `${JSON.stringify(summary, null, 2)}\n`);
for (const [category, result] of Object.entries(results)) {
	fs.writeFileSync(path.join(outputDir, `${category}.json`), `${JSON.stringify(result.translated, null, 2)}\n`);
	fs.writeFileSync(path.join(outputDir, `${category}.missing.json`), `${JSON.stringify(result.missing, null, 2)}\n`);
}

const clientCatalog = Object.fromEntries(Object.entries(results).map(([category, result]) => [
	category,
	Object.fromEntries(result.translated.map(entry => [entry.id, entry.zhHans])),
]));
fs.writeFileSync(path.join(outputDir, 'catalog.zh-Hans.json'), `${JSON.stringify(clientCatalog, null, 2)}\n`);

console.log(JSON.stringify(summary, null, 2));
