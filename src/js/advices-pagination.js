// Skrypt obsługujący paginację sekcji "Porady eksperckie"

document.addEventListener('DOMContentLoaded', function () {
	const advicesItems = Array.from(document.querySelectorAll('.advices__item'));
	const pagination = document.querySelector('.advices__pagination');
	const paginationItems = Array.from(
		document.querySelectorAll('.advices__pagination-item--num')
	);
	const prevBtn = document.querySelector(
		'.advices__pagination-item--prev .advices__pagination-btn'
	);
	const nextBtn = document.querySelector(
		'.advices__pagination-item--next .advices__pagination-btn'
	);

	const ARTICLES_PER_PAGE = 4;
	const totalArticles = advicesItems.length;
	const totalPages = Math.ceil(totalArticles / ARTICLES_PER_PAGE);

	let currentPage = 1;

	// Funkcja do aktualizacji widoczności artykułów
	function showPage(page) {
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;
        const startIdx = (page - 1) * ARTICLES_PER_PAGE;
        const endIdx = startIdx + ARTICLES_PER_PAGE;
        advicesItems.forEach((item, idx) => {
            if (idx >= startIdx && idx < endIdx) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    }

	// Funkcja do aktualizacji stanu paginacji
	function updatePagination(page) {
        // Ogranicz currentPage do zakresu 1...totalPages
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;
        currentPage = page;

		// Aktualizacja przycisków numerycznych
		paginationItems.forEach((li, idx) => {
			const btn = li.querySelector('.advices__pagination-btn');
			const pageNum = idx + 1;

			if (pageNum === page) {
				li.classList.add('advices__pagination-item--active');
				btn.setAttribute('aria-current', 'page');
				btn.setAttribute('aria-label', 'Bieżąca strona');
				btn.setAttribute('title', 'Bieżąca strona');
				btn.setAttribute('aria-disabled', 'true');
				btn.disabled = true;
			} else {
				li.classList.remove('advices__pagination-item--active');
				btn.setAttribute('aria-current', 'false');
				btn.setAttribute('aria-label', `Strona ${pageNum}`);
				btn.setAttribute('title', `Strona ${pageNum}`);
				btn.setAttribute('aria-disabled', 'false');
				btn.disabled = false;
			}
		});

		// Przycisk "Poprzednia"
		if (page === 1) {
			prevBtn.classList.add('advices__pagination-btn--disabled');
			prevBtn.setAttribute('aria-disabled', 'true');
			prevBtn.setAttribute('title', 'Poprzednia strona');
			prevBtn.setAttribute('aria-label', 'Poprzednia strona');
			prevBtn.disabled = true;
			const prevSvg = prevBtn.querySelector('.advices__pagination-arrow');
			if (prevSvg) prevSvg.classList.add('advices__pagination-arrow--disabled');
		} else {
			prevBtn.classList.remove('advices__pagination-btn--disabled');
			prevBtn.setAttribute('aria-disabled', 'false');
			prevBtn.setAttribute('title', 'Poprzednia strona');
			prevBtn.setAttribute('aria-label', 'Poprzednia strona');
			prevBtn.disabled = false;
			const prevSvg = prevBtn.querySelector('.advices__pagination-arrow');
			if (prevSvg)
				prevSvg.classList.remove('advices__pagination-arrow--disabled');
		}

		// Przycisk "Następna"
		if (page === totalPages) {
			nextBtn.classList.add('advices__pagination-btn--disabled');
			nextBtn.setAttribute('aria-disabled', 'true');
			nextBtn.setAttribute('title', 'Następna strona');
			nextBtn.setAttribute('aria-label', 'Następna strona');
			nextBtn.disabled = true;
			const nextSvg = nextBtn.querySelector('.advices__pagination-arrow');
			if (nextSvg) nextSvg.classList.add('advices__pagination-arrow--disabled');
		} else {
			nextBtn.classList.remove('advices__pagination-btn--disabled');
			nextBtn.setAttribute('aria-disabled', 'false');
			nextBtn.setAttribute('title', 'Następna strona');
			nextBtn.setAttribute('aria-label', 'Następna strona');
			nextBtn.disabled = false;
			const nextSvg = nextBtn.querySelector('.advices__pagination-arrow');
			if (nextSvg)
				nextSvg.classList.remove('advices__pagination-arrow--disabled');
		}
	}

	// Obsługa kliknięć w paginacji
	function onPaginationClick(e) {
        const btn = e.target.closest('.advices__pagination-btn');
        if (!btn || btn.disabled) return;

        // Przycisk numeryczny
        if (btn.parentElement.classList.contains('advices__pagination-item--num')) {
            const idx = paginationItems.findIndex((li) => li.contains(btn));
            if (idx !== -1) {
                currentPage = idx + 1;
            }
        }

        // Przycisk "Poprzednia"
        if (
            btn.parentElement.classList.contains('advices__pagination-item--prev')
        ) {
            if (currentPage > 1) {
                currentPage--;
            }
        }

        // Przycisk "Następna"
        if (
            btn.parentElement.classList.contains('advices__pagination-item--next')
        ) {
            if (currentPage < totalPages) {
                currentPage++;
            }
        }

        showPage(currentPage);
        updatePagination(currentPage);
    }

	// Inicjalizacja
	function init() {
		// Ukryj wszystkie artykuły poza pierwszą stroną
		showPage(currentPage);
		updatePagination(currentPage);

		// Obsługa kliknięć
		pagination.addEventListener('click', onPaginationClick);

		// Dla bezpieczeństwa: jeśli liczba stron w paginacji jest większa niż totalPages, ukryj nadmiarowe
		if (paginationItems.length > totalPages) {
			for (let i = totalPages; i < paginationItems.length; i++) {
				paginationItems[i].style.display = 'none';
			}
		}
	}

	init();
});
