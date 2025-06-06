/*  ============================================================================ 
   INTERAKTYWNA MAPA WOJEWÓDZTW – ES6, arrow‐functions only 
   KISS • DRY • YAGNI • SoC • TDA 
============================================================================ */

(() => {
	/* ================= HELPERS ================= */

	// Czeka na załadowanie DOM
	const domReady = () =>
		new Promise((res) =>
			document.readyState !== 'loading'
				? res()
				: document.addEventListener('DOMContentLoaded', res)
		);

	// Usuwa diakrytyki (np. ą → a, ń → n) i myślniki, wszystko w lowercase
	const stripDiacritics = (s) =>
		s
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.replace(/-/g, '');

	// Znajduje klucz w bazie db dopasowany do id (ignorując diakrytyki i myślniki)
	const findKey = (id) => {
		if (db[id]) return id;
		const cleanId = stripDiacritics(id);
		return Object.keys(db).find((k) => stripDiacritics(k) === cleanId);
	};

	/* ---------- Konfiguracja ---------- */

	const ACTIVE_COLOR = '#387ABC';
	const HOVER_COLOR = '#84BDF5'; // jasny odcień na hover
	const COLOR_DEFAULT = '#e1e5ee';

	// Elementy DOM
	const JSON_URL = './data/specialists.json';
	const SVG_MAP = document.getElementById('poland-map');
	const DROPDOWN = document.getElementById('specialist-select');
	const LIST_CONTAINER = document.querySelector('.map__specialists-items');
	const POLAND_WRAPPER = document.querySelector('.map__poland');
	const IS_DESKTOP = matchMedia('(hover:hover) and (pointer:fine)').matches;

	/* ---------- Stan ---------- */

	let db = {}; // zawartość specialists.json
	let currentRegion = null; // klucz aktualnego województwa w db
	const defaultFill = new Map(); // oryginalne kolory każdego <path>

	/* ================= MAPA FAKTORÓW DLA TOOLTIP ================= */

	// Tutaj można wstawić własne wartości xFactor i yFactor dla każdego województwa.
	// xFactor = ułamek szerokości bounding boxu (<path>), od 0.0 (lewa krawędź) do 1.0 (prawa krawędź).
	// yFactor = ułamek wysokości bounding boxu, od 0.0 (góra) do 1.0 (dół).
	//
	// Jeśli dla danego klucza nie ma wpisu w tej mapie, używane będą wartości domyślne: x=0.5, y=0.2
	// (tj. środek szerokości, 20% od górnej krawędzi).
	const regionFactors = {
		dolnośląskie: { x: 0.5, y: 0.1 },
		'kujawsko-pomorskie': { x: 0.5, y: 0.2 },
		lubelskie: { x: 0.5, y: 0.2 },
		lubuskie: { x: 0.25, y: 0.2 }, // przykład: 30% od lewej, 20% od góry
		łódzkie: { x: 0.5, y: 0.2 },
		małopolskie: { x: 0.4, y: 0.25 },
		mazowieckie: { x: 0.4, y: 0.15 },
		opolskie: { x: 0.6, y: 0.1 },
		podkarpackie: { x: 0.5, y: 0.2 },
		podlaskie: { x: 0.7, y: 0.35 }, // przykład: 70% od lewej, 20% od góry
		pomorskie: { x: 0.4, y: 0.2 },
		śląskie: { x: 0.55, y: 0.1 },
		świętokrzyskie: { x: 0.5, y: 0.2 },
		'warmińsko-mazurskie': { x: 0.5, y: 0.1 },
		wielkopolskie: { x: 0.3, y: 0.2 },
		zachodniopomorskie: { x: 0.4, y: 0.3 },
	};

	/* ================= INIT ================= */

	Promise.all([fetch(JSON_URL).then((r) => r.json()), domReady()])
		.then(([json]) => {
			db = json;
			cacheDefaultFills();
			addSvgListeners();
			addDropdownListener();
		})
		.catch(console.error);

	/* ================= FUNKCJE GŁÓWNE ================= */

	// Zachowuje oryginalne kolory fill dla każdego <path>
	const cacheDefaultFills = () =>
		SVG_MAP.querySelectorAll('path[id]').forEach((p) =>
			defaultFill.set(p.id, p.getAttribute('fill') || COLOR_DEFAULT)
		);

	// Dodaje obsługę hover/leave/click na warstwy mapy
	const addSvgListeners = () =>
		SVG_MAP.querySelectorAll('path[id]').forEach((path) => {
			const { id } = path;

			const onMouseEnter = () => {
				if (id !== currentRegion) {
					path.setAttribute('fill', HOVER_COLOR);
				}
				showTooltip(id);
			};

			const onMouseLeave = () => {
				if (id !== currentRegion) {
					path.setAttribute('fill', defaultFill.get(id));
					hideTooltip();
				}
			};

			const onClick = () => selectRegion(id);

			if (IS_DESKTOP) {
				path.addEventListener('mouseenter', onMouseEnter);
				path.addEventListener('mouseleave', onMouseLeave);
			} else {
				path.addEventListener('touchstart', onMouseEnter, { passive: true });
				// na urządzeniach dotykowych tooltip będzie znikał po dotknięciu gdzie indziej
			}
			path.addEventListener('click', onClick);
		});

	// Dodaje listener na dropdown
	const addDropdownListener = () =>
		DROPDOWN.addEventListener('change', () => {
			const selected = DROPDOWN.value;
			if (selected) selectRegion(selected);
		});

	// Zaznacza wybrane województwo (ustawia fill, synchronizuje dropdown, renderuje listę)
	const selectRegion = (id) => {
		const key = findKey(id);
		if (!key) return;

		// Przywróć poprzedni fill, jeśli było inne zaznaczone
		if (currentRegion && currentRegion !== key) {
			const prevPath = SVG_MAP.querySelector(`#${CSS.escape(currentRegion)}`);
			if (prevPath)
				prevPath.setAttribute('fill', defaultFill.get(currentRegion));
		}
		currentRegion = key;

		// Ustawiamy fill na ACTIVE_COLOR
		const newPath = SVG_MAP.querySelector(`#${CSS.escape(key)}`);
		if (newPath) newPath.setAttribute('fill', ACTIVE_COLOR);

		syncDropdown(key);
		renderList(key);
		// Po kliknięciu – pokazujemy tooltip (nie ukrywamy),
		// aby nadal się wyświetlał nad aktywnym regionem.
		showTooltip(key);
	};

	// Synchronizuje dropdown z zaznaczonym na mapie
	const syncDropdown = (key) => {
		const opt = [...DROPDOWN.options].find(
			(o) => stripDiacritics(o.value) === stripDiacritics(key)
		);
		if (opt) DROPDOWN.value = opt.value;
	};

	// Renderuje listę specjalistów dla danego województwa
	const renderList = (key) => {
		const specs = db[key].specialists;
		LIST_CONTAINER.innerHTML = specs.length
			? specs.map(liTemplate).join('')
			: `<li class="map__specialists-caption map__specialists-caption--no-margin">
           Brak specjalistów dla tej lokalizacji.
         </li>`;
	};

	// Szablon pojedynczego <li> w liście specjalistów
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

	/* ================= TOOLTIP ================= */

	// Tworzymy element tooltipa
	const tooltip = (() => {
		const el = Object.assign(document.createElement('div'), {
			className: 'map__tooltip',
			style: 'position:absolute;pointer-events:none;display:none',
		});
		POLAND_WRAPPER.appendChild(el);
		return el;
	})();

	// Pokazuje tooltip w odpowiedniej, zmodyfikowanej pozycji
	const showTooltip = (id) => {
		const key = findKey(id);
		if (!key) return;

		const count = db[key].specialists.length;
		const dotClass =
			count > 0
				? 'map__tooltip--dot map__tooltip--dot--filled'
				: 'map__tooltip--dot map__tooltip--dot--empty';

		// Budujemy zawartość HTML tooltipa
		tooltip.innerHTML = `
      <span class="map__tooltip--title">${db[key].label}</span>
      <p class="map__tooltip--counter">
        <span class="map__tooltip--counter-label">Dostępni specjaliści:</span>
        <span class="map__tooltip--count">${count}</span>
        <span class="${dotClass}"></span>
      </p>`;

		const pathEl = SVG_MAP.querySelector(`#${CSS.escape(id)}`);
		if (!pathEl) return;

		// 1) Pobieramy bounding box ścieżki <path>
		const bbox = pathEl.getBBox();
		const pt = SVG_MAP.createSVGPoint();

		// 2) Pobieramy czynniki x i y dla danego regionu lub domyślne 0.5, 0.2
		const { x: xFactor = 0.5, y: yFactor = 0.2 } = regionFactors[key] || {};

		// 3) Ustawiamy punkt w obszarze SVG
		pt.x = bbox.x + bbox.width * xFactor;
		pt.y = bbox.y + bbox.height * yFactor;

		// 4) Rzutujemy go na współrzędne ekranowe
		const matrix = pathEl.getScreenCTM();
		const screenPt = pt.matrixTransform(matrix);

		// 5) Obliczamy współrzędne względem wrappera
		const wrapperRect = POLAND_WRAPPER.getBoundingClientRect();
		const leftPos = screenPt.x - wrapperRect.left;
		const topPosSVG = screenPt.y - wrapperRect.top;

		// *** Usuńmy wcześniej nadane klasy przesunięcia
		tooltip.classList.remove(
			'map__tooltip--translated-right',
			'map__tooltip--translated-left'
		);

		// 6) Wstępne wyświetlenie, żeby mieć wymiary tooltipa
		Object.assign(tooltip.style, {
			left: `${leftPos}px`,
			top: `${topPosSVG}px`,
			transform: 'translate(-50%, -100%)',
			display: 'block',
		});

		// 7) Sprawdźmy, czy tooltip wychodzi poza lewą lub prawą krawędź
		const tooltipWidth = tooltip.offsetWidth;
		const projectedLeftEdge = leftPos - tooltipWidth / 2;
		const projectedRightEdge = leftPos + tooltipWidth / 2;
		const wrapperWidth = wrapperRect.width;

		if (projectedLeftEdge < 0) {
			// wychodzi poza lewo → przesuwamy w prawo
			tooltip.classList.add('map__tooltip--translated-right');
			tooltip.style.transform = 'translate(0%, -100%)';
		} else if (projectedRightEdge > wrapperWidth) {
			// wychodzi poza prawo → przesuwamy w lewo
			tooltip.classList.add('map__tooltip--translated-left');
			tooltip.style.transform = 'translate(-100%, -100%)';
		}
	};

	// Ukrywa tooltip i usuwa klasy przesunięcia
	const hideTooltip = () => {
		tooltip.style.display = 'none';
		tooltip.classList.remove(
			'map__tooltip--translated-right',
			'map__tooltip--translated-left'
		);
	};
})();
