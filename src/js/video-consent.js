// src/js/video-consent.js
// ES6 module, bez bezpośrednich referencji do niezdefiniowanych identyfikatorów

class Dom {
	static qs = (sel, root = document) => root.querySelector(sel);
	static qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
	static on = (el, evt, cb, opts) => el.addEventListener(evt, cb, opts);
}

class YouTubeURL {
	static toNoCookie(url) {
		if (!url) return url;
		try {
			const u = new URL(url, location.origin);
			if (u.hostname.includes('youtube.com'))
				u.hostname = 'www.youtube-nocookie.com';
			return u.toString();
		} catch {
			return url;
		}
	}
}

class IframeHydrator {
	static hydrate(iframe) {
		if (!(iframe instanceof HTMLIFrameElement)) return;
		if (!iframe.src && iframe.dataset.src) iframe.src = iframe.dataset.src;
	}
	static dehydrate(iframe) {
		if (!(iframe instanceof HTMLIFrameElement)) return;
		const current = iframe.getAttribute('src');
		if (current) {
			iframe.dataset.src = YouTubeURL.toNoCookie(current);
			iframe.removeAttribute('src');
		} else if (iframe.dataset.src) {
			iframe.dataset.src = YouTubeURL.toNoCookie(iframe.dataset.src);
		}
	}
}

class VideoConsentController {
	/**
	 * @param {Object} config
	 * @param {Object} deps
	 * @param {any} deps.consentManager - instancja menedżera zgód (opcjonalnie)
	 * @param {any} deps.uiManager      - instancja UI managera (opcjonalnie)
	 */
	constructor(config = {}, deps = {}) {
		this.cfg = {
			wrapperSel: '[data-consent-target="video"]',
			thumbSel: '.consequences__thumbnail, .hero__thumbnail',
			iframeSel: '.consequences__iframe, .hero__iframe',
			hintSel: '.video__consent-hint',
			inlineBtnSel: '.video-consent__btn', // jeśli masz przycisk w placeholderze
			...config,
		};

		// Zależności: DI -> podane, albo z window.*, albo null (bez twardej referencji powodującej no-undef)
		this.consentManager =
			deps.consentManager ||
			(window.CookieConsentManager ? new window.CookieConsentManager() : null);
		this.uiManager =
			deps.uiManager || (window.UIManager ? new window.UIManager() : null);
	}

	init() {
		this.prepareIframes();

		Dom.on(document, 'click', (e) => this.onThumbClick(e));
		Dom.on(document, 'keydown', (e) => this.onThumbKey(e));
		Dom.on(document, 'click', (e) => this.onInlineConsent(e));

		// Reakcja na zdarzenia emitowane w cookies-handle.js
		Dom.on(window, 'cookie:ready', (e) => this.onConsentEvent(e));
		Dom.on(window, 'cookie:change', (e) => this.onConsentEvent(e));
	}

	prepareIframes() {
		const iframes = Dom.qsa(`${this.cfg.wrapperSel} ${this.cfg.iframeSel}`);
		const consented = !!(
			this.consentManager &&
			this.consentManager.isConsented &&
			this.consentManager.isConsented()
		);

		if (consented) {
			iframes.forEach(IframeHydrator.hydrate);
			this.hideHints();
		} else {
			iframes.forEach(IframeHydrator.dehydrate);
			this.showHints();
		}
	}

	onConsentEvent(e) {
		const state = e?.detail?.value;
		if (state === 'accepted') {
			Dom.qsa(`${this.cfg.wrapperSel} ${this.cfg.iframeSel}`).forEach(
				IframeHydrator.hydrate
			);
			this.hideHints();
		} else {
			Dom.qsa(`${this.cfg.wrapperSel} ${this.cfg.iframeSel}`).forEach(
				IframeHydrator.dehydrate
			);
			this.showHints();
		}
	}

	onThumbClick(e) {
		const thumb = e.target.closest(this.cfg.thumbSel);
		if (!thumb) return;

		const wrapper = thumb.closest(this.cfg.wrapperSel);
		if (!wrapper || wrapper.classList.contains('is-playing')) return;

		const consented = !!(
			this.consentManager &&
			this.consentManager.isConsented &&
			this.consentManager.isConsented()
		);
		if (consented) {
			this.play(wrapper);
		} else {
			if (this.uiManager && this.uiManager.showCookieNotice)
				this.uiManager.showCookieNotice();
			this.showHint(wrapper);
		}
	}

	onThumbKey(e) {
		const isActivate = e.key === 'Enter' || e.key === ' ';
		if (!isActivate) return;
		const thumb = e.target.closest(this.cfg.thumbSel);
		if (!thumb) return;
		e.preventDefault();
		thumb.click();
	}

	onInlineConsent(e) {
		const btn = e.target.closest(this.cfg.inlineBtnSel);
		if (!btn) return;

		if (this.consentManager && this.consentManager.setConsent) {
			this.consentManager.setConsent('accepted', 180);
		}
		if (this.uiManager && this.uiManager.hideCookieNotice) {
			this.uiManager.hideCookieNotice();
		}
		// powiadom resztę świata — zgodnie z cookies-handle.js
		window.dispatchEvent(
			new CustomEvent('cookie:change', { detail: { value: 'accepted' } })
		);

		const wrapper = btn.closest(this.cfg.wrapperSel);
		if (wrapper) this.play(wrapper);
	}

	play(wrapper) {
		const iframe = Dom.qs(this.cfg.iframeSel, wrapper);
		if (!iframe) return;
		IframeHydrator.hydrate(iframe);
		wrapper.classList.add('is-playing');
		this.hideHint(wrapper);
	}

	showHints() {
		Dom.qsa(this.cfg.wrapperSel).forEach((w) => this.showHint(w));
	}
	hideHints() {
		Dom.qsa(this.cfg.wrapperSel).forEach((w) => this.hideHint(w));
	}
	showHint(w) {
		const h = Dom.qs(this.cfg.hintSel, w);
		if (h) h.setAttribute('aria-hidden', 'false');
	}
	hideHint(w) {
		const h = Dom.qs(this.cfg.hintSel, w);
		if (h) h.setAttribute('aria-hidden', 'true');
	}
}

document.addEventListener('DOMContentLoaded', () => {
	const controller = new VideoConsentController();
	controller.init();
});

export default VideoConsentController; // opcjonalnie, jeśli chcesz testować/importować
