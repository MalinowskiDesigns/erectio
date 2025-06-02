document.addEventListener('DOMContentLoaded', () => {
	// ===== 1. Toggle całej listy (hamburger) =====
	const navToggle = document.querySelector('.nav__toggle');
	const navList = document.getElementById(
		navToggle.getAttribute('aria-controls')
	);

	navToggle.addEventListener('click', () => {
		const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
		navToggle.setAttribute('aria-expanded', String(!isOpen));
		navList.classList.toggle('nav__list--open', !isOpen);
	});

	// ===== 2. Toggle każdego dropdownu =====
	const dropdownItems = document.querySelectorAll('.nav__item--dropdown');

	dropdownItems.forEach((item) => {
		// triggerem jest link z aria-haspopup="true"
		const trigger = item.querySelector('[aria-haspopup="true"]');
		if (!trigger) return;

		// dbamy o dostępność: aria-expanded na <li>, nie na <a>
		item.setAttribute('aria-expanded', 'false');

		trigger.addEventListener('click', (e) => {
			e.preventDefault(); // blokujemy domyślne przejście
			const isOpen = item.getAttribute('aria-expanded') === 'true';
			item.setAttribute('aria-expanded', String(!isOpen));
		});
	});
});
