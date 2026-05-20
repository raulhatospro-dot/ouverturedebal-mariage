/**
 * Wire up "Ajouter au panier" buttons across the site.
 * Buttons must have data-add-to-cart and data-item-* attributes.
 * Toggles state to "Dans le panier ✓" + links to /panier.html when item is already in cart.
 */
(function () {
  'use strict';

  function getCart() {
    return window.OuvertureDeBalCart;
  }

  function findCartLink() {
    // Best link to /panier.html based on relative path of current page
    const path = window.location.pathname;
    if (path.includes('/choregraphies/')) return '../panier.html';
    if (path.includes('/blog/') || path.includes('/legal/')) return '../panier.html';
    return 'panier.html';
  }

  function updateButton(btn) {
    const Cart = getCart();
    if (!Cart) return;
    const id = btn.getAttribute('data-item-id');
    if (!id) return;
    const label = btn.querySelector('[data-add-label]');
    const arrow = btn.querySelector('.arrow');

    if (Cart.has(id)) {
      btn.classList.add('btn--in-cart');
      if (label) label.textContent = 'Dans le panier — Voir le panier';
      if (arrow) arrow.style.display = '';
      btn.setAttribute('data-in-cart', 'true');
    } else {
      btn.classList.remove('btn--in-cart');
      if (label) label.textContent = 'Ajouter au panier';
      if (arrow) arrow.style.display = '';
      btn.removeAttribute('data-in-cart');
    }
  }

  function handleClick(btn) {
    const Cart = getCart();
    if (!Cart) return;

    const id = btn.getAttribute('data-item-id');
    if (!id) return;

    if (Cart.has(id)) {
      // Already in cart → navigate to cart page
      window.location.href = findCartLink();
      return;
    }

    const item = {
      id: id,
      type: btn.getAttribute('data-item-type') || 'choregraphie',
      title: btn.getAttribute('data-item-title') || '',
      artist: btn.getAttribute('data-item-artist') || '',
      price: parseFloat(btn.getAttribute('data-item-price')) || 0,
      color: btn.getAttribute('data-item-color') || 'peach-2',
      style: btn.getAttribute('data-item-style') || '',
      level: btn.getAttribute('data-item-level') || '',
      modules: btn.getAttribute('data-item-modules') || '',
      duration: btn.getAttribute('data-item-duration') || '',
      prep: btn.getAttribute('data-item-prep') || '',
    };

    Cart.add(item);
  }

  function init() {
    const buttons = document.querySelectorAll('[data-add-to-cart]');
    buttons.forEach((btn) => {
      updateButton(btn);
      btn.addEventListener('click', () => handleClick(btn));
    });

    window.addEventListener('cart:change', () => {
      buttons.forEach(updateButton);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
