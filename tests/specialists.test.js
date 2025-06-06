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
        <path id="kujawsko-pomorskie"></path>
        <path id="łódzkie"></path>
      </svg>
    </div>
    <select id="specialist-select">
      <option value="" disabled selected>Wybierz województwo</option>
      <option value="dolnośląskie">Dolnośląskie</option>
      <option value="kujawskopomorskie">Kujawsko-Pomorskie</option>
      <option value="łódzkie">Łódzkie</option>
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
		expect(pathEl.getAttribute('fill')).toBe('#387ABC');
		expect(document.getElementById('specialist-select').value).toBe(
			'dolnośląskie'
		);
	});

	it('shows empty message for region without specialists', async () => {
		await import('../src/js/specialists.js');
		document.dispatchEvent(new Event('DOMContentLoaded'));
		await new Promise((r) => setTimeout(r, 0));

		const pathEl = document.querySelector('#kujawsko-pomorskie');
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
		expect(pathEl.getAttribute('fill')).toBe('#387ABC');
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
		expect(lod.getAttribute('fill')).toBe('#387ABC');
		expect(document.getElementById('specialist-select').value).toBe('łódzkie');
	});
});
