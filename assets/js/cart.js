/**
 * Cart logic — gestion du panier en localStorage.
 *
 * Structure du panier :
 * {
 *   items: [
 *     { id, type, title, artist, price, image }
 *   ]
 * }
 *
 * Expose window.OuvertureDeBalCart avec :
 *   .add(item)          ajoute si pas déjà présent
 *   .remove(id)         retire par id
 *   .has(id)            booléen
 *   .get()              renvoie le panier complet
 *   .count()            nombre d'items
 *   .total()            somme en euros
 *   .clear()            vide tout
 *   .updateBadge()      met à jour le badge nav (appel auto sur add/remove)
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'ouverturedebal-cart-v1';

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { items: [] };
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.items)) return { items: [] };
      return parsed;
    } catch (e) {
      return { items: [] };
    }
  }

  function save(cart) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      // Quota dépassé ou storage désactivé : ignore silencieusement
    }
    dispatchChange(cart);
  }

  function dispatchChange(cart) {
    window.dispatchEvent(new CustomEvent('cart:change', { detail: cart }));
    updateBadge(cart);
  }

  function updateBadge(cart) {
    const c = cart || load();
    const n = c.items.length;
    document.querySelectorAll('[data-cart-badge]').forEach((el) => {
      if (n > 0) {
        el.textContent = String(n);
        el.hidden = false;
      } else {
        el.textContent = '';
        el.hidden = true;
      }
    });
  }

  const Cart = {
    add(item) {
      if (!item || !item.id || typeof item.price !== 'number') return false;
      const cart = load();
      if (cart.items.some((x) => x.id === item.id)) return false; // déjà présent
      cart.items.push({
        id: item.id,
        type: item.type || 'choregraphie',
        title: item.title || '',
        artist: item.artist || '',
        price: item.price,
        color: item.color || 'peach-2',
        style: item.style || '',
        level: item.level || '',
        modules: item.modules || '',
        duration: item.duration || '',
        prep: item.prep || '',
      });
      save(cart);
      return true;
    },

    remove(id) {
      const cart = load();
      const before = cart.items.length;
      cart.items = cart.items.filter((x) => x.id !== id);
      if (cart.items.length !== before) save(cart);
    },

    has(id) {
      return load().items.some((x) => x.id === id);
    },

    get() {
      return load();
    },

    count() {
      return load().items.length;
    },

    total() {
      return load().items.reduce((sum, it) => sum + (Number(it.price) || 0), 0);
    },

    clear() {
      save({ items: [] });
    },

    updateBadge() {
      updateBadge();
    },
  };

  window.OuvertureDeBalCart = Cart;

  // Mise à jour du badge dès chargement
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => updateBadge());
  } else {
    updateBadge();
  }
})();
