import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

let jsonData;

beforeAll(() => {
	const jsonPath = path.resolve(__dirname, '../data/specialists.json');
	jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
	if (!window.matchMedia) {
		window.matchMedia = () => ({
			matches: true,
			media: '',
			addListener: () => {},
			removeListener: () => {},
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: () => false,
		});
	}
});

beforeEach(() => {
	vi.resetModules();
	global.fetch = vi.fn(() =>
		Promise.resolve({ json: () => Promise.resolve(jsonData) })
	);

	document.body.innerHTML = `
    <div class="map__poland">
      <svg id="poland-map">
        <path id="dolnośląskie"></path>
        <path id="kujawskopomorskie"></path>
        <path id="łódzkie"></path>
        <path id="warmińskomazurskie"></path>
        <path id="invalid-region"></path>
      </svg>
    </div>
    <select id="specialist-select">
      <option value="" disabled selected>Wybierz województwo</option>
      <option value="dolnośląskie">Dolnośląskie</option>
      <option value="kujawskopomorskie">Kujawsko-Pomorskie</option>
      <option value="łódzkie">Łódzkie</option>
	  <option value="warmińskomazurskie">Warmińsko-Mazurskie</option>
    </select>
    <ul class="map__specialists-items"></ul>
  `;
});

describe('specialists.js integration', () => {
	it('renders specialists list and highlights region on map click', async () => {
		await import('../src/js/specialists.js');
		document.dispatchEvent(new Event('DOMContentLoaded'));
		await new Promise((r) => setTimeout(r, 0));

		const pathEl = document.querySelector('#dolnośląskie');
		pathEl.dispatchEvent(new Event('click'));
		await new Promise((r) => setTimeout(r, 0));

		const items = document.querySelectorAll('.map__specialists-item');
		expect(items.length).toBeGreaterThan(0);
		expect(pathEl.getAttribute('fill')).toBe('#387AAC');
		expect(document.getElementById('specialist-select').value).toBe(
			'dolnośląskie'
		);
	});

	it('shows empty message for region without specialists', async () => {
		await import('../src/js/specialists.js');
		document.dispatchEvent(new Event('DOMContentLoaded'));
		await new Promise((r) => setTimeout(r, 0));

		const pathEl = document.querySelector('#kujawskopomorskie');
		pathEl.dispatchEvent(new Event('click'));
		await new Promise((r) => setTimeout(r, 0));

		const caption = document.querySelector('.map__specialists-caption');
		expect(caption.textContent).toMatch(/Brak specjalistów/);
		expect(document.getElementById('specialist-select').value).toBe(
			'kujawskopomorskie'
		);
	});

	it('fetches data on module load', async () => {
		await import('../src/js/specialists.js');
		document.dispatchEvent(new Event('DOMContentLoaded'));
		await new Promise((r) => setTimeout(r, 0));

		expect(global.fetch).toHaveBeenCalledTimes(1);
		expect(global.fetch).toHaveBeenCalledWith('./data/specialists.json');
	});

	it('updates specialists and map on dropdown change', async () => {
		await import('../src/js/specialists.js');
		document.dispatchEvent(new Event('DOMContentLoaded'));
		await new Promise((r) => setTimeout(r, 0));

		const dropdown = document.getElementById('specialist-select');
		dropdown.value = 'dolnośląskie';
		dropdown.dispatchEvent(new Event('change'));
		await new Promise((r) => setTimeout(r, 0));

		const pathEl = document.querySelector('#dolnośląskie');
		const items = document.querySelectorAll('.map__specialists-item');
		expect(pathEl.getAttribute('fill')).toBe('#387AAC');
		expect(items.length).toBeGreaterThan(0);
	});

	it('resets previous region highlight when selecting a new one', async () => {
		await import('../src/js/specialists.js');
		document.dispatchEvent(new Event('DOMContentLoaded'));
		await new Promise((r) => setTimeout(r, 0));

		const dol = document.querySelector('#dolnośląskie');
		const lod = document.querySelector('#łódzkie');

		dol.dispatchEvent(new Event('click'));
		await new Promise((r) => setTimeout(r, 0));

		lod.dispatchEvent(new Event('click'));
		await new Promise((r) => setTimeout(r, 0));

		expect(dol.getAttribute('fill')).toBe('#e1e5ee');
		expect(lod.getAttribute('fill')).toBe('#387AAC');
		expect(document.getElementById('specialist-select').value).toBe('łódzkie');
	});

	it('handles diacritics mismatch when selecting from dropdown', async () => {
		await import('../src/js/specialists.js');
		document.dispatchEvent(new Event('DOMContentLoaded'));
		await new Promise((r) => setTimeout(r, 0));

		const dropdown = document.getElementById('specialist-select');
		dropdown.value = 'warmińskomazurskie';
		dropdown.dispatchEvent(new Event('change'));
		await new Promise((r) => setTimeout(r, 0));

		const pathEl = document.querySelector('#warmińskomazurskie');
		const caption = document.querySelector('.map__specialists-caption');
		expect(pathEl.getAttribute('fill')).toBe('#387AAC');
		expect(caption.textContent).toMatch(/Brak specjalistów/);
		expect(dropdown.value).toBe('warmińskomazurskie');
	});

	it('updates dropdown when clicking region with hyphenated id', async () => {
		await import('../src/js/specialists.js');
		document.dispatchEvent(new Event('DOMContentLoaded'));
		await new Promise((r) => setTimeout(r, 0));

		const pathEl = document.querySelector('#warmińskomazurskie');
		pathEl.dispatchEvent(new Event('click'));
		await new Promise((r) => setTimeout(r, 0));

		expect(pathEl.getAttribute('fill')).toBe('#387AAC');
		expect(document.getElementById('specialist-select').value).toBe(
			'warmińskomazurskie'
		);
	});

	it('ignores clicks for regions missing in JSON', async () => {
		await import('../src/js/specialists.js');
		document.dispatchEvent(new Event('DOMContentLoaded'));
		await new Promise((r) => setTimeout(r, 0));

		const valid = document.querySelector('#dolnośląskie');
		valid.dispatchEvent(new Event('click'));
		await new Promise((r) => setTimeout(r, 0));
		const itemsBefore = document.querySelectorAll(
			'.map__specialists-item'
		).length;

		const invalid = document.querySelector('#invalid-region');
		invalid.dispatchEvent(new Event('click'));
		await new Promise((r) => setTimeout(r, 0));

		const itemsAfter = document.querySelectorAll(
			'.map__specialists-item'
		).length;
		expect(document.getElementById('specialist-select').value).toBe(
			'dolnośląskie'
		);
		expect(valid.getAttribute('fill')).toBe('#387AAC');
		expect(itemsAfter).toBe(itemsBefore);
	});

	it('keeps highlight when clicking the same region again', async () => {
		await import('../src/js/specialists.js');
		document.dispatchEvent(new Event('DOMContentLoaded'));
		await new Promise((r) => setTimeout(r, 0));

		const pathEl = document.querySelector('#dolnośląskie');
		pathEl.dispatchEvent(new Event('click'));
		await new Promise((r) => setTimeout(r, 0));
		const htmlBefore = document.querySelector(
			'.map__specialists-items'
		).innerHTML;

		pathEl.dispatchEvent(new Event('click'));
		await new Promise((r) => setTimeout(r, 0));

		const htmlAfter = document.querySelector(
			'.map__specialists-items'
		).innerHTML;
		expect(pathEl.getAttribute('fill')).toBe('#387AAC');
		expect(htmlAfter).toBe(htmlBefore);
		expect(global.fetch).toHaveBeenCalledTimes(1);
	});
});
