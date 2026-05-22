#!/usr/bin/env python3
"""
Analyse audio pour chorégraphie : BPM, beats, downbeats, sections.

Usage :
    python3 tools/analyze-audio.py "https://youtube.com/watch?v=XXX"
    python3 tools/analyze-audio.py "/chemin/vers/chanson.mp3"
    python3 tools/analyze-audio.py "URL" --time-sig 3/4
    python3 tools/analyze-audio.py "URL" --match "Hallelujah"
    python3 tools/analyze-audio.py "URL" --bpm-hint 76

Options :
    --time-sig 3/4|4/4   Force la signature rythmique (par défaut : 4/4)
    --bpm-hint N         Indique le BPM attendu à librosa (améliore la détection)
    --match TITRE        Cherche dans ton catalogue pour comparer (BPM officiel vs détecté)

Sortie :
    - Affichage console
    - Fichier JSON : tools/data/audio-analyses/<nom>.json
"""

import argparse
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import librosa
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "tools" / "data" / "audio-analyses"
CATALOG_PATH = ROOT / "tools" / "data" / "choregraphies-data.json"


# ----- Helpers -----

def fmt_time(seconds):
    m = int(seconds // 60)
    s = seconds % 60
    return f"{m:02d}:{s:05.2f}"


def slugify(name):
    s = re.sub(r"[^\w\s-]", "", name.lower())
    s = re.sub(r"[\s_-]+", "-", s)
    return s.strip("-") or "audio"


def normalize_for_match(s):
    """Pour matcher 'Hallelujah - Alexandra Burke' à 'Hallelujah'."""
    return re.sub(r"[^a-z0-9]", "", s.lower())


# ----- Catalogue lookup -----

def find_in_catalog(query):
    """Cherche dans choregraphies-data.json. Retourne le song dict ou None."""
    if not CATALOG_PATH.exists():
        return None
    data = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    songs = data.get("songs", [])
    q_norm = normalize_for_match(query)
    # Exact match d'abord
    for s in songs:
        if normalize_for_match(s.get("title", "")) == q_norm:
            return s
    # Partial match ensuite
    for s in songs:
        title_norm = normalize_for_match(s.get("title", ""))
        if q_norm in title_norm or title_norm in q_norm:
            return s
    return None


# ----- Téléchargement YouTube -----

def download_youtube_audio(url, output_dir):
    print("🌐 Téléchargement audio depuis YouTube…", flush=True)
    output_tpl = output_dir / "audio.%(ext)s"
    cmd = [
        "yt-dlp",
        "-x", "--audio-format", "mp3", "--audio-quality", "0",
        "-o", str(output_tpl),
        "--print-json", "--no-progress",
        url,
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"❌ yt-dlp a échoué :\n{res.stderr}", file=sys.stderr)
        sys.exit(1)
    title = "audio"
    try:
        meta = json.loads(res.stdout)
        title = meta.get("title", "audio")
    except json.JSONDecodeError:
        pass
    mp3_files = list(output_dir.glob("audio.*"))
    if not mp3_files:
        print("❌ Aucun fichier audio téléchargé", file=sys.stderr)
        sys.exit(1)
    print(f"✓ Téléchargé : {title}")
    return mp3_files[0], title


# ----- Analyse audio -----

def detect_sections(y, sr, beats):
    """Détection rudimentaire de sections via chroma + clustering."""
    try:
        chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
        beat_frames = librosa.time_to_frames(beats, sr=sr)
        chroma_sync = librosa.util.sync(chroma, beat_frames, aggregate=np.median)
        n_segments = min(8, max(3, len(beats) // 30))
        bound_frames = librosa.segment.agglomerative(chroma_sync, n_segments)
        bound_times = [float(beats[i]) for i in bound_frames if i < len(beats)]
        return sorted(set(bound_times))
    except Exception:
        return []


def analyze(audio_path, title=None, time_sig="4/4", bpm_hint=None, match_song=None):
    if title is None:
        title = audio_path.stem

    print(f"\n📂 Analyse de : {title}")
    print("⏳ Chargement audio…", flush=True)

    y, sr = librosa.load(str(audio_path), sr=22050)
    duration = librosa.get_duration(y=y, sr=sr)

    # Beat tracking avec hint BPM optionnel
    kwargs = {"y": y, "sr": sr, "units": "time"}
    if bpm_hint is not None:
        kwargs["start_bpm"] = bpm_hint
    tempo, beats = librosa.beat.beat_track(**kwargs)
    tempo_f = float(np.atleast_1d(tempo)[0])

    # Downbeats selon signature
    beats_per_bar = 3 if time_sig == "3/4" else 4
    downbeats = beats[::beats_per_bar]

    # Sections
    sections = detect_sections(y, sr, beats)

    # ----- Affichage -----
    print(f"\n{'═' * 60}")
    print(f"  🎵 {title}")
    print(f"{'═' * 60}")
    print(f"  Durée       : {fmt_time(duration)}")
    print(f"  BPM détecté : {tempo_f:.1f}")
    if bpm_hint:
        print(f"  BPM hint    : {bpm_hint} (utilisé pour guider la détection)")
    print(f"  Signature   : {time_sig}")
    print(f"  Beats       : {len(beats)} détectés")
    print(f"  Mesures     : {len(downbeats)} (en {time_sig})")

    # Comparaison avec catalogue
    if match_song:
        official_bpm = match_song.get("bpm")
        official_sig = match_song.get("time_signature", "?")
        official_dur = match_song.get("duration", "?")
        print(f"{'─' * 60}")
        print(f"  📚 COMPARAISON CATALOGUE — {match_song.get('title')}")
        print(f"  BPM officiel    : {official_bpm}")
        print(f"  Signature       : {official_sig}")
        print(f"  Durée officielle: {official_dur}")
        if official_bpm:
            ratio = tempo_f / official_bpm
            if 0.95 < ratio < 1.05:
                print(f"  ✅ Match parfait (écart {abs(tempo_f - official_bpm):.1f} BPM)")
            elif 0.45 < ratio < 0.55:
                print(f"  ⚠️ Demi-tempo détecté (multiplier librosa par 2)")
            elif 1.45 < ratio < 1.55:
                print(f"  ⚠️ Double tempo détecté (diviser librosa par 2)")
            elif 0.62 < ratio < 0.72:
                print(f"  ⚠️ Compound time détecté (chanson en 6/8 lue comme 3/4)")
            else:
                print(f"  ⚠️ Écart {abs(tempo_f - official_bpm):.1f} BPM ({ratio:.2f}× du tempo officiel)")
    print(f"{'─' * 60}")

    # Sections
    if sections:
        print(f"\n📐 SECTIONS DÉTECTÉES (~ {len(sections)} blocs)")
        for i, t in enumerate(sections):
            duration_sec = (sections[i + 1] - t) if i + 1 < len(sections) else (duration - t)
            print(f"  [{i+1:2d}]  {fmt_time(t)}  →  durée ≈ {duration_sec:.1f}s")

    # Premiers beats
    print(f"\n🥁 PREMIERS BEATS (24 premiers, 🔵 = downbeat)")
    for i, t in enumerate(beats[:24]):
        marker = "🔵" if i % beats_per_bar == 0 else "  "
        beat_num = (i % beats_per_bar) + 1
        print(f"     {marker}  {fmt_time(t)}    beat {beat_num}/{beats_per_bar}")
    if len(beats) > 24:
        print(f"     …et {len(beats) - 24} autres beats jusqu'à {fmt_time(duration)}")

    # Downbeats
    print(f"\n📊 TOUS LES DOWNBEATS (= où placer tes figures)")
    for i, t in enumerate(downbeats):
        print(f"   Mesure #{i+1:3d}    {fmt_time(t)}")

    # JSON
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    json_path = OUT_DIR / f"{slugify(title)}.json"
    data = {
        "title": title,
        "audio_file": audio_path.name,
        "duration_sec": float(duration),
        "duration_formatted": fmt_time(duration),
        "bpm_detected": tempo_f,
        "bpm_hint": bpm_hint,
        "time_signature": time_sig,
        "n_beats": int(len(beats)),
        "n_downbeats": int(len(downbeats)),
        "beats": [float(b) for b in beats],
        "downbeats": [float(b) for b in downbeats],
        "sections": [float(s) for s in sections],
        "catalog_match": {
            "matched": True,
            "title": match_song.get("title"),
            "slug": match_song.get("slug"),
            "official_bpm": match_song.get("bpm"),
            "official_signature": match_song.get("time_signature"),
        } if match_song else None,
    }
    json_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n💾 Sauvegardé : {json_path.relative_to(ROOT)}")


# ----- Main -----

def main():
    parser = argparse.ArgumentParser(
        description="Analyse audio pour chorégraphie",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("source", help="URL YouTube ou chemin vers fichier audio")
    parser.add_argument("--time-sig", choices=["3/4", "4/4"], default="4/4",
                        help="Signature rythmique (défaut : 4/4)")
    parser.add_argument("--bpm-hint", type=float, default=None,
                        help="BPM attendu pour guider la détection librosa")
    parser.add_argument("--match", type=str, default=None,
                        help="Titre à chercher dans le catalogue pour comparaison")
    args = parser.parse_args()

    # Lookup catalogue avant de lancer
    match_song = None
    if args.match:
        match_song = find_in_catalog(args.match)
        if match_song:
            print(f"📚 Match catalogue : {match_song['title']} ({match_song['artist']})")
            if args.bpm_hint is None and match_song.get("bpm"):
                args.bpm_hint = float(match_song["bpm"])
                print(f"   → BPM hint auto = {args.bpm_hint}")
            if args.time_sig == "4/4" and match_song.get("time_signature") == "3/4":
                args.time_sig = "3/4"
                print(f"   → Signature auto = 3/4")
        else:
            print(f"⚠️  Aucun match dans le catalogue pour : {args.match}")

    if args.source.startswith("http"):
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)
            audio_path, title = download_youtube_audio(args.source, tmpdir_path)
            analyze(audio_path, title=title, time_sig=args.time_sig,
                    bpm_hint=args.bpm_hint, match_song=match_song)
    else:
        audio_path = Path(args.source).expanduser().resolve()
        if not audio_path.exists():
            print(f"❌ Fichier non trouvé : {audio_path}", file=sys.stderr)
            sys.exit(1)
        analyze(audio_path, time_sig=args.time_sig, bpm_hint=args.bpm_hint,
                match_song=match_song)


if __name__ == "__main__":
    main()
