# Système de paiement & accès — Setup Guide

Stack complète pour vendre les chorégraphies et délivrer l'accès aux vidéos
de façon **100% automatisée**.

```
Visiteur clique "Procéder au paiement"
        ↓
[Frontend] cart-page.js → POST /api/create-checkout
        ↓
[Cloudflare Worker] crée une session Stripe Checkout
        ↓
Visiteur paie sur https://checkout.stripe.com/...
        ↓
[Stripe webhook] POST /api/stripe-webhook
        ↓
[Cloudflare Worker]
  - Génère un token unique (64 chars hex)
  - Stocke dans Cloudflare KV : token → {product_id, email, IPs}
  - Envoie email via Resend avec lien magique
        ↓
Acheteur reçoit l'email avec :
  https://ouverturedebal-mariage.fr/cours/{slug}.html?t={token}
        ↓
[Frontend] course-access.js
  - Lit ?t={token}
  - GET /api/verify?token=...&product=...
  - Token OK → cookie posé + Vimeo embed chargé
  - Token KO → message "accès refusé"
```

---

## Architecture côté coûts

| Service | Plan | Coût |
|---|---|---|
| Stripe | Standard | 1.4% + 0.25€ par vente (EU) |
| Cloudflare Workers | Free | 0€ jusqu'à 100k req/jour |
| Cloudflare KV | Free | 0€ jusqu'à 100k reads/jour, 1k writes/jour, 1GB |
| Resend | Free | 0€ jusqu'à 3 000 emails/mois |
| Vimeo Plus | Plus | 7€/mois illimité 4K |
| **Total fixe** | | **7€/mois** (Vimeo) |

À 100 ventes/mois (89€ unitaire) :
- CA brut : 8 900€
- Stripe : ~150€ (1.4% + 25€ frais)
- Vimeo : 7€
- **Marge nette : ~98%**

---

## Setup pas-à-pas

### Étape 1 — Comptes externes (40 min)

#### Stripe
1. https://stripe.com/fr → créer un compte
2. **KYC** : valider identité + RIB (24-48h de validation)
3. Récupérer les clés API (mode **test** d'abord) :
   - **Dashboard → Developers → API keys**
   - `Secret key` (sk_test_xxx) — pour le Worker
   - `Publishable key` (pk_test_xxx) — pas utilisé en serverless

#### Cloudflare
1. https://dash.cloudflare.com/sign-up → créer un compte
2. Pas besoin d'ajouter de domaine si juste pour Workers

#### Resend
1. https://resend.com → créer un compte
2. **Domains → Add Domain → `ouverturedebal-mariage.fr`**
3. Ajouter les enregistrements DNS chez OVH (SPF, DKIM)
4. Attendre validation
5. Récupérer la clé API : `re_xxx`

#### Vimeo
1. https://vimeo.com/upgrade → choisir **Plus** (7€/mois)
2. Privacy par défaut sur toutes les vidéos : **« Hide from Vimeo, only embed on whitelisted domains »**
3. Whitelist : `ouverturedebal-mariage.fr`, `localhost:8765` (pour tests)

---

### Étape 2 — Créer les produits Stripe (1-2h)

Dans **Stripe Dashboard → Products** :

Pour chaque chorégraphie (59 produits = 56 + 3 formules) :
1. Add Product
2. Nom : « Perfect — Ed Sheeran »
3. Description : « Chorégraphie d'ouverture de bal sur Perfect (Ed Sheeran). Accès à vie. »
4. Pricing : **One time** · 89€ (ou 105€ MIX, 149€ Mariage, 349€ Sur-Mesure)
5. Save
6. **Copier le Price ID** (`price_xxx`) → à coller dans `workers/access-token.js` (constante `PRODUCTS`)

**Astuce** : si trop fastidieux à la main, demande à Claude de générer
un script Stripe CLI (en local) pour créer tous les produits en batch
depuis le JSON catalogue.

---

### Étape 3 — Déployer le Worker (30 min)

```bash
# 1. Installer wrangler
npm install -g wrangler

# 2. Se connecter à Cloudflare
wrangler login

# 3. Créer le KV namespace
cd workers
wrangler kv:namespace create ACCESS_TOKENS

# La commande retourne quelque chose comme :
# 🌀  Creating namespace with title "ouverturedebal-access-ACCESS_TOKENS"
# ✨  Success!
# Add the following to your configuration file:
# [[kv_namespaces]]
# binding = "ACCESS_TOKENS"
# id = "abc123def456..."

# 4. Copier l'id dans wrangler.toml (remplacer REPLACE_WITH_KV_NAMESPACE_ID)

# 5. Configurer les secrets
wrangler secret put STRIPE_SECRET_KEY
# → coller sk_test_xxx (mode test au début)
wrangler secret put RESEND_API_KEY
# → coller re_xxx
# STRIPE_WEBHOOK_SECRET : à faire après l'étape 4 (création du webhook)

# 6. Déployer le Worker
wrangler deploy

# Tu obtiens une URL du genre :
# https://ouverturedebal-access.{TON_COMPTE}.workers.dev
```

**Important** : note l'URL exacte du Worker (souvent du format
`https://ouverturedebal-access.{compte}.workers.dev`). Tu en auras besoin
plus tard.

