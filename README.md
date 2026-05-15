# Ouverture de Bal — Site mariage

Site statique pour un service de cours de danse en ligne dédié à l'ouverture de bal de mariage. Aucun build, aucun framework — fichiers HTML/CSS/JS purs, prêts pour GitHub Pages.

## Stack

- HTML5 sémantique
- CSS pur (variables CSS, pas de Sass / Tailwind)
- JavaScript vanilla (menu mobile + animations scroll)
- Google Fonts via CDN (Cormorant Garamond + Inter)

## Structure

```
/
├── index.html                  Accueil
├── choregraphies.html          Catalogue (12 chorégraphies, filtres)
├── formules.html               3 formules + comparatif + FAQ
├── a-propos.html               Histoire + méthode + principes
├── faq.html                    10 questions fréquentes
├── contact.html                Formulaire (mailto)
├── blog.html                   Liste d'articles
│
├── choregraphies/              Fiches produits
│   ├── perfect-ed-sheeran.html
│   ├── all-of-me-john-legend.html
│   └── marry-you-bruno-mars.html
│
├── legal/                      Pages légales
│   ├── mentions-legales.html
│   ├── cgv.html
│   └── politique-confidentialite.html
│
├── assets/
│   ├── css/
│   │   ├── reset.css           Reset moderne
│   │   ├── variables.css       Couleurs, typo, espacements
│   │   ├── components.css      Boutons, cards, badges, forms
│   │   └── main.css            Layout, sections, responsive
│   ├── js/
│   │   ├── menu.js             Toggle burger mobile
│   │   └── scroll-animations.js IntersectionObserver fade-up
│   └── images/                 (placeholders dans le HTML pour l'instant)
│
├── robots.txt
├── sitemap.xml
└── README.md
```

## Activer GitHub Pages

1. Pousser ce dépôt sur GitHub.
2. Aller dans **Settings → Pages**.
3. **Source** : `Deploy from a branch`.
4. **Branch** : `main` / dossier `/ (root)`.
5. Cliquer **Save**.

Le site est disponible sous quelques minutes à `https://<utilisateur>.github.io/<repo>/`.

Pour le domaine `ouverturedebal-mariage.fr` :

1. Créer un fichier `CNAME` à la racine contenant `ouverturedebal-mariage.fr`.
2. Configurer chez votre registrar les enregistrements DNS :
   - `A` vers les IP de GitHub Pages (185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153)
   - `CNAME` `www` vers `<utilisateur>.github.io`

## Ajouter une chorégraphie

1. Dupliquer `choregraphies/perfect-ed-sheeran.html` vers `choregraphies/nouveau-titre.html`.
2. Modifier le `<title>`, la `<meta description>`, le `<link rel="canonical">` et le JSON-LD `Product`.
3. Mettre à jour le contenu de la page : titre, artiste, prix, modules.
4. Ajouter une `<a class="choreo-card">` dans `index.html` (section catalogue) et `choregraphies.html` avec le `data-style` adéquat (`valse`, `slow`, `rock`, `salsa`).
5. Ajouter l'URL dans `sitemap.xml`.

## Modifier les couleurs

Toutes les couleurs sont définies dans `assets/css/variables.css`. Modifier les variables CSS — elles cascadent automatiquement dans tout le site.

```css
:root {
  --bg-primary: #FBF8F3;
  --accent-bordeaux: #A8364C;
  /* ... */
}
```

## Polices

Cormorant Garamond pour les titres (serif, italic en accent), Inter pour le corps. Importées via Google Fonts dans le `<head>` de chaque page. Pour changer, modifier `--font-serif` et `--font-sans` dans `variables.css` et l'URL `<link>` dans chaque HTML.

## Image placeholders

Les visuels sont actuellement des `<div>` colorés (palette pêche / terracotta / espresso). Pour les remplacer par de vraies photos :

1. Placer l'image dans `assets/images/`.
2. Remplacer `<div class="choreo-card__media">…</div>` par `<img class="choreo-card__media" src="assets/images/perfect.jpg" alt="…" />` (et ajouter `width`/`height` + `loading="lazy"`).

## Formulaire de contact

Le formulaire utilise `mailto:` pour rester compatible GitHub Pages. Pour un envoi serveur, brancher sur Formspree, Web3Forms, ou un endpoint Cloud Function en modifiant l'`action` du `<form>` dans `contact.html`.
