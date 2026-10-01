import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
NOVELS_FILE = DATA_DIR / "novels.json"

CHAPTER_PATTERN = re.compile(r"^(\\d+)\\.md$", re.IGNORECASE)
TITLE_PATTERN = re.compile(
    r"^.*?第\\s*[0-9零一二三四五六七八九十百千]+\\s*章\\s*[:：、.\\-–—]?\\s*(.*)$"
)

def git_date(path: Path) -> str | None:
    relative = path.relative_to(ROOT).as_posix()
    try:
        value = subprocess.check_output(
            ["git", "log", "-1", "--format=%cI", "--", relative],
            cwd=ROOT,
            text=True,
        ).strip()
        return value or None
    except (subprocess.CalledProcessError, OSError):
        return None

def chapter_title(path: Path) -> str:
    try:
        text = path.read_text(encoding="utf-8-sig")
    except UnicodeDecodeError:
        text = path.read_text(encoding="utf-8", errors="replace")

    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue

        heading = re.sub(r"^#{1,6}\\s+", "", line).strip()
        match = TITLE_PATTERN.match(heading)
        if match and match.group(1).strip():
            return match.group(1).strip()

        if heading.startswith("第") and "章" in heading:
            tail = heading.split("章", 1)[1].strip(" ：:、.-–—")
            if tail:
                return tail

        return heading

    return ""

def update_novel(existing: dict, folder: Path) -> dict:
    chapters = []
    for path in folder.glob("*.md"):
        match = CHAPTER_PATTERN.match(path.name)
        if match:
            chapters.append((int(match.group(1)), path))

    chapters.sort(key=lambda item: item[0])

    result = dict(existing)
    result["chapterCount"] = len(chapters)

    if chapters:
        number, latest_path = chapters[-1]
        result["latestChapter"] = {
            "chapter": number,
            "title": chapter_title(latest_path) or f"第{number}章",
        }

        updated = git_date(latest_path)
        if updated:
            result["updateTime"] = updated

    return result

if NOVELS_FILE.exists():
    novels = json.loads(NOVELS_FILE.read_text(encoding="utf-8"))
else:
    novels = []

if not isinstance(novels, list):
    raise ValueError("data/novels.json 必須是 JSON array")

by_title = {item.get("title"): item for item in novels if item.get("title")}

for folder in sorted(DATA_DIR.iterdir()):
    if not folder.is_dir() or folder.name.startswith("."):
        continue

    md_files = list(folder.glob("*.md"))
    if not md_files:
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

    update_novel(existing, folder)

novels.sort(key=lambda item: item.get("title", ""))

NOVELS_FILE.write_text(
    json.dumps(novels, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)
