import { describe, it, expect, beforeEach, vi } from 'vitest';

beforeEach(() => {
	vi.resetModules();
	document.body.innerHTML = `<button id="scroller"></button>`;
	Object.defineProperty(window, 'innerHeight', {
		writable: true,
		configurable: true,
		value: 100,
	});
	Object.defineProperty(window, 'pageYOffset', {
		writable: true,
		configurable: true,
		value: 0,
	});
	window.scrollTo = vi.fn();
});

describe('scroller.js', () => {
	it('toggles active class on scroll', async () => {
		await import('../src/js/common/scroller.js');
		document.dispatchEvent(new Event('DOMContentLoaded'));
		window.pageYOffset = 150;
		window.dispatchEvent(new Event('scroll'));
		const scroller = document.getElementById('scroller');
		expect(scroller.classList.contains('scroller--active')).toBe(true);

		window.pageYOffset = 50;
		window.dispatchEvent(new Event('scroll'));
		expect(scroller.classList.contains('scroller--active')).toBe(false);
	});

	it('scrolls to top on click', async () => {
		await import('../src/js/common/scroller.js');
		document.dispatchEvent(new Event('DOMContentLoaded'));
		const scroller = document.getElementById('scroller');
		scroller.click();
		expect(window.scrollTo).toHaveBeenCalledWith({
			top: 0,
			left: 0,
			behavior: 'smooth',
		});
	});
});
