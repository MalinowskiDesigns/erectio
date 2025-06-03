import { describe, it, expect, beforeEach, beforeAll } from 'vitest';

// dynamic import inside test after DOM is ready

beforeAll(() => {
  if (!window.matchMedia) {
    window.matchMedia = () => ({
      matches: false,
      media: "",
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }
});

beforeEach(() => {
  document.body.innerHTML = `
    <button class="nav__toggle" aria-controls="nav" aria-expanded="false"></button>
    <ul id="nav" class="nav__list"></ul>
  `;
});

describe('nav-handle', () => {
  it('toggles aria-expanded and open class on click', async () => {
    await import('../src/js/common/nav-handle.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    const navToggle = document.querySelector('.nav__toggle');
    const navList = document.getElementById('nav');

    navToggle.click();
    expect(navToggle.getAttribute('aria-expanded')).toBe('true');
    expect(navList.classList.contains('nav__list--open')).toBe(true);

    navToggle.click();
    expect(navToggle.getAttribute('aria-expanded')).toBe('false');
    expect(navList.classList.contains('nav__list--open')).toBe(false);
  });
});
