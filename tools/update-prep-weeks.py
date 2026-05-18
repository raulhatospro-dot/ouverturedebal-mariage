#!/usr/bin/env python3
"""Met à jour preparation_weeks par niveau + remplace les mentions texte."""

import json
import re
from pathlib import Path

DATA = Path(__file__).parent / "data" / "choregraphies-data.json"

LEVEL_TO_RANGE = {
    "débutant": "4 à 5",
    "débutant à intermédiaire": "4 à 6",
    "intermédiaire": "5 à 6",
    "intermédiaire à avancé": "5 à 6",
    "avancé": "5 à 6",
}

data = json.loads(DATA.read_text(encoding="utf-8"))

for song in data["songs"]:
    new_range = LEVEL_TO_RANGE.get(song["level"], "4 à 6")
    old_range = song["preparation_weeks"]
    song["preparation_weeks"] = new_range

    # Replace all mentions of ANY range "X à Y semaines" with the new range
    pattern_weeks = re.compile(r"\d+\s*à\s*\d+\s*semaines")
    replacement_weeks = f"{new_range} semaines"

    pattern_weeks_phrase = re.compile(r"\d+\s*à\s*\d+\s*sem\.")
    replacement_phrase = f"{new_range} sem."

    def update_str(s):
        if not isinstance(s, str):
            return s
        s = pattern_weeks.sub(replacement_weeks, s)
        s = pattern_weeks_phrase.sub(replacement_phrase, s)
        return s

    def walk(obj):
        if isinstance(obj, str):
            return update_str(obj)
        if isinstance(obj, list):
            return [walk(x) for x in obj]
        if isinstance(obj, dict):
            return {k: walk(v) for k, v in obj.items()}
        return obj

    # Apply to all text fields except preparation_weeks itself (already set)
    for key in list(song.keys()):
        if key == "preparation_weeks":
            continue
        song[key] = walk(song[key])

    print(f"  {song['slug']:50s} {old_range:8s} → {new_range}")

DATA.write_text(
    json.dumps(data, ensure_ascii=False, indent=2),
    encoding="utf-8",
)
print("\nJSON mis à jour.")
