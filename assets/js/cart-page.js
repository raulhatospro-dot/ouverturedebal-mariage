/**
 * Page panier — rendu dynamique enrichi.
 * Dépend de window.OuvertureDeBalCart (cart.js).
 */
(function () {
  'use strict';

  // Mapping couleur (correspond aux blobs des cartes catalogue)
  const COLOR_MAP = {
    'peach-1': '#E8C9B8',
    'peach-2': '#D9A89C',
    'peach-3': '#C87856',
    'dark':    '#4A3527',
  };

  function euro(n) {
    return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  }

  function euroDecimal(n) {
    return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderEmpty() {
    return `
      <div class="cart-empty">
        <div class="cart-empty__icon" aria-hidden="true">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
        </div>
        <h2 class="cart-empty__title">Votre panier est vide</h2>
        <p class="cart-empty__text">Découvrez nos 56 chorégraphies et nos formules pour préparer votre ouverture de bal.</p>
        <div class="cart-empty__actions">
          <a href="choregraphies.html" class="btn btn--dark">Voir les chorégraphies <span class="arrow">→</span></a>
          <a href="formules.html" class="btn btn--ghost">Voir les formules</a>
        </div>
      </div>
    `;
  }

  function renderItem(item) {
    const linkBack = item.type === 'formule'
      ? 'formules.html'
      : `choregraphies/${escapeHtml(item.id)}.html`;
    const typeLabel = item.type === 'formule' ? 'Formule' : (item.style || 'Chorégraphie');
    const bgColor = COLOR_MAP[item.color] || COLOR_MAP['peach-2'];

    // Build the detailed specs list
    const specs = [];
    if (item.modules) specs.push(`<span class="cart-item__spec"><strong>${escapeHtml(item.modules)}</strong> modules vidéo</span>`);
    if (item.duration) specs.push(`<span class="cart-item__spec"><strong>${escapeHtml(item.duration)}</strong> de cours</span>`);
    if (item.level) specs.push(`<span class="cart-item__spec">Niveau <strong>${escapeHtml(item.level)}</strong></span>`);
    if (item.prep) specs.push(`<span class="cart-item__spec"><strong>${escapeHtml(item.prep)}</strong> sem. de prépa</span>`);

    return `
      <article class="cart-item" data-cart-item="${escapeHtml(item.id)}">
        <a href="${linkBack}" class="cart-item__visual" style="background: ${bgColor};" aria-hidden="true">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)" aria-hidden="true">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </a>
        <div class="cart-item__info">
          <span class="cart-item__type">${escapeHtml(typeLabel)}</span>
          <h3 class="cart-item__title"><a href="${linkBack}">${escapeHtml(item.title)}</a></h3>
          ${item.artist ? `<p class="cart-item__meta">${escapeHtml(item.artist)}</p>` : ''}
          ${specs.length > 0 ? `<div class="cart-item__specs">${specs.join('')}</div>` : ''}
        </div>
        <div class="cart-item__price">
          <span class="cart-item__amount">${euro(item.price)}</span>
          <button class="cart-item__remove" data-cart-remove="${escapeHtml(item.id)}" aria-label="Retirer ${escapeHtml(item.title)} du panier">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            Retirer
          </button>
        </div>
      </article>
    `;
  }

  function renderReassurance() {
    return `
      <div class="cart-reassurance">
        <h3 class="cart-reassurance__title">Ce que vous recevez immédiatement</h3>
        <ul class="cart-reassurance__list">
          <li>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            <div>
              <strong>Email d'accès envoyé instantanément</strong>
              <span>Lien personnel pour démarrer en moins d'une minute après le paiement.</span>
            </div>
          </li>
          <li>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
            <div>
              <strong>Vidéos HD sous 2 angles</strong>
              <span>Démonstration face et profil pour bien voir chaque pas.</span>
            </div>
          </li>
          <li>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12" y2="18"/></svg>
            <div>
              <strong>Mobile, tablette, TV</strong>
              <span>Apprenez où vous voulez. Aucune installation nécessaire.</span>
            </div>
          </li>
          <li>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <div>
              <strong>Garantie satisfait ou remboursé 14 jours</strong>
              <span>Si la méthode ne vous convient pas, remboursement sans question.</span>
            </div>
          </li>
        </ul>
      </div>
    `;
  }

  function renderSummary(cart) {
    const totalTTC = cart.items.reduce((s, it) => s + (Number(it.price) || 0), 0);
    const tva = totalTTC / 6;        // TVA 20% incluse : TTC / 6
    const totalHT = totalTTC - tva;
    const count = cart.items.length;

    return `
      <aside class="cart-summary">
        <h2 class="cart-summary__title">Récapitulatif</h2>
        <div class="cart-summary__row">
          <span>Sous-total HT (${count} ${count > 1 ? 'articles' : 'article'})</span>
          <span>${euroDecimal(totalHT)}</span>
        </div>
        <div class="cart-summary__row">
          <span>TVA 20%</span>
          <span>${euroDecimal(tva)}</span>
        </div>
        <div class="cart-summary__row cart-summary__row--total">
          <span>Total TTC</span>
          <span class="cart-summary__total">${euro(totalTTC)}</span>
        </div>

        ${renderReassurance()}

        <button class="btn btn--dark cart-summary__cta" data-checkout-trigger type="button">
          Procéder au paiement <span class="arrow">→</span>
        </button>

        <div class="cart-payment-methods" aria-label="Moyens de paiement acceptés">
          <span class="cart-payment-methods__label">Paiements acceptés</span>
          <div class="cart-payment-methods__icons">
            <span class="cart-payment-icon" title="Carte bancaire">
              <svg width="32" height="22" viewBox="0 0 32 22" fill="none" aria-hidden="true">
                <rect x="0.5" y="0.5" width="31" height="21" rx="3" fill="#fff" stroke="#E8DCD0"/>
                <rect x="3" y="6" width="6" height="3" rx="0.5" fill="#C87856"/>
                <rect x="3" y="13" width="14" height="1.5" fill="#8A7968"/>
                <rect x="3" y="16" width="9" height="1.5" fill="#8A7968"/>
              </svg>
            </span>
            <span class="cart-payment-icon" title="Visa">
              <svg width="32" height="22" viewBox="0 0 32 22" fill="none" aria-hidden="true">
                <rect x="0.5" y="0.5" width="31" height="21" rx="3" fill="#fff" stroke="#E8DCD0"/>
                <text x="16" y="15" font-family="Inter, sans-serif" font-size="9" font-weight="700" fill="#1A1F71" text-anchor="middle" letter-spacing="0.5">VISA</text>
              </svg>
            </span>
            <span class="cart-payment-icon" title="Mastercard">
              <svg width="32" height="22" viewBox="0 0 32 22" fill="none" aria-hidden="true">
                <rect x="0.5" y="0.5" width="31" height="21" rx="3" fill="#fff" stroke="#E8DCD0"/>
                <circle cx="13" cy="11" r="5" fill="#EB001B"/>
                <circle cx="19" cy="11" r="5" fill="#F79E1B" fill-opacity="0.9"/>
              </svg>
            </span>
            <span class="cart-payment-icon" title="Apple Pay">
              <svg width="32" height="22" viewBox="0 0 32 22" fill="none" aria-hidden="true">
                <rect x="0.5" y="0.5" width="31" height="21" rx="3" fill="#000"/>
                <text x="16" y="14.5" font-family="Inter, sans-serif" font-size="8" font-weight="600" fill="#fff" text-anchor="middle">Pay</text>
                <text x="11" y="14.5" font-family="Inter, sans-serif" font-size="11" font-weight="700" fill="#fff" text-anchor="middle">&#63743;</text>
              </svg>
            </span>
            <span class="cart-payment-icon" title="Google Pay">
              <svg width="32" height="22" viewBox="0 0 32 22" fill="none" aria-hidden="true">
                <rect x="0.5" y="0.5" width="31" height="21" rx="3" fill="#fff" stroke="#E8DCD0"/>
                <text x="16" y="14" font-family="Inter, sans-serif" font-size="7" font-weight="600" fill="#5F6368" text-anchor="middle">G Pay</text>
              </svg>
            </span>
          </div>
        </div>

        <ul class="cart-summary__trust">
          <li>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Paiement sécurisé SSL · Stripe
          </li>
          <li>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Accès à vie · sans limite
          </li>
        </ul>

        <a href="choregraphies.html" class="cart-summary__continue">← Continuer mes achats</a>
      </aside>
    `;
  }

  function render() {
    const root = document.querySelector('[data-cart-root]');
    if (!root) return;
    const cart = window.OuvertureDeBalCart.get();

    if (cart.items.length === 0) {
      root.innerHTML = renderEmpty();
      return;
    }

    root.innerHTML = `
      <div class="cart-list">
        ${cart.items.map(renderItem).join('')}
      </div>
      ${renderSummary(cart)}
    `;

    root.querySelectorAll('[data-cart-remove]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-cart-remove');
        window.OuvertureDeBalCart.remove(id);
      });
    });

    const trigger = root.querySelector('[data-checkout-trigger]');
    if (trigger) {
      trigger.addEventListener('click', startCheckout);
    }
  }

  // URL du Worker Cloudflare. À adapter selon l'environnement.
  const WORKER_URL = 'https://ouverturedebal-access.workers.dev';

  async function startCheckout() {
    const cart = window.OuvertureDeBalCart.get();
    if (cart.items.length === 0) return;

    // Désactive le bouton pendant la requête
    const btn = document.querySelector('[data-checkout-trigger]');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Redirection vers le paiement…';
    }

    try {
      const res = await fetch(`${WORKER_URL}/api/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.items.map(i => ({ id: i.id })),
        }),
      });

      if (!res.ok) {
        throw new Error('Worker returned ' + res.status);
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error('No checkout URL returned');
    } catch (e) {
      console.error('Checkout error:', e);
      // Fallback : ouvre la modale "bientôt disponible"
      openCheckoutModal();
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Procéder au paiement <span class="arrow">→</span>';
      }
    }
  }

  function openCheckoutModal() {
    const modal = document.querySelector('[data-checkout-modal]');
    if (!modal) return;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeCheckoutModal() {
    const modal = document.querySelector('[data-checkout-modal]');
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  function init() {
    render();
    window.addEventListener('cart:change', render);

    document.querySelectorAll('[data-checkout-close]').forEach((el) => {
      el.addEventListener('click', closeCheckoutModal);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeCheckoutModal();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
