document.addEventListener('DOMContentLoaded', () => {
	// Pobierz wszystkie iframe i ustaw ich dane-src
	document
		.querySelectorAll('.consequences__iframe, .hero__iframe')
		.forEach((iframe) => {
			iframe.dataset.src = iframe.getAttribute('src');
			iframe.removeAttribute('src');
		});
});

document.addEventListener('click', (e) => {
	// Obsługa kliknięcia w miniaturkę wideo
	const thumb = e.target.closest('.consequences__thumbnail, .hero__thumbnail');
	if (!thumb) return;

	// Znajdź wrapper wideo
	const wrapper = thumb.closest('.consequences__video, .hero__video');
	if (!wrapper || wrapper.classList.contains('is-playing')) return;

	// Pobierz iframe wideo
	const iframe = wrapper.querySelector('.consequences__iframe, .hero__iframe');
	if (!iframe) return;

	// Ustaw src iframe i aktywuj odtwarzanie
	const realSrc = iframe.dataset.src;
	if (realSrc) iframe.src = realSrc;

	wrapper.classList.add('is-playing');
});
