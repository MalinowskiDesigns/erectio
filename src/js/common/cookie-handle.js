// cookies-handle.js  — GLOBAL

// --- helpers: publikujemy zdarzenia o stanie zgody ---
const emitCookieEvent = (type, value) => {
	window.dispatchEvent(new CustomEvent(type, { detail: { value } }));
};

class CookieManager {
	static setCookie(name, value, days = 180) {
		const d = new Date();
		d.setTime(d.getTime() + days * 86400000);
		const expires = `; expires=${d.toUTCString()}`;
		const secure = location.protocol === 'https:' ? '; Secure' : '';
		document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(
			value
		)}${expires}; path=/; SameSite=Lax${secure}`;
	}
	static getCookie(name) {
		const nameEQ = `${encodeURIComponent(name)}=`;
		const cookies = document.cookie.split(';');
		for (let c of cookies) {
			const trimmed = c.trim();
			if (trimmed.indexOf(nameEQ) === 0)
				return decodeURIComponent(trimmed.substring(nameEQ.length));
		}
		return null;
	}
	static deleteCookie(name) {
		document.cookie = `${encodeURIComponent(
			name
		)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
	}
}

class CookieConsentManager {
	constructor(cookieName = 'cookieConsent') {
		this.cookieName = cookieName;
	}
	getConsent() {
		return CookieManager.getCookie(this.cookieName);
	}
	setConsent(v, d) {
		CookieManager.setCookie(this.cookieName, v, d);
	}
	isConsented() {
		return this.getConsent() === 'accepted';
	}
	isDenied() {
		return this.getConsent() === 'denied';
	}
}

class UIManager {
	constructor() {
		this.cookieNotice = document.getElementById('cookie-notice');
		this.acceptBtn = document.getElementById('accept');
		this.denyBtn = document.getElementById('deny');
		this.consentTargets = document.querySelectorAll('[data-consent-target]');
	}
	initEventListeners(consentManager) {
		if (this.acceptBtn) {
			this.acceptBtn.addEventListener('click', () => {
				consentManager.setConsent('accepted', 180);
				this.hideCookieNotice();
				this.toggleConsentTargets(true);
				emitCookieEvent('cookie:change', 'accepted');
			});
		}
		if (this.denyBtn) {
			this.denyBtn.addEventListener('click', () => {
				consentManager.setConsent('denied', 180);
				this.hideCookieNotice();
				this.toggleConsentTargets(false);
				emitCookieEvent('cookie:change', 'denied');
			});
		}
	}
	showCookieNotice() {
		if (!this.cookieNotice) return;
		this.cookieNotice.removeAttribute('hidden');
		this.cookieNotice.style.display = 'flex';
		this.cookieNotice.classList.remove('cookie-fade-out');
		this.cookieNotice.classList.add('cookie-fade-in');
		const focusable = this.cookieNotice.querySelector('button, a');
		if (focusable) focusable.focus();
	}
	hideCookieNotice() {
		if (!this.cookieNotice) return;
		this.cookieNotice.classList.remove('cookie-fade-in');
		this.cookieNotice.classList.add('cookie-fade-out');
		setTimeout(() => {
			this.cookieNotice.style.display = 'none';
			this.cookieNotice.setAttribute('hidden', 'hidden');
		}, 500);
	}
	toggleConsentTargets(allowed) {
		this.consentTargets.forEach((el) => {
			el.style.display = allowed ? '' : 'none';
			el.setAttribute('aria-hidden', allowed ? 'false' : 'true');
		});
	}
}

document.addEventListener('DOMContentLoaded', () => {
	const consentManager = new CookieConsentManager();
	const uiManager = new UIManager();

	if (uiManager.cookieNotice) {
		uiManager.initEventListeners(consentManager);
	}

	const apply = () => {
		if (consentManager.isConsented()) {
			uiManager.hideCookieNotice();
			uiManager.toggleConsentTargets(true);
			emitCookieEvent('cookie:ready', 'accepted');
		} else if (consentManager.isDenied()) {
			uiManager.hideCookieNotice();
			uiManager.toggleConsentTargets(false);
			emitCookieEvent('cookie:ready', 'denied');
		} else {
			uiManager.toggleConsentTargets(false);
			uiManager.showCookieNotice();
			emitCookieEvent('cookie:ready', 'unknown');
		}
	};

	apply();
});