---

### Étape 4 — Configurer le webhook Stripe (10 min)

Dans **Stripe Dashboard → Developers → Webhooks** :
1. **Add endpoint**
2. URL : `https://ouverturedebal-access.{compte}.workers.dev/api/stripe-webhook`
3. Event : `checkout.session.completed`
4. Save
5. **Copier le Signing Secret** (`whsec_xxx`)
6. Retour au terminal :
   ```bash
   cd workers
   wrangler secret put STRIPE_WEBHOOK_SECRET
   # → coller whsec_xxx
   ```

---

### Étape 5 — Mettre à jour les URLs dans le code (10 min)

Une fois le Worker déployé, remplacer **partout** l'URL du Worker :

```bash
# Dans tous les HTML
find . -name "*.html" -exec sed -i '' \
  's|ouverturedebal-access.workers.dev|ouverturedebal-access.{TON_COMPTE}.workers.dev|g' {} +

# Dans le JS
sed -i '' 's|ouverturedebal-access.workers.dev|ouverturedebal-access.{TON_COMPTE}.workers.dev|g' \
  assets/js/cart-page.js

# Dans le build script Python
sed -i '' 's|ouverturedebal-access.workers.dev|ouverturedebal-access.{TON_COMPTE}.workers.dev|g' \
  tools/build-courses.py
```

(Remplace `{TON_COMPTE}` par ton subdomain Cloudflare réel.)

Puis rebuilder :
```bash
python3 tools/build-css.py
python3 tools/build-courses.py
```

---

### Étape 6 — Tester en mode test Stripe (15 min)

1. Aller sur https://ouverturedebal-mariage.fr/choregraphies/perfect-ed-sheeran.html
2. Cliquer « Ajouter au panier »
3. Aller au panier
4. Cliquer « Procéder au paiement »
5. Sur Stripe Checkout, utiliser une carte test : `4242 4242 4242 4242`
   - Exp : n'importe quelle date future
   - CVC : 3 chiffres
   - ZIP : 75001
6. Paiement validé → redirigé vers `/merci-paiement.html`
7. Vérifier que tu reçois bien l'email avec le lien magique
8. Cliquer le lien → la page cours s'affiche avec le player Vimeo

---

### Étape 7 — Passer en production (5 min)

Une fois les tests OK avec les clés `_test_` :

1. Stripe Dashboard → toggle de **« View test data »** désactivé
2. Récupérer les clés LIVE (`sk_live_xxx`)
3. Mettre à jour le secret Worker :
   ```bash
   wrangler secret put STRIPE_SECRET_KEY
   # → coller sk_live_xxx
   ```
4. Refaire les produits Stripe en mode LIVE (les test data ne sont pas migrables)
5. Refaire le webhook Stripe en mode LIVE
6. Re-mettre le `STRIPE_WEBHOOK_SECRET` LIVE
7. Re-mettre à jour `PRODUCTS` dans le Worker avec les nouveaux Price IDs LIVE
8. `wrangler deploy`

🎉 Le système est en prod.

---

## Maintenance

### Voir les logs du Worker en temps réel
```bash
cd workers
wrangler tail
```

### Voir les tokens créés
```bash
wrangler kv:key list --binding=ACCESS_TOKENS
wrangler kv:key get "token:abc123..." --binding=ACCESS_TOKENS
```

### Révoquer un accès (rare)
```bash
wrangler kv:key delete "token:abc123..." --binding=ACCESS_TOKENS
```

### Augmenter la limite d'IPs anti-partage
Modifier dans `access-token.js` : `max_ips: 3` → `max_ips: 5`.

---

## Sécurité — points clés

✅ Signature webhook Stripe vérifiée (HMAC-SHA256)
✅ Token unique de 64 caractères (~10^77 combinaisons)
✅ Limite anti-partage : max 3 IPs uniques par token
✅ Cookie SameSite=Lax + Secure
✅ CSP stricte sur les pages cours (frame-src Vimeo uniquement)
✅ CORS limité à `ouverturedebal-mariage.fr`
✅ Vimeo videos en privacy "domain-locked" (ne joue que sur ton site)

---

## Limites connues

⚠️ **Cloudflare KV : eventually consistent** — un token créé peut prendre
1-2 secondes à être lisible globalement. Pas un problème en pratique
(l'utilisateur clique sur le lien email après 30+ secondes).

⚠️ **Token = porteur de l'accès** — si quelqu'un copie l'URL et la
partage à <3 personnes, ça marche. Mitigations envisageables si abus :
- Réduire `max_ips` à 1 ou 2
- Watermark Vimeo avec l'email du buyer (feature Vimeo Pro+)
- Email de notification quand 2+ IPs détectées

⚠️ **Pas de gestion de remboursement** — il faut révoquer manuellement
le token via `wrangler kv:key delete`. Possibilité d'ajouter un endpoint
`POST /api/revoke` si nécessaire.
