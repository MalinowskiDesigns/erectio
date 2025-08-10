(() => {
	const domReady = () =>
		new Promise((res) =>
			document.readyState !== 'loading'
				? res()
				: document.addEventListener('DOMContentLoaded', res)
		);

	const stripDiacritics = (s) =>
		s
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.replace(/-/g, '');

	const findKey = (id) => {
		if (db[id]) return id;
		const cleanId = stripDiacritics(id);
		return Object.keys(db).find((k) => stripDiacritics(k) === cleanId);
	};

	const ACTIVE_COLOR = '#387AAC';
	const HOVER_COLOR = '#84BDF5';
	const COLOR_DEFAULT = '#e1e5ee';

	const JSON_URL = '/data/specialists.json';
	const SVG_MAP = document.getElementById('poland-map');
	const DROPDOWN = document.getElementById('specialist-select');
	const LIST_CONTAINER = document.querySelector('.map__specialists-items');
	const POLAND_WRAPPER = document.querySelector('.map__poland');
	const IS_DESKTOP = matchMedia('(hover:hover) and (pointer:fine)').matches;

	let db = {};
	let currentRegion = null;
	let resetTooltipTimeout = null;
	const defaultFill = new Map();

	const regionFactors = {
		dolnośląskie: { x: 0.5, y: 0.1 },
		'kujawsko-pomorskie': { x: 0.5, y: 0.2 },
		lubelskie: { x: 0.5, y: 0.2 },
		lubuskie: { x: 0.25, y: 0.2 },
		łódzkie: { x: 0.5, y: 0.2 },
		małopolskie: { x: 0.4, y: 0.25 },
		mazowieckie: { x: 0.4, y: 0.15 },
		opolskie: { x: 0.6, y: 0.1 },
		podkarpackie: { x: 0.5, y: 0.2 },
		podlaskie: { x: 0.7, y: 0.35 },
		pomorskie: { x: 0.4, y: 0.2 },
		śląskie: { x: 0.55, y: 0.1 },
		świętokrzyskie: { x: 0.5, y: 0.2 },
		'warmińsko-mazurskie': { x: 0.5, y: 0.1 },
		wielkopolskie: { x: 0.3, y: 0.2 },
		zachodniopomorskie: { x: 0.4, y: 0.3 },
	};

	/* ▼ 1. NOWA FUNKCJA DO LEPSZEGO ŁADOWANIA JSON-A ▼ */
	const loadJson = async (url) => {
		const res = await fetch(url);
		// status != 2xx albo serwer oddał HTML zamiast JSON:
		if (!res.ok || res.headers.get('content-type')?.includes('html')) {
			const fallback = await res.text();
			throw new Error(
				`Nieprawidłowa odpowiedź (${res.status}).\n` +
					`Pierwsze 100 znaków:\n${fallback.slice(0, 100)}…`
			);
		}
		return res.json();
	};

	Promise.all([loadJson(JSON_URL), domReady()])
		.then(([json]) => {
			db = json;
			cacheDefaultFills();
			addSvgListeners();
			addDropdownListener();
			SVG_MAP.addEventListener('mouseleave', () => {
				if (resetTooltipTimeout) clearTimeout(resetTooltipTimeout);
				hideTooltip();
				if (currentRegion) {
					resetTooltipTimeout = setTimeout(() => {
						showTooltip(currentRegion);
					}, 3);
				}
			});
		})
		.catch((err) => console.error('Błąd ładowania specialists.json:', err));

	const cacheDefaultFills = () =>
		SVG_MAP.querySelectorAll('path[id]').forEach((p) =>
			defaultFill.set(p.id, p.getAttribute('fill') || COLOR_DEFAULT)
		);

	const addSvgListeners = () =>
		SVG_MAP.querySelectorAll('path[id]').forEach((path) => {
			const { id } = path;

			const onMouseEnter = () => {
				if (resetTooltipTimeout) clearTimeout(resetTooltipTimeout);
				if (id !== currentRegion) {
					path.setAttribute('fill', HOVER_COLOR);
				}
				showTooltip(id);
			};

			const onMouseLeave = () => {
				if (id !== currentRegion) {
					path.setAttribute('fill', defaultFill.get(id));
					hideTooltip();
					if (resetTooltipTimeout) clearTimeout(resetTooltipTimeout);
					if (currentRegion) {
						resetTooltipTimeout = setTimeout(() => {
							showTooltip(currentRegion);
						}, 2000);
					}
				}
			};

			const onClick = () => {
				if (resetTooltipTimeout) clearTimeout(resetTooltipTimeout);
				selectRegion(id);
			};

			if (IS_DESKTOP) {
				path.addEventListener('mouseenter', onMouseEnter);
				path.addEventListener('mouseleave', onMouseLeave);
			} else {
				path.addEventListener('touchstart', onMouseEnter, { passive: true });
			}
			path.addEventListener('click', onClick);
		});

	const addDropdownListener = () =>
		DROPDOWN.addEventListener('change', () => {
			const selected = DROPDOWN.value;
			if (selected) selectRegion(selected);
		});

	const selectRegion = (id) => {
		const key = findKey(id);
		if (!key) return;

		// ---- reset poprzedniego regionu ----
		if (resetTooltipTimeout) clearTimeout(resetTooltipTimeout);
		if (currentRegion && currentRegion !== key) {
			// fallback dla CSS.escape
			let prevSelector;
			if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
				prevSelector = `#${CSS.escape(currentRegion)}`;
			} else {
				const escapedPrev = String(currentRegion).replace(/"/g, '\\"');
				prevSelector = `[id="${escapedPrev}"]`;
			}
			const prevPath = SVG_MAP.querySelector(prevSelector);
			if (prevPath) {
				prevPath.setAttribute('fill', defaultFill.get(currentRegion));
			}
		}

		currentRegion = key;

		// ---- ustawienie nowego koloru na wybranym regionie ----
		let selector;
		if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
			selector = `#${CSS.escape(key)}`;
		} else {
			const escapedForAttr = String(key).replace(/"/g, '\\"');
			selector = `[id="${escapedForAttr}"]`;
		}
		const newPath = SVG_MAP.querySelector(selector);
		if (newPath) newPath.setAttribute('fill', ACTIVE_COLOR);

		syncDropdown(key);
		renderList(key);
		showTooltip(key);
	};

	const syncDropdown = (key) => {
		const opt = [...DROPDOWN.options].find(
			(o) => stripDiacritics(o.value) === stripDiacritics(key)
		);
		if (opt) DROPDOWN.value = opt.value;
	};

	const renderList = (key) => {
		const specs = db[key].specialists;
		LIST_CONTAINER.innerHTML = specs.length
			? specs.map(liTemplate).join('')
			: `<li class="map__specialists-caption map__specialists-caption--no-margin">
           Brak specjalistów dla tej lokalizacji.
         </li>`;
	};

	const liTemplate = (s) => `
    <li class="map__specialists-item">
      <img
        class="map__specialist-img"
        src="${s.avatar}"
        alt="${s.name}"
        width="48"
        height="48"
      >
      <div class="map__specialist-container">
        <h4 class="map__specialists-title">${s.name}</h4>
        <p class="map__specialist-specialization">${s.specialization}</p>
        <p class="map__specialist-address">${s.address}</p>
        <a
          class="map__specialist-tel link link--primary"
          href="tel:${s.tel.replace(/\s+/g, '')}"
          target="_blank"
        >${s.tel}</a>
      </div>
      <a
        class="map__specialist-cta btn btn--primary"
        href="tel:${s.tel.replace(/\s+/g, '')}"
        target="_blank"
      >
        <span>Zadzwoń</span>
        <svg class="map__specialist-icon" aria-hidden="true">
          <use href="#i-telephone"></use>
        </svg>
      </a>
    </li>`;

	const tooltip = (() => {
		const el = Object.assign(document.createElement('div'), {
			className: 'map__tooltip',
			style: 'position:absolute;pointer-events:none;display:none',
		});
		POLAND_WRAPPER.appendChild(el);
		return el;
	})();

	const showTooltip = (id) => {
		const key = findKey(id);
		if (!key) return;

		const count = db[key].specialists.length;
		const dotClass =
			count > 0
				? 'map__tooltip--dot map__tooltip--dot--filled'
				: 'map__tooltip--dot map__tooltip--dot--empty';

		tooltip.innerHTML = `
    <span class="map__tooltip--title">${db[key].label}</span>
    <p class="map__tooltip--counter">
      <span class="map__tooltip--counter-label">Dostępni specjaliści:</span>
      <span class="map__tooltip--count">${count}</span>
      <span class="${dotClass}"></span>
    </p>`;

		// wybieramy ścieżkę ➝ fallback dla CSS.escape jak poprzednio
		let selector;
		if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
			selector = `#${CSS.escape(id)}`;
		} else {
			const escapedForAttr = String(id).replace(/"/g, '\\"');
			selector = `[id="${escapedForAttr}"]`;
		}
		const pathEl = SVG_MAP.querySelector(selector);
		if (!pathEl) return;

		// jeśli getBBox nie istnieje (np. w JSDOM/Vitest), przerywamy
		if (
			typeof pathEl.getBBox !== 'function' ||
			typeof SVG_MAP.createSVGPoint !== 'function'
		) {
			// W testach nie obliczamy pozycji, bo metoda getBBox() nie jest zaimplementowana.
			// Po prostu nie pokazujemy tooltipa ani nie próbujemy ustawiać stylów.
			return;
		}

		const bbox = pathEl.getBBox();
		const pt = SVG_MAP.createSVGPoint();
		const { x: xFactor = 0.5, y: yFactor = 0.2 } = regionFactors[key] || {};
		pt.x = bbox.x + bbox.width * xFactor;
		pt.y = bbox.y + bbox.height * yFactor;
		const matrix = pathEl.getScreenCTM();
		const screenPt = pt.matrixTransform(matrix);
		const wrapperRect = POLAND_WRAPPER.getBoundingClientRect();
		const leftPos = screenPt.x - wrapperRect.left;
		const topPosSVG = screenPt.y - wrapperRect.top;

		tooltip.classList.remove(
			'map__tooltip--translated-right',
			'map__tooltip--translated-left'
		);

		Object.assign(tooltip.style, {
			left: `${leftPos}px`,
			top: `${topPosSVG}px`,
			transform: 'translate(-50%, -100%)',
			display: 'block',
		});

		const tooltipWidth = tooltip.offsetWidth;
		const projectedLeftEdge = leftPos - tooltipWidth / 2;
		const projectedRightEdge = leftPos + tooltipWidth / 2;
		const wrapperWidth = wrapperRect.width;

		if (projectedLeftEdge < 0) {
			tooltip.classList.add('map__tooltip--translated-right');
			tooltip.style.transform = 'translate(0%, -100%)';
		} else if (projectedRightEdge > wrapperWidth) {
			tooltip.classList.add('map__tooltip--translated-left');
			tooltip.style.transform = 'translate(-100%, -100%)';
		}
	};

	const hideTooltip = () => {
		tooltip.style.display = 'none';
		tooltip.classList.remove(
			'map__tooltip--translated-right',
			'map__tooltip--translated-left'
		);
	};
})();
