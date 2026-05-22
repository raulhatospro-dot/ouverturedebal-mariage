#!/usr/bin/env python3
"""
Analyse vidéo de chorégraphie via Gemini 2.5 Pro.

Usage :
    python3 tools/analyze-video.py "https://youtube.com/watch?v=XXX"
    python3 tools/analyze-video.py "/chemin/vers/video.mp4"
    python3 tools/analyze-video.py "URL" --style slow
    python3 tools/analyze-video.py "URL" --reference perfect-ed-sheeran

Options :
    --style slow|valse|rock|mix    Hint sur le style attendu
    --reference SLUG               Compare avec une fiche du catalogue
    --pro                          Force Gemini 2.5 Pro (nécessite facturation activée)
    --raw                          Affiche le retour brut Gemini (debug)

Prérequis :
    pip3 install google-genai
    brew install ffmpeg yt-dlp
    Créer une clé Gemini API : https://aistudio.google.com/apikey
    La mettre dans tools/.env :  GEMINI_API_KEY=AIza...

Sortie :
    - Console : analyse timeline + figures détectées
    - JSON : tools/data/video-analyses/<nom>.json
"""

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "tools" / "data" / "video-analyses"
CATALOG = ROOT / "tools" / "data" / "choregraphies-data.json"
ENV_FILE = ROOT / "tools" / ".env"


# ----- Chargement de la clé API depuis .env -----

def load_env():
    """Lit tools/.env (KEY=value par ligne)."""
    if not ENV_FILE.exists():
        return {}
    env = {}
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip("'\"")
    return env


# ----- Lexique de figures (extrait dynamiquement du catalogue) -----

def load_lexicon():
    """Extrait toutes les figures uniques du catalogue."""
    if not CATALOG.exists():
        return []
    data = json.loads(CATALOG.read_text(encoding="utf-8"))
    figures = {}
    for song in data.get("songs", []):
        for fig in song.get("figures_list", []):
            name = fig.get("name", "")
            level = fig.get("level", "")
            if name and name not in figures:
                figures[name] = level
    return sorted(figures.items())


def build_lexicon_prompt():
    figures = load_lexicon()
    if not figures:
        return ""
    lines = ["VOCABULAIRE DE FIGURES DE RÉFÉRENCE (utilise ces noms quand tu reconnais une figure) :"]
    for name, level in figures:
        lines.append(f"  - {name} (niveau : {level})")
    return "\n".join(lines)


# ----- Téléchargement YouTube -----

def download_youtube(url, output_dir):
    print("🌐 Téléchargement vidéo YouTube…", flush=True)
    output_tpl = output_dir / "video.%(ext)s"
    cmd = [
        "yt-dlp",
        # Limite à 480p pour économiser bande passante + traitement Gemini
        "-f", "best[height<=480]/best",
        "--merge-output-format", "mp4",
        "-o", str(output_tpl),
        "--print-json", "--no-progress",
        url,
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"❌ yt-dlp a échoué :\n{res.stderr}", file=sys.stderr)
        sys.exit(1)
    title = "video"
    try:
        meta = json.loads(res.stdout)
        title = meta.get("title", "video")
    except json.JSONDecodeError:
        pass
    video_files = list(output_dir.glob("video.*"))
    if not video_files:
        print("❌ Aucun fichier vidéo téléchargé", file=sys.stderr)
        sys.exit(1)
    print(f"✓ Téléchargé : {title}")
    return video_files[0], title


# ----- Analyse Gemini -----

def build_prompt(style_hint=None, reference_song=None):
    lexicon = build_lexicon_prompt()
    style_line = f"STYLE ATTENDU : {style_hint}\n" if style_hint else ""
    ref_line = ""
    if reference_song:
        ref_line = (
            f"RÉFÉRENCE CATALOGUE : « {reference_song.get('title')} » de {reference_song.get('artist')} "
            f"({reference_song.get('style_label')}, niveau {reference_song.get('level')}).\n"
            f"Cette vidéo en est probablement une variation. Cherche les figures listées dans : "
            f"{', '.join(f['name'] for f in reference_song.get('figures_list', [])[:15])}.\n\n"
        )

    return f"""Tu es expert en chorégraphie de danse de salon pour mariages.
Analyse cette vidéo d'ouverture de bal et décompose-la en timeline structurée.

{style_line}{ref_line}{lexicon}

INSTRUCTIONS :
1. Identifie chaque figure que tu vois, en utilisant les noms du vocabulaire ci-dessus quand possible
2. Donne le timestamp de début (format MM:SS) et la durée approximative en secondes
3. Décris brièvement ce que tu vois (cadre fermé, ouvert, tour de la mariée, etc.)
4. Regroupe en sections logiques (intro / couplet / refrain / pont / final)
5. Note tout porté (lift) avec précision

FORMAT DE SORTIE — réponds en JSON strict (RIEN d'autre, pas de markdown, pas de commentaires) :
{{
  "duration_estimated": "MM:SS",
  "style_detected": "slow|valse|rock|mix",
  "level_detected": "débutant|intermédiaire|avancé",
  "sections": [
    {{
      "name": "Intro",
      "start": "00:00",
      "end": "00:30",
      "mood": "feutré",
      "figures": [
        {{
          "name": "Walk-in slow",
          "start": "00:00",
          "duration_sec": 4,
          "description": "Quatre pas lents, posture droite"
        }}
      ]
    }}
  ],
  "lifts_detected": [
    {{"name": "Princess lift", "start": "01:42", "comment": "Sur le mot signature du refrain"}}
  ],
  "synthesis": "Synthèse en 2-3 phrases : style, qualité, points forts."
}}
"""


