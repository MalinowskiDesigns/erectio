document.addEventListener('DOMContentLoaded', () => {
	document.querySelectorAll('.consequences__iframe').forEach((iframe) => {
		iframe.dataset.src = iframe.getAttribute('src');
		iframe.removeAttribute('src');
	});
});

document.addEventListener('click', (e) => {
	const thumb = e.target.closest('.consequences__thumbnail');
	if (!thumb) return;

	const wrapper = thumb.closest('.consequences__video');
	if (!wrapper || wrapper.classList.contains('is-playing')) return;

	const iframe = wrapper.querySelector('.consequences__iframe');
	if (!iframe) return;

	const realSrc = iframe.dataset.src;
	if (realSrc) iframe.src = realSrc;

	wrapper.classList.add('is-playing');
});
