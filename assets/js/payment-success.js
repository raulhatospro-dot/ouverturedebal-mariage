/**
 * payment-success.js — vide le panier après paiement réussi
 * (Stripe redirige ici avec ?session_id=cs_xxx)
 */
(function () {
  'use strict';

  function init() {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (sessionId && window.OuvertureDeBalCart) {
      window.OuvertureDeBalCart.clear();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
