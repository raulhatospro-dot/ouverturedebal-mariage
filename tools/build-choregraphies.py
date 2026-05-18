#!/usr/bin/env python3
"""
Génère les fiches HTML des chorégraphies à partir du template + JSON.

Usage :
    python3 tools/build-choregraphies.py

Lit :
    tools/choregraphie-template.html
    tools/data/choregraphies-data.json

Écrit :
    choregraphies/{slug}.html  (un fichier par chanson)
"""

import json
import re
import subprocess
from pathlib import Path
from html import escape
from datetime import date as _date

ROOT = Path(__file__).parent.parent
TEMPLATE_PATH = ROOT / "tools" / "choregraphie-template.html"
DATA_PATH = ROOT / "tools" / "data" / "choregraphies-data.json"
OUTPUT_DIR = ROOT / "choregraphies"


def html_escape(text):
    """Escape HTML special chars in text content (not in attributes)."""
    if text is None:
        return ""
    return escape(str(text), quote=False)


def render_music_timeline(timeline):
    """Render the music timeline as HTML (3-4 qualitative steps, no timestamps)."""
    items = []
    for entry in timeline:
        items.append(f'''        <div class="choreo-timeline-row">
          <div class="choreo-timeline-label">{html_escape(entry["label"])}</div>
          <div class="choreo-timeline-details">{html_escape(entry["details"])}</div>
        </div>''')
    return "\n".join(items)


def render_dj_version(segments):
    """Render the DJ version cut segments as HTML."""
    items = []
    action_labels = {"keep": "Garder", "cut": "Couper"}
    for seg in segments:
        action_class = f"choreo-dj-segment--{seg['type']}"
        action_label = action_labels.get(seg["type"], seg["type"])
        items.append(f'''          <li class="choreo-dj-segment {action_class}">
            <span class="choreo-dj-segment-action">{html_escape(action_label)}</span>
            <span class="choreo-dj-segment-range">{html_escape(seg["from"])} → {html_escape(seg["to"])}</span>
            <span class="choreo-dj-segment-label">{html_escape(seg["label"])}</span>
          </li>''')
    return "\n".join(items)


def render_music_notes(notes):
    """Render music notes as <li> items."""
    return "\n".join(f'          <li>{html_escape(note)}</li>' for note in notes)


def render_choreo_arc(arc):
    """Render the arc emotionnel grid."""
    items = []
    for step in arc:
        items.append(f'''          <div class="choreo-arc-step">
            <div class="choreo-arc-num">{step["num"]:02d}</div>
            <div class="choreo-arc-title">{html_escape(step["title"])}</div>
            <div class="choreo-arc-time">{html_escape(step["time"])}</div>
            <div class="choreo-arc-key">{html_escape(step["key"])}</div>
            <div class="choreo-arc-mood">{html_escape(step["mood"])}</div>
          </div>''')
    return "\n".join(items)


def render_choreo_parts(parts):
    """Render detailed parts as HTML cards."""
    html_parts = []
    for part in parts:
        figures_html = []
        for i, fig in enumerate(part["figures"], 1):
            tip_html = f'<div class="choreo-fig-tip">↳ {html_escape(fig["tip"])}</div>' if fig.get("tip") else ""
            # Tip is rendered separately if present, otherwise no tip line.
            figures_html.append(f'''            <li>
              <span class="choreo-fig-num">{i:02d}</span>
              <div class="choreo-fig-content">
                <div class="choreo-fig-name">{html_escape(fig["name"])}</div>
                <div class="choreo-fig-desc">{html_escape(fig["desc"])}</div>
              </div>
            </li>''')

        html_parts.append(f'''        <article class="choreo-part-card">
          <header class="choreo-part-header">
            <span class="choreo-part-num">{part["num"]:02d}</span>
            <h3 class="choreo-part-title">{html_escape(part["title"])}</h3>
            <span class="choreo-part-time">{html_escape(part["time"])}</span>
          </header>
          <p class="choreo-part-music"><strong>Musique :</strong> {html_escape(part["music_description"])}</p>
          <ol class="choreo-part-figures">
{chr(10).join(figures_html)}
          </ol>
          <div class="choreo-part-transition"><strong>Transition :</strong> {html_escape(part["transition"])}</div>
        </article>''')
    return "\n".join(html_parts)


