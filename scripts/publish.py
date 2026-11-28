#!/usr/bin/env python3
"""Merge staging/*.json into signals.json. Refuses to shrink the live file.

Exit codes:
  0  signals.json was updated and should be committed
  2  nothing new; do not commit
  1  refused; do not commit
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIVE = ROOT / "signals.json"
STAGING = {
    "X": ROOT / "staging" / "x.json",
    "Reddit": ROOT / "staging" / "reddit.json",
    "LinkedIn": ROOT / "staging" / "linkedin.json",
}
CATEGORIES = {"Insight", "Best Practice", "Idea", "Feature Request", "Complaint"}
MIN_LIVE = 100


def source_from_url(url, fallback):
    u = (url or "").lower()
    if "reddit.com" in u:
        return "Reddit"
    if "linkedin.com" in u:
        return "LinkedIn"
    if "x.com/" in u or "twitter.com/" in u:
        return "X"
    return fallback or "X"


def load_array(path, required):
    if not path.exists():
        if required:
            raise SystemExit(f"refused: missing {path.name}")
        return []
    try:
        data = json.loads(path.read_text())
    except json.JSONDecodeError as exc:
        raise SystemExit(f"refused: {path} is not valid JSON ({exc})")
    if not isinstance(data, list):
        raise SystemExit(f"refused: {path} is not a JSON array")
    return data


def valid_new(item, source):
    if not isinstance(item, dict):
        return None
    url = str(item.get("url") or "").strip()
    title = str(item.get("title") or "").strip()
    excerpt = str(item.get("excerpt") or "").strip()
    category = item.get("category")
    if not url or not title or not excerpt or category not in CATEGORIES:
        return None
    tags = item.get("tags") if isinstance(item.get("tags"), list) else []
    try:
        engagement = int(item.get("engagement") or 0)
    except (TypeError, ValueError):
        engagement = 0
    return {
        "id": str(item.get("id") or url),
        "source": source_from_url(url, source),
        "category": category,
        "title": title,
        "excerpt": excerpt,
        "author": str(item.get("author") or ""),
        "date": str(item.get("date") or ""),
        "url": url,
        "engagement": engagement,
        "tags": [str(t) for t in tags][:8],
    }


def main():
    live = load_array(LIVE, required=True)
    if len(live) < MIN_LIVE:
        raise SystemExit(f"refused: live file has {len(live)} items, under {MIN_LIVE}")

    seen = set()
    for item in live:
        if isinstance(item, dict) and item.get("url"):
            seen.add(item["url"])
        if isinstance(item, dict) and not item.get("source"):
            item["source"] = source_from_url(item.get("url"), "X")

    added = {"X": 0, "Reddit": 0, "LinkedIn": 0}
    for source, path in STAGING.items():
        batch = load_array(path, required=False)
        for raw in batch:
            item = valid_new(raw, source)
            if not item or item["url"] in seen:
                continue
            live.append(item)
            seen.add(item["url"])
            added[item["source"]] = added.get(item["source"], 0) + 1

    new_count = len(live)
    old_count = new_count - sum(added.values())
    if new_count < old_count:
        raise SystemExit("refused: new count would be lower than old count")
    if sum(added.values()) == 0:
        print(f"no change old={old_count} new={new_count}")
        return 2

    live.sort(key=lambda s: str(s.get("date") or ""), reverse=True)
    LIVE.write_text(json.dumps(live, indent=2, ensure_ascii=False) + "\n")
    check = json.loads(LIVE.read_text())
    if not isinstance(check, list) or len(check) < old_count:
        raise SystemExit("refused: written file failed the recount")
    print(
        f"added old={old_count} new={len(check)} "
        f"X={added['X']} Reddit={added['Reddit']} LinkedIn={added['LinkedIn']}"
    )
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except SystemExit as exc:
        if isinstance(exc.code, str):
            print(exc.code, file=sys.stderr)
            sys.exit(1)
        raise
