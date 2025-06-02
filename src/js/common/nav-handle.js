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

	// ===== 2. Toggle każdego dropdownu (różne dla hover/klawisz) =====
	const dropdownItems = document.querySelectorAll('.nav__item--dropdown');
	const isHoverable = window.matchMedia('(hover: hover)').matches;

	dropdownItems.forEach((item) => {
		const trigger = item.querySelector('[aria-haspopup="true"]');
		if (!trigger) return;

		// Na początku ustawiamy aria-expanded na false
		item.setAttribute('aria-expanded', 'false');

		if (isHoverable) {
			// === DESKTOP Z KURSOREM ===
			// Przy najechaniu: aria-expanded="true"
			item.addEventListener('mouseenter', () => {
				item.setAttribute('aria-expanded', 'true');
			});

			// Przy opuszczeniu kursora: aria-expanded="false"
			item.addEventListener('mouseleave', () => {
				item.setAttribute('aria-expanded', 'false');
			});

			// Nie podsłuchujemy kliknięcia na trigger, żeby kliknięcie nie kolidowało z hover
		} else {
			// === URZĄDZENIE DOTYKOWE ===
			trigger.addEventListener('click', (e) => {
				e.preventDefault(); // blokujemy domyślne przejście
				const isOpen = item.getAttribute('aria-expanded') === 'true';
				item.setAttribute('aria-expanded', String(!isOpen));
			});
		}
	});
});