def render_figures_list(figures):
    """Render figures grid with level badges."""
    level_class_map = {
        "BASE": "choreo-fig-level--base",
        "FACILE": "choreo-fig-level--easy",
        "INTER.": "choreo-fig-level--mid",
        "INTERMÉDIAIRE": "choreo-fig-level--mid",
    }
    items = []
    for fig in figures:
        level_class = level_class_map.get(fig["level"].upper(), "choreo-fig-level--base")
        items.append(f'''        <div class="choreo-figure-card">
          <div class="choreo-figure-name">{html_escape(fig["name"])}</div>
          <div class="choreo-figure-meta">
            <span class="choreo-figure-level {level_class}">{html_escape(fig["level"])}</span>
            <span class="choreo-figure-loc">{html_escape(fig["loc"])}</span>
          </div>
        </div>''')
    return "\n".join(items)


def render_lifts_list(lifts):
    """Render lifts and their alternatives."""
    items = []
    for lift in lifts:
        items.append(f'''          <li>
            <div class="choreo-lift-name">{html_escape(lift["name"])}</div>
            <div class="choreo-lift-alt"><strong>Alternative sans porté :</strong> {html_escape(lift["alternative"])}</div>
          </li>''')
    return "\n".join(items)


def render_tips(tips):
    """Render tips as cards."""
    items = []
    for tip in tips:
        items.append(f'''        <div class="choreo-tip-card">
          <h3 class="choreo-tip-title">{html_escape(tip["title"])}</h3>
          <p class="choreo-tip-text">{html_escape(tip["text"])}</p>
        </div>''')
    return "\n".join(items)


def render_faq(faq):
    """Render FAQ as details/summary."""
    items = []
    for item in faq:
        items.append(f'''        <details class="choreo-faq-item">
          <summary class="choreo-faq-q">{html_escape(item["q"])}</summary>
          <p class="choreo-faq-a">{html_escape(item["a"])}</p>
        </details>''')
    return "\n".join(items)


def render_bullets(items):
    """Render a simple list of <li> from an array of strings."""
    return "\n".join(f'              <li>{html_escape(item)}</li>' for item in items)


def parse_duration_to_iso(s):
    """Convert '2h 10' or '1h 45' to ISO 8601 duration 'PT2H10M'."""
    m = re.match(r'(\d+)h\s*(\d*)', s)
    if not m:
        return "PT2H"
    h, mins = m.group(1), m.group(2) or "0"
    if mins in ("0", ""):
        return f"PT{h}H"
    return f"PT{h}H{mins}M"


def render_faq_schema(faq):
    """Render FAQPage JSON-LD from faq array, with Speakable for voice assistants."""
    schema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "speakable": {
            "@type": "SpeakableSpecification",
            "cssSelector": [".choreo-faq-q", ".choreo-faq-a"],
        },
        "mainEntity": [
            {
                "@type": "Question",
                "name": item["q"],
                "acceptedAnswer": {"@type": "Answer", "text": item["a"]},
            }
            for item in faq
        ],
    }
    return json.dumps(schema, ensure_ascii=False, indent=2)


def parse_weeks_to_iso(s):
    """Convert '6 à 10' to ISO 8601 'P10W' (using max weeks)."""
    nums = re.findall(r'\d+', s)
    if not nums:
        return "P8W"
    return f"P{nums[-1]}W"


