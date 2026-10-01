import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
NOVELS_FILE = DATA_DIR / "novels.json"

CHAPTER_PATTERN = re.compile(r"^(\d+)\.md$", re.IGNORECASE)
TITLE_PATTERN = re.compile(r"^第\s*[0-9零一二三四五六七八九十百千]+\s*章\s+(.+?)\s*$")


def git_date(path: Path) -> str | None:
    relative = path.relative_to(ROOT).as_posix()
    try:
        value = subprocess.check_output(["git","log","-1","--format=%cI","--",relative], cwd=ROOT, text=True).strip()
        return value or None
    except (subprocess.CalledProcessError, OSError):
        return None


def chapter_title(path: Path, number: int) -> str:
    try:
        text = path.read_text(encoding="utf-8-sig")
    except UnicodeDecodeError:
        text = path.read_text(encoding="utf-8", errors="replace")

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        line = re.sub(r"^#{1,6}\s+", "", line).strip()
        match = TITLE_PATTERN.match(line)
        if match:
            return match.group(1).strip()
        return line

    return f"第{number}章"


def merge_duplicates(novels: list[dict]) -> list[dict]:
    merged: dict[str, dict] = {}
    for novel in novels:
        title = novel.get("title")
        if not title:
            continue
        if title not in merged:
            merged[title] = novel.copy()
            continue
        current = merged[title]
        for key, value in novel.items():
            if key in {"chapterCount","latestChapter","chapters","updateTime"}:
                continue
            if not current.get(key) and value:
                current[key] = value
    return list(merged.values())


def update_novel(existing: dict, folder: Path) -> dict:
    chapter_files = []
    for path in folder.glob("*.md"):
        match = CHAPTER_PATTERN.match(path.name)
        if match:
            chapter_files.append((int(match.group(1)), path))

    chapter_files.sort(key=lambda item: item[0])
    existing["chapterCount"] = len(chapter_files)
    existing["chapters"] = [
        {"chapter": number, "title": chapter_title(path, number)}
        for number, path in chapter_files
    ]

    if chapter_files:
        number, latest_path = chapter_files[-1]
        existing["latestChapter"] = {"chapter": number, "title": chapter_title(latest_path, number)}
        updated = git_date(latest_path)
        if updated:
            existing["updateTime"] = updated

    return existing


if NOVELS_FILE.exists():
    novels = json.loads(NOVELS_FILE.read_text(encoding="utf-8"))
else:
    novels = []

if not isinstance(novels, list):
    raise ValueError("data/novels.json 必須是 JSON array")

novels = merge_duplicates(novels)
by_title = {item.get("title"): item for item in novels if item.get("title")}

for folder in sorted(DATA_DIR.iterdir()):
    if not folder.is_dir() or folder.name.startswith("."):
        continue
    if not any(CHAPTER_PATTERN.match(path.name) for path in folder.glob("*.md")):
        continue

    existing = by_title.get(folder.name)
    if existing is None:
        existing = {
            "id": folder.name,
            "title": folder.name,
            "author": "",
            "status": "ongoing",
            "description": "",
            "cover": "",
        }
        novels.append(existing)
        by_title[folder.name] = existing

    update_novel(existing, folder)

novels.sort(key=lambda item: item.get("title", ""))
NOVELS_FILE.write_text(json.dumps(novels, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
