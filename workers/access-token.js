/**
 * Cloudflare Worker — Système d'accès Ouverture de Bal
 *
 * Endpoints :
 *   POST /api/create-checkout   → crée une session Stripe Checkout
 *   POST /api/stripe-webhook    → reçoit l'event Stripe paiement,
 *                                 génère token, stocke KV, envoie email
 *   GET  /api/verify            → vérifie token + product, retourne accès
 *
 * Dépendances externes :
 *   - Stripe API (paiement)
 *   - Resend API (email)
 *   - Cloudflare KV namespace `ACCESS_TOKENS` (binding défini dans wrangler.toml)
 *
 * Variables d'environnement (Cloudflare → Settings → Variables) :
 *   STRIPE_SECRET_KEY        sk_live_xxx ou sk_test_xxx
 *   STRIPE_WEBHOOK_SECRET    whsec_xxx (de l'endpoint webhook Stripe)
 *   RESEND_API_KEY           re_xxx
 *   SITE_URL                 https://ouverturedebal-mariage.fr
 *   ALLOWED_ORIGIN           https://ouverturedebal-mariage.fr (pour CORS)
 */

// ---------- Manifest produits ----------
// Mapping product_id (slug) → { name, price (cents), stripe_price_id }
// À remplir avec les vrais Stripe Price IDs après création des produits Stripe.
const PRODUCTS = {
  // Chorégraphies — 89€
  'perfect-ed-sheeran':                          { name: 'Perfect — Ed Sheeran',                   price_cents: 8900,  stripe_price_id: 'price_REPLACE_perfect' },
  'a-thousand-years-christina-perri':            { name: 'A Thousand Years — Christina Perri',     price_cents: 8900,  stripe_price_id: 'price_REPLACE_athousand' },
  'marry-you-bruno-mars':                        { name: 'Marry You — Bruno Mars',                 price_cents: 8900,  stripe_price_id: 'price_REPLACE_marryyou' },
  // ... à compléter avec les 53 autres slugs après création Stripe
  // MIX — 105€
  'mix-cant-help-carry-you-home':                { name: 'MIX Can\'t Help & Carry You Home',       price_cents: 10500, stripe_price_id: 'price_REPLACE_mixcanthelp' },
  'mix-a-thousand-years-rewrite-the-stars':      { name: 'MIX A Thousand Years & Rewrite Stars',   price_cents: 10500, stripe_price_id: 'price_REPLACE_mixathousand' },
  // Formules — 89€ / 149€ / 349€
  'formule-essentiel':                           { name: 'Formule Essentiel',                       price_cents: 8900,  stripe_price_id: 'price_REPLACE_essentiel' },
  'formule-mariage':                             { name: 'Formule Mariage',                         price_cents: 14900, stripe_price_id: 'price_REPLACE_mariage' },
  'formule-sur-mesure':                          { name: 'Formule Sur-Mesure',                      price_cents: 34900, stripe_price_id: 'price_REPLACE_surmesure' },
};

// ---------- Utilitaires ----------
function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature',
  };
}

function jsonResponse(data, status, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
  });
}

function generateToken() {
  // 32 bytes hex = 64 chars, suffisamment imprévisible
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ---------- Endpoint : POST /api/create-checkout ----------
async function handleCreateCheckout(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: 'Invalid JSON' }, 400, env);
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return jsonResponse({ error: 'Cart is empty' }, 400, env);
  }

  // Construire line_items avec validation des produits côté serveur
  const line_items = [];
  for (const item of items) {
    const product = PRODUCTS[item.id];
    if (!product) {
      return jsonResponse({ error: `Unknown product: ${item.id}` }, 400, env);
    }
    line_items.push({ price: product.stripe_price_id, quantity: 1 });
  }

  // Créer la session Stripe Checkout
  const formData = new URLSearchParams();
  formData.append('mode', 'payment');
  formData.append('success_url', `${env.SITE_URL}/merci-paiement.html?session_id={CHECKOUT_SESSION_ID}`);
  formData.append('cancel_url', `${env.SITE_URL}/panier.html`);
  line_items.forEach((li, i) => {
    formData.append(`line_items[${i}][price]`, li.price);
    formData.append(`line_items[${i}][quantity]`, String(li.quantity));
  });
  // Stocker les product_ids en metadata pour les récupérer au webhook
  formData.append('metadata[product_ids]', items.map(i => i.id).join(','));
  // Activer la collecte d'email pour le buyer (pour Resend)
  formData.append('customer_email', body.email || '');
  formData.append('locale', 'fr');

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  const session = await res.json();
  if (!res.ok) {
    return jsonResponse({ error: 'Stripe error', details: session }, 502, env);
  }

  return jsonResponse({ url: session.url, session_id: session.id }, 200, env);
}

