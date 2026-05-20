/**
 * Course access — protège les pages /cours/*.html.
 *
 * Workflow :
 *   1. Lit ?t=xxx dans l'URL OU le cookie `ovb_token`
 *   2. Vérifie le token auprès du Worker (/api/verify)
 *   3. Si OK : pose cookie 30j, retire ?t de l'URL, affiche le contenu
 *   4. Si KO : affiche un message d'accès refusé + lien retour
 *
 * Le product_id et l'URL du Worker sont passés via data-attributes sur <body>.
 */
(function () {
  'use strict';

  function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/;SameSite=Lax;Secure`;
  }

  function getCookie(name) {
    const nameEQ = name + '=';
    const cookies = document.cookie.split(';');
    for (let c of cookies) {
      c = c.trim();
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length);
    }
    return null;
  }

  function showLocked(reason) {
    const lockedEl = document.querySelector('[data-course-locked]');
    const contentEl = document.querySelector('[data-course-content]');
    if (lockedEl) {
      lockedEl.hidden = false;
      const reasonEl = lockedEl.querySelector('[data-locked-reason]');
      if (reasonEl) {
        const messages = {
          missing_token: 'Cette page nécessite un lien d\'accès valide. Si vous avez acheté ce cours, retrouvez votre lien dans l\'email de confirmation envoyé après votre paiement.',
          invalid_token: 'Le lien d\'accès est invalide. Vérifiez bien votre email de confirmation, ou contactez-nous.',
          wrong_product: 'Le lien d\'accès ne correspond pas à ce cours. Utilisez le lien envoyé pour ce produit spécifique.',
          too_many_ips: 'Ce lien a été utilisé sur trop d\'appareils différents (limite anti-partage). Contactez-nous pour récupérer l\'accès.',
          network_error: 'Impossible de vérifier votre accès en ce moment. Réessayez dans quelques instants.',
        };
        reasonEl.textContent = messages[reason] || 'Accès non autorisé.';
      }
    }
    if (contentEl) contentEl.hidden = true;
  }

  function showContent() {
    const lockedEl = document.querySelector('[data-course-locked]');
    const contentEl = document.querySelector('[data-course-content]');
    if (lockedEl) lockedEl.hidden = true;
    if (contentEl) contentEl.hidden = false;
  }

  async function verifyToken(token, productId, workerUrl) {
    try {
      const res = await fetch(
        `${workerUrl}/api/verify?token=${encodeURIComponent(token)}&product=${encodeURIComponent(productId)}`,
        { method: 'GET' }
      );
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (e) {
      return { ok: false, reason: 'network_error' };
    }
  }

  async function init() {
    const body = document.body;
    const productId = body.getAttribute('data-product-id');
    const workerUrl = body.getAttribute('data-worker-url');

    if (!productId || !workerUrl) {
      console.error('Course access : missing data-product-id or data-worker-url on <body>');
      showLocked('missing_token');
      return;
    }

    const cookieName = `ovb_token_${productId}`;

    // 1. Priorité au token dans l'URL
    let token = getQueryParam('t');
    if (token) {
      // Pose le cookie et retire ?t de l'URL (cosmétique)
      setCookie(cookieName, token, 365);
      const clean = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, clean);
    } else {
      // 2. Sinon, regarde le cookie
      token = getCookie(cookieName);
    }

    if (!token) {
      showLocked('missing_token');
      return;
    }

    const result = await verifyToken(token, productId, workerUrl);
    if (result.ok) {
      showContent();
      // Optionnel : afficher l'email du buyer dans le coin
      const emailEl = document.querySelector('[data-customer-email]');
      if (emailEl && result.customer_email) {
        emailEl.textContent = result.customer_email;
      }
    } else {
      // Token invalide : on retire le cookie
      setCookie(cookieName, '', -1);
      showLocked(result.reason || 'invalid_token');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
