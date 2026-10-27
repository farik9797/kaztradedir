// KazTradeDir — интерфейс (ES-модуль, без jQuery).
// В прототипе корзина и избранное хранятся в localStorage; в теме корзина — WooCommerce Store API.

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const storage = {
	get(key, fallback) {
		try {
			return JSON.parse(localStorage.getItem(key)) ?? fallback;
		} catch {
			return fallback;
		}
	},
	set(key, value) {
		try {
			localStorage.setItem(key, JSON.stringify(value));
		} catch {
			/* приватный режим — работаем без сохранения */
		}
	},
};

/* ---------- Уведомление ---------- */
let toastTimer;
function toast(message) {
	let el = $('.toast');
	if (!el) {
		el = document.createElement('div');
		el.className = 'toast';
		el.setAttribute('role', 'status');
		el.setAttribute('aria-live', 'polite');
		document.body.append(el);
	}
	el.innerHTML = '<svg class="icon" aria-hidden="true"><use href="assets/icons.svg#i-check"></use></svg><span></span>';
	el.querySelector('span').textContent = message;
	requestAnimationFrame(() => el.classList.add('is-visible'));
	clearTimeout(toastTimer);
	toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2600);
}

/* ---------- Выдвижные панели ---------- */
const overlay = (() => {
	const el = document.createElement('div');
	el.className = 'overlay';
	document.body.append(el);
	return el;
})();

let openDrawer = null;
let lastFocus = null;

function setDrawer(drawer, open) {
	if (!drawer) return;
	drawer.classList.toggle('is-open', open);
	overlay.classList.toggle('is-open', open);
	document.body.style.overflow = open ? 'hidden' : '';
	$$(`[aria-controls="${drawer.id}"]`).forEach((b) => b.setAttribute('aria-expanded', String(open)));
	if (open) {
		lastFocus = document.activeElement;
		openDrawer = drawer;
		drawer.removeAttribute('inert');
		$('button, a, input, select', drawer)?.focus();
	} else {
		drawer.setAttribute('inert', '');
		openDrawer = null;
		lastFocus?.focus();
	}
}

$$('.drawer').forEach((d) => d.setAttribute('inert', ''));
$$('[data-drawer-open]').forEach((btn) =>
	btn.addEventListener('click', () => setDrawer(document.getElementById(btn.dataset.drawerOpen), true))
);
$$('[data-drawer-close]').forEach((btn) => btn.addEventListener('click', () => setDrawer(btn.closest('.drawer'), false)));
overlay.addEventListener('click', () => setDrawer(openDrawer, false));

/* ---------- Мега-меню каталога ---------- */
const catalogToggle = $('.catalog-toggle');
const mega = $('#mega-menu');

function setMega(open) {
	if (!mega) return;
	mega.hidden = !open;
	catalogToggle.setAttribute('aria-expanded', String(open));
}

catalogToggle?.addEventListener('click', () => setMega(mega.hidden));

$$('.mega__cat').forEach((cat) => {
	const activate = () => {
		$$('.mega__cat').forEach((c) => c.classList.toggle('is-active', c === cat));
		$$('.mega__panel').forEach((p) => (p.hidden = p.id !== cat.dataset.panel));
	};
	cat.addEventListener('mouseenter', activate);
	cat.addEventListener('focus', activate);
});

document.addEventListener('keydown', (e) => {
	if (e.key !== 'Escape') return;
	if (mega && !mega.hidden) {
		setMega(false);
		catalogToggle.focus();
	}
	if (openDrawer) setDrawer(openDrawer, false);
});

document.addEventListener('click', (e) => {
	if (mega && !mega.hidden && !e.target.closest('#mega-menu, .catalog-toggle')) setMega(false);
});

/* ---------- Избранное ---------- */
const favs = new Set(storage.get('ktd-favs', []));

function renderCounters() {
	$$('[data-fav-count]').forEach((el) => {
		el.textContent = favs.size || '';
		el.dataset.count = favs.size;
	});
	const cart = storage.get('ktd-cart', {});
	const items = Object.keys(cart).length;
	$$('[data-cart-count]').forEach((el) => {
		el.textContent = items || '';
		el.dataset.count = items;
	});
}