// ---------- Endpoint : POST /api/stripe-webhook ----------
async function handleStripeWebhook(request, env) {
  const signature = request.headers.get('Stripe-Signature');
  const rawBody = await request.text();

  // Vérifier signature Stripe (anti-spoofing)
  // En production, utiliser stripe.webhooks.constructEvent.
  // Ici, version simplifiée (Cloudflare Workers n'a pas le SDK Stripe complet).
  if (!signature || !env.STRIPE_WEBHOOK_SECRET) {
    return new Response('Missing signature or secret', { status: 400 });
  }
  const isValid = await verifyStripeSignature(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  if (!isValid) {
    return new Response('Invalid signature', { status: 401 });
  }

  const event = JSON.parse(rawBody);
  if (event.type !== 'checkout.session.completed') {
    return new Response('Event ignored', { status: 200 });
  }

  const session = event.data.object;
  const customerEmail = session.customer_details?.email || session.customer_email;
  const productIds = (session.metadata?.product_ids || '').split(',').filter(Boolean);

  if (!customerEmail || productIds.length === 0) {
    return new Response('Missing email or products', { status: 400 });
  }

  // Pour chaque produit acheté, créer un token et envoyer un lien
  const accessLinks = [];
  for (const productId of productIds) {
    const product = PRODUCTS[productId];
    if (!product) continue;

    const token = generateToken();
    const record = {
      product_id: productId,
      customer_email: customerEmail.toLowerCase(),
      created_at: Date.now(),
      stripe_session_id: session.id,
      ip_uses: [],          // IPs uniques ayant utilisé le token
      max_ips: 3,           // limite anti-partage
    };
    await env.ACCESS_TOKENS.put(`token:${token}`, JSON.stringify(record));
    // Index inversé pour permettre revenir au token via email (en cas de perte)
    await env.ACCESS_TOKENS.put(`email:${customerEmail.toLowerCase()}:${productId}`, token);

    accessLinks.push({
      product_id: productId,
      product_name: product.name,
      url: `${env.SITE_URL}/cours/${productId}.html?t=${token}`,
    });
  }

  // Envoyer l'email via Resend
  await sendAccessEmail(customerEmail, accessLinks, env);

  return new Response('OK', { status: 200 });
}

// ---------- Endpoint : GET /api/verify ----------
async function handleVerify(request, env) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const productId = url.searchParams.get('product');

  if (!token || !productId) {
    return jsonResponse({ ok: false, reason: 'missing_params' }, 400, env);
  }

  const recordRaw = await env.ACCESS_TOKENS.get(`token:${token}`);
  if (!recordRaw) {
    return jsonResponse({ ok: false, reason: 'invalid_token' }, 200, env);
  }
  const record = JSON.parse(recordRaw);
  if (record.product_id !== productId) {
    return jsonResponse({ ok: false, reason: 'wrong_product' }, 200, env);
  }

  // Anti-partage : limiter le nombre d'IPs uniques
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (!record.ip_uses.includes(ip)) {
    if (record.ip_uses.length >= record.max_ips) {
      return jsonResponse({ ok: false, reason: 'too_many_ips' }, 200, env);
    }
    record.ip_uses.push(ip);
    await env.ACCESS_TOKENS.put(`token:${token}`, JSON.stringify(record));
  }

  return jsonResponse({
    ok: true,
    product_id: record.product_id,
    customer_email: record.customer_email,
  }, 200, env);
}

// ---------- Helpers ----------

// Vérification signature Stripe (HMAC-SHA256)
async function verifyStripeSignature(payload, header, secret) {
  // Parse "t=...,v1=..." format
  const parts = header.split(',').reduce((acc, part) => {
    const [k, v] = part.split('=');
    if (!acc[k]) acc[k] = v;
    return acc;
  }, {});
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');

  // Timing-safe comparison
  if (computed.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

// Envoi email d'accès via Resend
async function sendAccessEmail(toEmail, accessLinks, env) {
  const itemsHtml = accessLinks.map(l => `
    <tr>
      <td style="padding: 16px 0; border-bottom: 1px solid #E8DCD0;">
        <div style="font-family: Georgia, serif; font-size: 18px; color: #2B1F17; margin-bottom: 8px;">${escapeHtml(l.product_name)}</div>
        <a href="${l.url}" style="display: inline-block; background: #A8364C; color: #FBF8F3; padding: 12px 24px; text-decoration: none; border-radius: 100px; font-family: 'Helvetica Neue', sans-serif; font-size: 14px; font-weight: 500;">Accéder à mon cours →</a>
      </td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Votre accès Ouverture de Bal</title></head>
<body style="margin: 0; padding: 40px 20px; background: #FBF8F3; font-family: Georgia, serif;">
  <table style="max-width: 560px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; padding: 40px;">
    <tr><td>
      <h1 style="font-family: Georgia, serif; font-size: 28px; color: #2B1F17; margin: 0 0 16px;">Votre accès est prêt 💃</h1>
      <p style="font-family: 'Helvetica Neue', sans-serif; font-size: 15px; color: #6B5D52; line-height: 1.6; margin: 0 0 32px;">
        Merci pour votre achat ! Voici vos liens d'accès personnels. Conservez précieusement cet email — c'est votre porte d'entrée à vie.
      </p>
      <table style="width: 100%;">${itemsHtml}</table>
      <p style="font-family: 'Helvetica Neue', sans-serif; font-size: 13px; color: #8A7968; line-height: 1.6; margin: 32px 0 0; padding-top: 24px; border-top: 1px solid #E8DCD0;">
        ✓ Accès à vie · ✓ Garantie 14 jours · ✓ Compatible mobile, tablette, TV<br><br>
        Une question ? Répondez à cet email, nous vous lirons.
      </p>
    </td></tr>
  </table>
  <p style="text-align: center; font-family: 'Helvetica Neue', sans-serif; font-size: 12px; color: #8A7968; margin: 24px 0;">
    Ouverture de Bal — Apprenez votre première danse, depuis chez vous.
  </p>
</body>
</html>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Ouverture de Bal <hello@ouverturedebal-mariage.fr>',
      to: [toEmail],
      subject: 'Votre accès est prêt — Ouverture de Bal',
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Resend error', res.status, err);
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ---------- Routeur principal ----------
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }

    if (url.pathname === '/api/create-checkout' && request.method === 'POST') {
      return handleCreateCheckout(request, env);
    }
    if (url.pathname === '/api/stripe-webhook' && request.method === 'POST') {
      return handleStripeWebhook(request, env);
    }
    if (url.pathname === '/api/verify' && request.method === 'GET') {
      return handleVerify(request, env);
    }

    return new Response('Not found', { status: 404 });
  },
};
