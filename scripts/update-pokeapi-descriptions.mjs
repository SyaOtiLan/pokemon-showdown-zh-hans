#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const outputPath = path.join(root, 'localization', 'external', 'pokeapi-descriptions.zh-Hans.json');
const baseUrl = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv';
const languageId = '12';

const files = {
	versionGroups: 'version_groups.csv',
	moves: 'moves.csv',
	moveFlavor: 'move_flavor_text.csv',
	abilities: 'abilities.csv',
	abilityFlavor: 'ability_flavor_text.csv',
	items: 'items.csv',
	itemFlavor: 'item_flavor_text.csv',
};

function parseCSV(text) {
	const rows = [];
	let row = [];
	let cell = '';
	let quoted = false;

	for (let i = 0; i < text.length; i++) {
		const char = text[i];
		if (quoted) {
			if (char === '"' && text[i + 1] === '"') {
				cell += '"';
				i++;
			} else if (char === '"') {
				quoted = false;
			} else {
				cell += char;
			}
			continue;
		}
		if (char === '"') {
			quoted = true;
		} else if (char === ',') {
			row.push(cell);
			cell = '';
		} else if (char === '\n') {
			row.push(cell);
			rows.push(row);
			row = [];
			cell = '';
		} else if (char !== '\r') {
			cell += char;
		}
	}
	if (cell || row.length) {
		row.push(cell);
		rows.push(row);
	}
	const [headers, ...data] = rows.filter(row => row.length && row.some(value => value !== ''));
	return data.map(row => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])));
}

async function download(filename) {
	const url = `${baseUrl}/${filename}`;
	const response = await fetch(url);
	if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
	return response.text();
}

function normalizeFlavorText(value) {
	return value
		.replace(/\u00ad/g, '')
		.replace(/\f/g, '')
		.replace(/\s*\n\s*/g, '')
		.replace(/[ \t]+/g, ' ')
		.trim();
}

function latestZhHansDescriptions(resources, flavorRows, versionGroupOrder) {
	const resourcesById = new Map(resources.map(row => [row.id, row.identifier]));
	const selected = new Map();
	for (const row of flavorRows) {
		if (row.language_id !== languageId) continue;
		const resourceId = row.move_id || row.ability_id || row.item_id;
		const identifier = resourcesById.get(resourceId);
		if (!identifier) continue;
		const order = versionGroupOrder.get(row.version_group_id) ?? Number(row.version_group_id);
		const previous = selected.get(resourceId);
		if (previous && previous.versionGroupOrder > order) continue;
		selected.set(resourceId, {
			id: Number(resourceId),
			identifier,
			zhHans: normalizeFlavorText(row.flavor_text),
			versionGroupId: Number(row.version_group_id),
			versionGroup: versionGroupOrder.names.get(row.version_group_id) || row.version_group_id,
			versionGroupOrder: order,
		});
	}
	return [...selected.values()].sort((a, b) => a.id - b.id);
}

const downloaded = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([key, filename]) => [
	key,
	parseCSV(await download(filename)),
])));

const versionGroupOrder = new Map(downloaded.versionGroups.map(row => [row.id, Number(row.order)]));
versionGroupOrder.names = new Map(downloaded.versionGroups.map(row => [row.id, row.identifier]));

const output = {
	source: `${baseUrl}/{moves,abilities,items,version_groups}.csv`,
	language: 'zh-hans',
	languageId: Number(languageId),
	categories: {
		moves: latestZhHansDescriptions(downloaded.moves, downloaded.moveFlavor, versionGroupOrder),
		abilities: latestZhHansDescriptions(downloaded.abilities, downloaded.abilityFlavor, versionGroupOrder),
		items: latestZhHansDescriptions(downloaded.items, downloaded.itemFlavor, versionGroupOrder),
	},
};

fs.mkdirSync(path.dirname(outputPath), {recursive: true});
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({
	output: path.relative(root, outputPath),
	moves: output.categories.moves.length,
	abilities: output.categories.abilities.length,
	items: output.categories.items.length,
}, null, 2));