$$('.fav-btn').forEach((btn) => {
	const id = btn.dataset.product;
	btn.setAttribute('aria-pressed', String(favs.has(id)));
	btn.addEventListener('click', (e) => {
		e.preventDefault();
		const on = !favs.has(id);
		on ? favs.add(id) : favs.delete(id);
		storage.set('ktd-favs', [...favs]);
		$$(`.fav-btn[data-product="${id}"]`).forEach((b) => b.setAttribute('aria-pressed', String(on)));
		/* ---------- Hero: смена фона ---------- */
const heroSlider = $('[data-hero-slider]');
if (heroSlider) {
	const slides = $$('.hero__slide', heroSlider);
	const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
	let current = 0;
	let timer = 0;

	const show = (i) => {
		const next = slides[i];
		// Ленивое фото ещё не скачано — ждём, чтобы не мигнуть пустым фоном.
		if (!next.complete) {
			next.loading = 'eager';
			next.addEventListener('load', () => show(i), { once: true });
			return;
		}
		slides[current].classList.remove('is-active');
		next.classList.add('is-active');
		current = i;
	};
	// Без автосмены при «уменьшить движение» и на скрытой вкладке.
	const start = () => {
		clearInterval(timer);
		timer = 0;
		if (!reduce.matches && !document.hidden) timer = setInterval(() => show((current + 1) % slides.length), 6000);
	};

	reduce.addEventListener('change', start);
	document.addEventListener('visibilitychange', start);
	// Отсчёт — после загрузки первого фото, чтобы оно успело побыть на экране.
	if (slides[0].complete) start();
	else slides[0].addEventListener('load', start, { once: true });
}

renderCounters();
		toast(on ? 'Добавлено в избранное' : 'Удалено из избранного');
	});
});

/* ---------- Корзина (демо) ---------- */
function addToCart(id, qty) {
	const cart = storage.get('ktd-cart', {});
	cart[id] = (cart[id] || 0) + qty;
	storage.set('ktd-cart', cart);
	renderCounters();
	toast(`Добавлено в корзину: ${qty} ${document.querySelector(`[data-unit-for="${id}"]`)?.textContent || 'шт'}`);
}

$$('[data-add-to-cart]').forEach((btn) =>
	btn.addEventListener('click', () => addToCart(btn.dataset.addToCart, Number(btn.dataset.qty || 1)))
);

/* ---------- Количество: MOQ и кратность ---------- */
$$('[data-qty-box]').forEach((box) => {
	const input = $('input', box);
	const min = Number(box.dataset.min || 1);
	const step = Number(box.dataset.step || 1);
	const error = document.getElementById(box.dataset.error);
	const normalize = (value) => {
		let v = Math.max(min, Math.round(Number(value) || min));
		if ((v - min) % step) v = min + Math.ceil((v - min) / step) * step;
		return v;
	};
	const set = (value) => {
		const v = normalize(value);
		if (error) error.textContent = Number(value) !== v ? `Минимум ${min}, кратно ${step} — исправлено на ${v}` : '';
		input.value = v;
		const buy = document.getElementById(box.dataset.buy);
		if (buy) buy.dataset.qty = v;
		box.dispatchEvent(new CustomEvent('qty:change', { bubbles: true, detail: v }));
	};
	$('[data-qty-minus]', box).addEventListener('click', () => set(Number(input.value) - step));
	$('[data-qty-plus]', box).addEventListener('click', () => set(Number(input.value) + step));
	input.addEventListener('change', () => set(input.value));
	set(input.value);
});

/* ---------- Галерея ---------- */
$$('[data-gallery]').forEach((gallery) => {
	const main = $('.gallery__main img', gallery);
	$$('.gallery__thumb', gallery).forEach((thumb) =>
		thumb.addEventListener('click', () => {
			main.src = thumb.dataset.src;
			main.alt = $('img', thumb).alt;
			$$('.gallery__thumb', gallery).forEach((t) => t.setAttribute('aria-current', String(t === thumb)));
		})
	);
});

/* ---------- Вкладки (WAI-ARIA Tabs) ---------- */
$$('[data-tabs]').forEach((tabs) => {
	const list = $$('[role="tab"]', tabs);
	const select = (tab, focus = true) => {
		list.forEach((t) => {
			const on = t === tab;
			t.setAttribute('aria-selected', String(on));
			t.tabIndex = on ? 0 : -1;
			document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
		});
		if (focus) tab.focus();
	};
	list.forEach((tab, i) => {
		tab.addEventListener('click', () => select(tab));
		tab.addEventListener('keydown', (e) => {
			const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: list.length - 1 }[e.key];
			if (next === undefined) return;
			e.preventDefault();
			select(list[(next + list.length) % list.length]);
		});
	});
	$$('[data-open-tab]').forEach((link) =>
		link.addEventListener('click', (e) => {
			const tab = document.getElementById(link.dataset.openTab);
			if (!tab) return;
			e.preventDefault();
			select(tab, false);
			tab.scrollIntoView({ behavior: 'smooth', block: 'start' });
		})
	);
});