def analyze_with_gemini(video_path, api_key, style_hint=None, reference_song=None, raw=False, use_pro=False):
    from google import genai

    client = genai.Client(api_key=api_key)
    model = "gemini-2.5-pro" if use_pro else "gemini-2.5-flash"

    print(f"📤 Upload vidéo à Gemini (modèle : {model})…", flush=True)
    uploaded = client.files.upload(file=str(video_path))

    # Wait for processing
    while uploaded.state.name == "PROCESSING":
        print("   …processing…", flush=True)
        time.sleep(3)
        uploaded = client.files.get(name=uploaded.name)

    if uploaded.state.name != "ACTIVE":
        print(f"❌ Upload échoué : {uploaded.state.name}", file=sys.stderr)
        sys.exit(1)

    print("✓ Upload OK, analyse en cours…", flush=True)
    prompt = build_prompt(style_hint=style_hint, reference_song=reference_song)

    response = client.models.generate_content(
        model=model,
        contents=[uploaded, prompt],
    )

    text = response.text or ""

    if raw:
        print("\n--- RETOUR BRUT GEMINI ---")
        print(text)
        print("--- FIN RETOUR BRUT ---\n")

    # Extract JSON (Gemini peut entourer de ```json)
    text_clean = re.sub(r"^```(?:json)?\s*", "", text.strip(), flags=re.MULTILINE)
    text_clean = re.sub(r"\s*```$", "", text_clean, flags=re.MULTILINE)

    try:
        data = json.loads(text_clean)
    except json.JSONDecodeError as e:
        print(f"⚠️ JSON invalide retourné par Gemini : {e}")
        print("Retour brut :", text[:500])
        return {"error": "invalid_json", "raw": text}

    return data


# ----- Affichage -----

def print_analysis(data, video_title):
    print(f"\n{'═' * 70}")
    print(f"  📹 {video_title}")
    print(f"{'═' * 70}")
    if data.get("error"):
        print(f"⚠️ Erreur : {data['error']}")
        return

    print(f"  Durée estimée   : {data.get('duration_estimated', '?')}")
    print(f"  Style détecté   : {data.get('style_detected', '?')}")
    print(f"  Niveau détecté  : {data.get('level_detected', '?')}")
    print(f"{'─' * 70}")

    sections = data.get("sections", [])
    for sec in sections:
        print(f"\n📐 {sec.get('name', 'Section')}  [{sec.get('start')} → {sec.get('end')}]  ({sec.get('mood', '')})")
        for fig in sec.get("figures", []):
            duration = fig.get("duration_sec", "?")
            print(f"   • {fig.get('start', '?')}  {fig.get('name', '?')}  ({duration}s)")
            desc = fig.get("description", "")
            if desc:
                print(f"          ↳ {desc}")

    lifts = data.get("lifts_detected", [])
    if lifts:
        print(f"\n🏋️ PORTÉS DÉTECTÉS")
        for lift in lifts:
            print(f"   • {lift.get('start')}  {lift.get('name')}  — {lift.get('comment', '')}")

    synthesis = data.get("synthesis", "")
    if synthesis:
        print(f"\n📝 SYNTHÈSE")
        print(f"   {synthesis}")


def slugify(name):
    s = re.sub(r"[^\w\s-]", "", name.lower())
    s = re.sub(r"[\s_-]+", "-", s)
    return s.strip("-") or "video"


# ----- Main -----

def main():
    parser = argparse.ArgumentParser(description="Analyse vidéo de chorégraphie via Gemini")
    parser.add_argument("source", help="URL YouTube ou chemin vers fichier vidéo")
    parser.add_argument("--style", choices=["slow", "valse", "rock", "mix"], default=None,
                        help="Hint sur le style attendu")
    parser.add_argument("--reference", type=str, default=None,
                        help="Slug d'une fiche du catalogue à utiliser comme référence")
    parser.add_argument("--pro", action="store_true",
                        help="Force Gemini 2.5 Pro (nécessite facturation activée, sinon Flash en gratuit)")
    parser.add_argument("--raw", action="store_true", help="Affiche le retour brut Gemini")
    args = parser.parse_args()

    env = load_env()
    api_key = env.get("GEMINI_API_KEY") or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("❌ Clé GEMINI_API_KEY manquante.")
        print(f"   Crée-la sur https://aistudio.google.com/apikey")
        print(f"   Ajoute-la dans : {ENV_FILE.relative_to(ROOT)}")
        print(f"   Format : GEMINI_API_KEY=AIza...")
        sys.exit(1)

    # Lookup référence
    reference_song = None
    if args.reference:
        data = json.loads(CATALOG.read_text(encoding="utf-8"))
        for s in data.get("songs", []):
            if s.get("slug") == args.reference:
                reference_song = s
                print(f"📚 Référence : {s['title']} ({s['artist']})")
                break
        if not reference_song:
            print(f"⚠️ Slug non trouvé : {args.reference}")

    # Source vidéo
    if args.source.startswith("http"):
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)
            video_path, title = download_youtube(args.source, tmpdir_path)
            result = analyze_with_gemini(
                video_path, api_key,
                style_hint=args.style, reference_song=reference_song, raw=args.raw,
                use_pro=args.pro,
            )
    else:
        video_path = Path(args.source).expanduser().resolve()
        if not video_path.exists():
            print(f"❌ Fichier non trouvé : {video_path}", file=sys.stderr)
            sys.exit(1)
        title = video_path.stem
        result = analyze_with_gemini(
            video_path, api_key,
            style_hint=args.style, reference_song=reference_song, raw=args.raw,
        )

    print_analysis(result, title)

    # Save JSON
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_json = OUT_DIR / f"{slugify(title)}.json"
    out_json.write_text(json.dumps({"title": title, **result}, ensure_ascii=False, indent=2),
                        encoding="utf-8")
    print(f"\n💾 Sauvegardé : {out_json.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
