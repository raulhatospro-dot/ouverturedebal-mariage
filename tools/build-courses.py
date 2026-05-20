#!/usr/bin/env python3
"""
Génère les pages /cours/{slug}.html (cours privés, accessibles via token).

Lit :
    tools/course-template.html
    tools/data/choregraphies-data.json
    tools/data/course-videos.json   (Vimeo IDs par slug — à créer)
    assets/css/.version             (cache buster CSS)

Écrit :
    cours/{slug}.html  (un fichier par chanson)

Si course-videos.json n'existe pas, génère quand même les pages avec
des Vimeo IDs placeholders ("PLACEHOLDER") — utile pour préparer le site
avant le tournage des vidéos.

Usage :
    python3 tools/build-courses.py
"""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE = ROOT / "tools" / "course-template.html"
DATA = ROOT / "tools" / "data" / "choregraphies-data.json"
VIDEOS = ROOT / "tools" / "data" / "course-videos.json"
VERSION = ROOT / "assets" / "css" / ".version"
OUT_DIR = ROOT / "cours"

# Adresse du Worker Cloudflare une fois déployé.
# À modifier après le déploiement (workers.dev → custom domain idéalement).
WORKER_HOST = "ouverturedebal-access.workers.dev"

# Mapping niveau → mots à afficher (depuis preparation_weeks)
def html_escape(s):
    return (str(s)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#39;"))


def load_videos():
    """Charge les Vimeo IDs par slug. Retourne {} si fichier absent."""
    if not VIDEOS.exists():
        return {}
    return json.loads(VIDEOS.read_text(encoding="utf-8"))


def render_modules_list(song, videos):
    """Génère la liste des modules vidéo. Pour chaque module, Vimeo ID
    récupéré dans course-videos.json[slug]['modules'][i] ou PLACEHOLDER."""
    nb_modules = song.get("modules", 8)
    slug_videos = videos.get(song["slug"], {})
    modules = slug_videos.get("modules", [])

    items = []
    for i in range(nb_modules):
        vimeo_id = modules[i] if i < len(modules) else "PLACEHOLDER"
        items.append(f'''<li class="course-module" data-module="{i+1}">
              <button type="button" class="course-module__btn" data-vimeo-id="{vimeo_id}">
                <span class="course-module__num">{i+1:02d}</span>
                <div class="course-module__info">
                  <span class="course-module__title">Module {i+1}</span>
                  <span class="course-module__duration">~ 8-15 min</span>
                </div>
                <svg class="course-module__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </button>
            </li>''')
    return "\n          ".join(items)


def build_one(song, videos, css_version):
    template = TEMPLATE.read_text(encoding="utf-8")
    slug_videos = videos.get(song["slug"], {})

    placeholders = {
        "{{SLUG}}": song["slug"],
        "{{COURSE_TITLE}}": html_escape(song["title"]),
        "{{ARTIST}}": html_escape(song["artist"]),
        "{{STYLE_LABEL}}": html_escape(song.get("style_label", "")),
        "{{MODULES}}": str(song.get("modules", 8)),
        "{{COURSE_DURATION}}": html_escape(song.get("course_duration", "")),
        "{{VIMEO_ID_MAIN}}": slug_videos.get("main", "PLACEHOLDER"),
        "{{MODULES_LIST}}": render_modules_list(song, videos),
        "{{WORKER_HOST}}": WORKER_HOST,
        # Note : le cache buster sur main.css est géré automatiquement par
        # build-css.py qui scanne tous les HTML. Pas besoin de l'injecter ici.
    }

    out = template
    for k, v in placeholders.items():
        out = out.replace(k, str(v))

    return out


def main():
    if not TEMPLATE.exists():
        raise SystemExit(f"❌ Template manquant : {TEMPLATE}")
    if not DATA.exists():
        raise SystemExit(f"❌ Data JSON manquant : {DATA}")

    data = json.loads(DATA.read_text(encoding="utf-8"))
    songs = data.get("songs", [])
    videos = load_videos()
    css_version = VERSION.read_text(encoding="utf-8").strip() if VERSION.exists() else "1"

    if not videos:
        print("ℹ️  course-videos.json absent — utilisation de Vimeo IDs PLACEHOLDER.")
        print("   Crée le fichier après tournage avec la structure :")
        print('   { "perfect-ed-sheeran": {"main": "123456789", "modules": ["100", "101", ...]}, ... }')
        print()

    OUT_DIR.mkdir(exist_ok=True)
    print(f"Génération de {len(songs)} page(s) cours…")
    for song in songs:
        out_path = OUT_DIR / f"{song['slug']}.html"
        out_path.write_text(build_one(song, videos, css_version), encoding="utf-8")
        print(f"  ✓ {out_path.relative_to(ROOT)} ({out_path.stat().st_size // 1024} KB)")

    print(f"\n✓ {len(songs)} pages générées dans {OUT_DIR.relative_to(ROOT)}/")
    print(f"  Worker URL utilisée : https://{WORKER_HOST}")
    print(f"  CSS version : {css_version}")


if __name__ == "__main__":
    main()
