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
from pathlib import Path
from html import escape

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


def build_page(template, song):
    """Build a single HTML page from the template and song data."""
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

    # Generate each page
    print(f"Génération de {len(songs)} fiche(s) chorégraphie…")
    for song in songs:
        page = build_page(template, song)
        output_path = OUTPUT_DIR / f"{song['slug']}.html"
        output_path.write_text(page, encoding="utf-8")
        size_kb = len(page) / 1024
        print(f"  ✓ {song['slug']}.html ({size_kb:.1f} KB)")

    print(f"\nTerminé. Fichiers générés dans {OUTPUT_DIR}/")


if __name__ == "__main__":
    main()