def render_howto_schema(song):
    """Render HowTo JSON-LD with each Part as a step."""
    schema = {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": f"Comment apprendre l'ouverture de bal sur {song['title']}",
        "description": song["choreo_overview"],
        "totalTime": parse_weeks_to_iso(song["preparation_weeks"]),
        "estimatedCost": {
            "@type": "MonetaryAmount",
            "currency": "EUR",
            "value": str(song["price"]),
        },
        "step": [
            {
                "@type": "HowToStep",
                "position": p["num"],
                "name": f"Part {p['num']} : {p['title']}",
                "text": p["music_description"],
                "url": f"https://ouverturedebal-mariage.fr/choregraphies/{song['slug']}.html",
            }
            for p in song["choreo_parts"]
        ],
    }
    return json.dumps(schema, ensure_ascii=False, indent=2)


DATE_PUBLISHED = "2026-05-17"  # date initiale de mise en ligne des fiches


def get_data_modified_date():
    """Date du dernier commit git sur le fichier JSON de données (YYYY-MM-DD)."""
    try:
        r = subprocess.run(
            ["git", "log", "-1", "--format=%cs", "--", str(DATA_PATH)],
            capture_output=True, text=True, cwd=ROOT, check=False
        )
        d = r.stdout.strip()
        return d if d else _date.today().isoformat()
    except Exception:
        return _date.today().isoformat()


def render_related_cards(song, all_songs, n=3):
    """Pick n other songs and render cards for cross-linking."""
    others = [s for s in all_songs if s["slug"] != song["slug"]]
    related = others[:n] if len(others) >= n else others
    items = []
    for s in related:
        items.append(f'''        <a href="{s['slug']}.html" class="choreo-related-card">
          <div class="choreo-related-blob" data-color="{html_escape(s['visual_color'])}" aria-hidden="true"></div>
          <div class="choreo-related-info">
            <span class="choreo-related-style">{html_escape(s['style_label'])}</span>
            <h3 class="choreo-related-title-h">{html_escape(s['title'])}</h3>
            <p class="choreo-related-artist">{html_escape(s['artist'])}</p>
            <span class="choreo-related-price">{s['price']}€</span>
          </div>
        </a>''')
    return "\n".join(items)


def render_breadcrumb_schema(song):
    """Render BreadcrumbList JSON-LD."""
    schema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "Catalogue des chorégraphies",
                "item": "https://ouverturedebal-mariage.fr/choregraphies.html",
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": song["title"],
                "item": f"https://ouverturedebal-mariage.fr/choregraphies/{song['slug']}.html",
            },
        ],
    }
    return json.dumps(schema, ensure_ascii=False, indent=2)


def render_course_schema(song, modified_date):
    """Render Course JSON-LD with datePublished + dateModified for freshness signal."""
    schema = {
        "@context": "https://schema.org",
        "@type": "Course",
        "name": f"Chorégraphie ouverture de bal sur {song['title']} ({song['artist']})",
        "description": song["seo_description"],
        "provider": {
            "@type": "Organization",
            "name": "Ouverture de Bal",
            "url": "https://ouverturedebal-mariage.fr",
        },
        "hasCourseInstance": {
            "@type": "CourseInstance",
            "courseMode": "online",
            "courseWorkload": parse_duration_to_iso(song["course_duration"]),
        },
        "offers": {
            "@type": "Offer",
            "price": str(song["price"]),
            "priceCurrency": "EUR",
            "category": "Online course",
        },
        "datePublished": DATE_PUBLISHED,
        "dateModified": modified_date,
    }
    return json.dumps(schema, ensure_ascii=False, indent=2)


