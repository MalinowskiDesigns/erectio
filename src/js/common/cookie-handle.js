// cookies-handle.js

class CookieManager {
	static setCookie(name, value, days = 180) {
		const d = new Date();
		d.setTime(d.getTime() + days * 86400000);
		const expires = `; expires=${d.toUTCString()}`;
		const secure = location.protocol === 'https:' ? '; Secure' : '';
		// Lax wystarczy dla banera
		document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(
			value
		)}${expires}; path=/; SameSite=Lax${secure}`;
	}

	static getCookie(name) {
		const nameEQ = `${encodeURIComponent(name)}=`;
		const cookies = document.cookie.split(';');
		for (let c of cookies) {
			c = c.trim();
			if (c.indexOf(nameEQ) === 0) {
				return decodeURIComponent(c.substring(nameEQ.length));
			}
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
	setConsent(value, days) {
		CookieManager.setCookie(this.cookieName, value, days);
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
		// Elastycznie: oznacz dowolny element, który ma być pokazany tylko po zgodzie
		// np. <div data-consent-target="map">..</div>
		this.consentTargets = document.querySelectorAll('[data-consent-target]');
	}

	initEventListeners(consentManager) {
		if (this.acceptBtn) {
			this.acceptBtn.addEventListener('click', () => {
				consentManager.setConsent('accepted', 180);
				this.hideCookieNotice();
				this.toggleConsentTargets(true);
			});
		}
		if (this.denyBtn) {
			this.denyBtn.addEventListener('click', () => {
				consentManager.setConsent('denied', 180);
				this.hideCookieNotice();
				this.toggleConsentTargets(false);
			});
		}
	}

	showCookieNotice() {
		if (!this.cookieNotice) return;
		this.cookieNotice.removeAttribute('hidden');
		this.cookieNotice.style.display = 'flex';
		this.cookieNotice.classList.remove('cookie-fade-out');
		this.cookieNotice.classList.add('cookie-fade-in');
		// Focus accessibility
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

	// Nie rób nic, jeśli banera w ogóle nie ma w DOM (np. na stronach AMP)
	if (uiManager.cookieNotice) {
		uiManager.initEventListeners(consentManager);
	}

	const apply = () => {
		if (consentManager.isConsented()) {
			uiManager.hideCookieNotice();
			uiManager.toggleConsentTargets(true);
		} else if (consentManager.isDenied()) {
			uiManager.hideCookieNotice();
			uiManager.toggleConsentTargets(false);
		} else {
			uiManager.toggleConsentTargets(false);
			uiManager.showCookieNotice();
		}
	};

	apply();
});
