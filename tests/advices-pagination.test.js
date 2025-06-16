import { describe, it, expect, beforeEach, vi } from 'vitest';

beforeEach(() => {
	vi.resetModules();
	document.body.innerHTML = `
        <section>
            <ul class="advices__list">
                <li class="advices__item">A1</li>
                <li class="advices__item">A2</li>
                <li class="advices__item">A3</li>
                <li class="advices__item">A4</li>
                <li class="advices__item">A5</li>
                <li class="advices__item">A6</li>
                <li class="advices__item">A7</li>
            </ul>
            <ul class="advices__pagination">
                <li class="advices__pagination-item advices__pagination-item--prev">
                    <button class="advices__pagination-btn" type="button">
                        <span class="advices__pagination-arrow"></span>
                    </button>
                </li>
                <li class="advices__pagination-item advices__pagination-item--num">
                    <button class="advices__pagination-btn" type="button">1</button>
                </li>
                <li class="advices__pagination-item advices__pagination-item--num">
                    <button class="advices__pagination-btn" type="button">2</button>
                </li>
                <li class="advices__pagination-item advices__pagination-item--num">
                    <button class="advices__pagination-btn" type="button">3</button>
                </li>
                <li class="advices__pagination-item advices__pagination-item--next">
                    <button class="advices__pagination-btn" type="button">
                        <span class="advices__pagination-arrow"></span>
                    </button>
                </li>
            </ul>
        </section>
    `;
});

describe('advices-pagination.js', () => {
	it('shows only first 4 articles on load', async () => {
		await import('../src/js/advices-pagination.js');
		document.dispatchEvent(new Event('DOMContentLoaded'));
		const items = Array.from(document.querySelectorAll('.advices__item'));
		expect(items.slice(0, 4).every((i) => i.style.display === '')).toBe(true);
		expect(items.slice(4).every((i) => i.style.display === 'none')).toBe(true);
	});

	it('marks first page as active and disables prev button on load', async () => {
		await import('../src/js/advices-pagination.js');
		document.dispatchEvent(new Event('DOMContentLoaded'));
		const pagNums = document.querySelectorAll('.advices__pagination-item--num');
		const prevBtn = document.querySelector(
			'.advices__pagination-item--prev .advices__pagination-btn'
		);
		expect(
			pagNums[0].classList.contains('advices__pagination-item--active')
		).toBe(true);
		expect(prevBtn.disabled).toBe(true);
		expect(prevBtn.getAttribute('aria-disabled')).toBe('true');
	});

	it('shows correct articles and updates pagination on page 2 click', async () => {
		await import('../src/js/advices-pagination.js');
		document.dispatchEvent(new Event('DOMContentLoaded'));
		const pagNums = document.querySelectorAll('.advices__pagination-item--num');
		const btn2 = pagNums[1].querySelector('.advices__pagination-btn');
		btn2.click();
		const items = Array.from(document.querySelectorAll('.advices__item'));
		expect(items[0].style.display).toBe('none');
		expect(items[3].style.display).toBe('none');
		expect(items[4].style.display).toBe('');
		expect(items[5].style.display).toBe('');
		expect(items[6].style.display).toBe('');
		expect(
			pagNums[1].classList.contains('advices__pagination-item--active')
		).toBe(true);
	});

	it('disables next button on last page', async () => {
		await import('../src/js/advices-pagination.js');
		document.dispatchEvent(new Event('DOMContentLoaded'));
		const pagNums = document.querySelectorAll('.advices__pagination-item--num');
		const btn3 = pagNums[2].querySelector('.advices__pagination-btn');
		btn3.click();
		const nextBtn = document.querySelector(
			'.advices__pagination-item--next .advices__pagination-btn'
		);
		expect(nextBtn.disabled).toBe(true);
		expect(nextBtn.getAttribute('aria-disabled')).toBe('true');
	});

	it('enables prev button and disables next button on last page', async () => {
		await import('../src/js/advices-pagination.js');
		document.dispatchEvent(new Event('DOMContentLoaded'));
		const pagNums = document.querySelectorAll('.advices__pagination-item--num');
		const btn3 = pagNums[2].querySelector('.advices__pagination-btn');
		btn3.click();
		const prevBtn = document.querySelector(
			'.advices__pagination-item--prev .advices__pagination-btn'
		);
		const nextBtn = document.querySelector(
			'.advices__pagination-item--next .advices__pagination-btn'
		);
		expect(prevBtn.disabled).toBe(false);
		expect(nextBtn.disabled).toBe(true);
	});

	it('navigates to next and previous page with arrow buttons', async () => {
		await import('../src/js/advices-pagination.js');
		document.dispatchEvent(new Event('DOMContentLoaded'));
		const nextBtn = document.querySelector(
			'.advices__pagination-item--next .advices__pagination-btn'
		);
		const prevBtn = document.querySelector(
			'.advices__pagination-item--prev .advices__pagination-btn'
		);
		nextBtn.click();
		let items = Array.from(document.querySelectorAll('.advices__item'));
		expect(items[4].style.display).toBe('');
		expect(items[0].style.display).toBe('none');
		prevBtn.click();
		items = Array.from(document.querySelectorAll('.advices__item'));
		expect(items[0].style.display).toBe('');
		expect(items[4].style.display).toBe('none');
	});

	it('does not break if clicking disabled prev/next', async () => {
		await import('../src/js/advices-pagination.js');
		document.dispatchEvent(new Event('DOMContentLoaded'));
		const prevBtn = document.querySelector(
			'.advices__pagination-item--prev .advices__pagination-btn'
		);
		prevBtn.click();
		const items = Array.from(document.querySelectorAll('.advices__item'));
		expect(items[0].style.display).toBe('');
	});

	it('hides extra pagination items if more than totalPages', async () => {
		document.body.innerHTML += `
            <li class="advices__pagination-item advices__pagination-item--num">
                <button class="advices__pagination-btn" type="button">4</button>
            </li>
            <li class="advices__pagination-item advices__pagination-item--num">
                <button class="advices__pagination-btn" type="button">5</button>
            </li>
        `;
		await import('../src/js/advices-pagination.js');
		document.dispatchEvent(new Event('DOMContentLoaded'));
		const pagNums = Array.from(
			document.querySelectorAll('.advices__pagination-item--num')
		);
		expect(pagNums[3].style.display).toBe('none');
		expect(pagNums[4].style.display).toBe('none');
	});
});