def build_page(template, song, all_songs=None, modified_date=None):
    """Build a single HTML page from the template and song data."""
    if all_songs is None:
        all_songs = [song]
    if modified_date is None:
        modified_date = _date.today().isoformat()
    # Simple string replacements
    replacements = {
        "{{SLUG}}": song["slug"],
        "{{SONG_TITLE}}": song["title"],
        "{{ARTIST}}": song["artist"],
        "{{YEAR}}": str(song["year"]),
        "{{DURATION}}": song["duration"],
        "{{BPM_FELT}}": str(song["bpm_felt"]),
        "{{TIME_SIGNATURE}}": song["time_signature"],
        "{{MODULES}}": str(song["modules"]),
        "{{PREPARATION_WEEKS}}": song["preparation_weeks"],
        "{{PRICE}}": str(song["price"]),
        "{{REVIEW_COUNT}}": str(song["review_count"]),
        "{{STYLE_LABEL}}": song["style_label"],
        "{{LEVEL}}": song["level"],
        "{{VISUAL_COLOR}}": song["visual_color"],
        "{{SEO_TITLE}}": song["seo_title"],
        "{{SEO_DESCRIPTION}}": song["seo_description"],
        "{{OG_TITLE}}": song["og_title"],
        "{{OG_DESCRIPTION}}": song["og_description"],
        "{{HERO_INTRO}}": song["hero_intro"],
        "{{SONG_ANECDOTE}}": song["song_anecdote"],
        "{{SONG_WEDDING_REASON}}": song["song_wedding_reason"],
        "{{MUSIC_INTRO}}": song["music_intro"],
        "{{NB_PARTS}}": str(song["nb_parts"]),
        "{{CHOREO_OVERVIEW}}": song["choreo_overview"],
        "{{FIGURES_INTRO}}": song["figures_intro"],
        "{{FINAL_CTA_TEXT}}": song["final_cta_text"],
        # Dynamic sections (rendered HTML)
        "{{MUSIC_TIMELINE}}": render_music_timeline(song["music_timeline"]),
        "{{MUSIC_NOTES}}": render_music_notes(song["music_notes"]),
        "{{CHOREO_ARC}}": render_choreo_arc(song["choreo_arc"]),
        "{{CHOREO_PARTS}}": render_choreo_parts(song["choreo_parts"]),
        "{{FIGURES_LIST}}": render_figures_list(song["figures_list"]),
        "{{LIFTS_LIST}}": render_lifts_list(song["lifts_list"]),
        "{{TIPS_LIST}}": render_tips(song["tips"]),
        "{{FAQ_LIST}}": render_faq(song["faq"]),
        "{{FOR_YOU_IF}}": render_bullets(song["for_you_if"]),
        "{{WHAT_YOU_LEARN}}": render_bullets(song["what_you_learn"]),
        "{{FAQ_SCHEMA}}": render_faq_schema(song["faq"]),
        "{{BREADCRUMB_SCHEMA}}": render_breadcrumb_schema(song),
        "{{COURSE_SCHEMA}}": render_course_schema(song, modified_date),
        "{{HOWTO_SCHEMA}}": render_howto_schema(song),
        "{{RELATED_CARDS}}": render_related_cards(song, all_songs),
    }

    page = template
    for placeholder, value in replacements.items():
        page = page.replace(placeholder, value)

    # Check for any remaining placeholders (typo detection)
    remaining = re.findall(r"\{\{[A-Z_]+\}\}", page)
    if remaining:
        print(f"  ⚠️  Placeholders non remplacés dans {song['slug']} : {set(remaining)}")

    return page


def main():
    # Load template
    template = TEMPLATE_PATH.read_text(encoding="utf-8")

    # Load data
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    songs = data["songs"]

    # Ensure output directory exists
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Date du dernier commit git sur le JSON de données (pour dateModified)
    modified_date = get_data_modified_date()
    print(f"dateModified utilisé : {modified_date}")

    # Generate each page
    print(f"Génération de {len(songs)} fiche(s) chorégraphie…")
    for song in songs:
        page = build_page(template, song, songs, modified_date)
        output_path = OUTPUT_DIR / f"{song['slug']}.html"
        output_path.write_text(page, encoding="utf-8")
        size_kb = len(page) / 1024
        print(f"  ✓ {song['slug']}.html ({size_kb:.1f} KB)")

    print(f"\nTerminé. Fichiers générés dans {OUTPUT_DIR}/")


if __name__ == "__main__":
    main()