/* ---------- «Показать контакты» ----------
 * В теме контакты не попадают в HTML: кнопка запрашивает их с сервера (REST, лимит запросов).
 * В прототипе имитируем задержку ответа. */
$$('[data-reveal-contacts]').forEach((btn) =>
	btn.addEventListener('click', async () => {
		const box = document.getElementById(btn.dataset.revealContacts);
		btn.disabled = true;
		btn.querySelector('span').textContent = 'Загружаем…';
		await new Promise((r) => setTimeout(r, 450));
		box.hidden = false;
		btn.remove();
		$('a', box)?.focus();
	})
);

/* ---------- Окно «Запросить цену» ---------- */
$$('[data-rfq-open]').forEach((btn) =>
	btn.addEventListener('click', () => {
		const dialog = document.getElementById('rfq-modal');
		const product = $('[data-rfq-product]', dialog);
		if (product) product.textContent = btn.dataset.rfqOpen || 'Общий запрос';
		dialog.showModal();
	})
);
$$('[data-modal-close]').forEach((btn) => btn.addEventListener('click', () => btn.closest('dialog').close()));
$('#rfq-form')?.addEventListener('submit', (e) => {
	e.preventDefault();
	if (!e.target.reportValidity()) return;
	e.target.closest('dialog').close();
	toast('Прототип: заявка не отправляется. На сайте её получат поставщик и администратор.');
});

/* ---------- Фильтры: автоприменение не используем, форма отправляется кнопкой ---------- */
$$('[data-filters-reset]').forEach((btn) =>
	btn.addEventListener('click', () => {
		const form = btn.closest('form');
		form.reset();
		$$('input[type="checkbox"]', form).forEach((c) => (c.checked = false));
		$$('input[type="number"]', form).forEach((c) => (c.value = ''));
	})
);

/* ---------- Корзина: суммы по поставщикам и итог ---------- */
const cart = $('[data-cart]');
if (cart) {
	const fmt = (n) => `${n.toLocaleString('ru-RU').replace(/ |\s/g, ' ')} ₸`;
	const recalc = () => {
		let total = 0;
		let lines = 0;
		const groups = $$('[data-vendor-group]', cart);
		groups.forEach((group) => {
			let sum = 0;
			$$('[data-cart-item]', group).forEach((item) => {
				const line = Number(item.dataset.price) * Number($('input', item).value);
				$('[data-line-sum]', item).textContent = fmt(line);
				sum += line;
				lines += 1;
			});
			$('[data-group-sum]', group).textContent = fmt(sum);
			total += sum;
		});
		$('[data-cart-total]', cart).textContent = fmt(total);
		$('[data-cart-lines]', cart).textContent = lines;
		$('[data-cart-vendors]', cart).textContent = groups.length;
		$('[data-cart-empty]', cart).hidden = groups.length > 0;
		$('aside', cart).hidden = groups.length === 0;
	};
	cart.addEventListener('qty:change', recalc);
	$$('[data-remove-item]', cart).forEach((btn) =>
		btn.addEventListener('click', () => {
			const group = btn.closest('[data-vendor-group]');
			btn.closest('[data-cart-item]').remove();
			if (!$('[data-cart-item]', group)) group.remove();
			recalc();
			toast('Товар удалён из корзины');
		})
	);
	recalc();
}

/* ---------- Страница избранного ---------- */
const favGrid = $('[data-fav-grid]');
if (favGrid) {
	const sync = () => {
		let shown = 0;
		$$('[data-card-id]', favGrid).forEach((card) => {
			card.hidden = !favs.has(card.dataset.cardId);
			if (!card.hidden) shown += 1;
		});
		$('[data-fav-empty]').hidden = shown > 0;
	};
	favGrid.addEventListener('click', (e) => e.target.closest('.fav-btn') && setTimeout(sync));
	sync();
}

/* ---------- Файлы: показываем выбранные имена ---------- */
$$('[data-file-input]').forEach((input) =>
	input.addEventListener('change', () => {
		const label = $('[data-file-label]', input.closest('.file-drop'));
		const names = [...input.files].map((f) => f.name);
		if (names.length) label.textContent = names.join(', ');
	})
);

/* ---------- Формы прототипа: проверка обязательных полей ---------- */
$$('form[novalidate]:not(#rfq-form)').forEach((form) =>
	form.addEventListener('submit', (e) => {
		if (!form.reportValidity()) {
			e.preventDefault();
			return;
		}
		if (!form.hasAttribute('data-checkout')) {
			e.preventDefault();
			toast('Прототип: форма не отправляется. На сайте заявку получит администратор.');
		}
	})
);

renderCounters();
$$('[data-fav-total]').forEach((el) => (el.textContent = favs.size));
