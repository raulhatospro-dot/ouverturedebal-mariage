(function () {
  'use strict';

  const COOKIE_NAME = 'cookies-accepted';
  const COOKIE_DURATION = 365; // jours

  function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = 'expires=' + date.toUTCString();
    document.cookie = name + '=' + value + ';' + expires + ';path=/;SameSite=Lax';
  }

  function getCookie(name) {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  function createBanner() {
    const banner = document.createElement('div');
    banner.className = 'cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Bandeau de gestion des cookies');
    banner.innerHTML = `
      <div class="cookie-banner-inner">
        <div class="cookie-banner-icon" aria-hidden="true">🍪</div>
        <div class="cookie-banner-text">
          <div class="cookie-banner-title">Cookies &amp; confidentialité</div>
          <div class="cookie-banner-description">
            Nous utilisons des cookies essentiels pour faire fonctionner le site et améliorer votre expérience. <a href="/legal/confidentialite.html#cookies">En savoir plus</a>
          </div>
        </div>
        <div class="cookie-banner-actions">
          <button type="button" class="cookie-btn cookie-btn-secondary" data-action="customize">Personnaliser</button>
          <button type="button" class="cookie-btn cookie-btn-primary" data-action="accept">Accepter</button>
        </div>
      </div>
    `;
    return banner;
  }

  function showBanner() {
    if (getCookie(COOKIE_NAME) === 'true') return;

    const banner = createBanner();
    document.body.appendChild(banner);

    // Animation d'entrée après un court délai
    setTimeout(function () {
      banner.classList.add('cookie-banner-visible');
    }, 100);

    // Gestion des clics
    banner.addEventListener('click', function (e) {
      const action = e.target.dataset && e.target.dataset.action;

      if (action === 'accept') {
        setCookie(COOKIE_NAME, 'true', COOKIE_DURATION);
        banner.classList.remove('cookie-banner-visible');
        setTimeout(function () { banner.remove(); }, 400);
      }

      if (action === 'customize') {
        window.location.href = '/legal/confidentialite.html#cookies';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showBanner);
  } else {
    showBanner();
  }
})();
