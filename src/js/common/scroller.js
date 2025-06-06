(() => {
	// Poczekaj, aż DOM będzie gotowy
	const domReady = () => {
		return new Promise((resolve) => {
			if (document.readyState !== 'loading') {
				resolve();
			} else {
				document.addEventListener('DOMContentLoaded', resolve);
			}
		});
	};

	domReady().then(() => {
		const scroller = document.getElementById('scroller');
		if (!scroller) return;

		// Próg przewinięcia = 1 * wysokość widoku (100vh)
		const getScrollThreshold = () => window.innerHeight;

		// Funkcja wywoływana przy scrollu
		const onScroll = () => {
			const scrolledY = window.pageYOffset || window.scrollY;
			if (scrolledY > getScrollThreshold()) {
				scroller.classList.add('scroller--active');
			} else {
				scroller.classList.remove('scroller--active');
			}
		};

		// Podłącz event listener do scrolla
		window.addEventListener('scroll', onScroll, { passive: true });

		// Obsługa kliknięcia w przycisk: płynne przewinięcie na górę
		scroller.addEventListener('click', (e) => {
			e.preventDefault();
			window.scrollTo({
				top: 0,
				left: 0,
				behavior: 'smooth',
			});
		});

		// Wywołaj raz na start, na wypadek gdyby strona została załadowana > 100vh
		onScroll();
	});
})();
