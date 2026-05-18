#!/usr/bin/env python3
"""Inject article:published_time, article:author, article:section meta tags
into each blog article, right after the og:site_name line."""

import re
from pathlib import Path

BLOG_DIR = Path(__file__).parent.parent / "blog"

ARTICLE_SECTION = "Conseils mariage"
ARTICLE_AUTHOR = "Ouverture de Bal"


def process(path):
    content = path.read_text(encoding="utf-8")

    # Skip if already has article:published_time
    if 'property="article:published_time"' in content:
        print(f"  · {path.name} : déjà fait")
        return

    # Extract datePublished from JSON-LD
    m = re.search(r'"datePublished":\s*"([^"]+)"', content)
    if not m:
        print(f"  ⚠ {path.name} : pas de datePublished trouvé")
        return
    date_published = m.group(1)

    # Try to also get dateModified
    mm = re.search(r'"dateModified":\s*"([^"]+)"', content)
    date_modified = mm.group(1) if mm else date_published

    inject = f'''  <meta property="article:published_time" content="{date_published}T08:00:00+02:00">
  <meta property="article:modified_time" content="{date_modified}T08:00:00+02:00">
  <meta property="article:author" content="{ARTICLE_AUTHOR}">
  <meta property="article:section" content="{ARTICLE_SECTION}">
'''

    # Insert after og:site_name line
    new_content = re.sub(
        r'(<meta property="og:site_name"[^>]*>\n)',
        r"\1" + inject,
        content,
        count=1,
    )

    if new_content == content:
        print(f"  ⚠ {path.name} : og:site_name introuvable")
        return

    path.write_text(new_content, encoding="utf-8")
    print(f"  ✓ {path.name}")


def main():
    for f in sorted(BLOG_DIR.glob("*.html")):
        process(f)


if __name__ == "__main__":
    main()
