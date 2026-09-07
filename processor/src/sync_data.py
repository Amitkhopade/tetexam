from __future__ import annotations

import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PUBLIC_DATA = ROOT / "frontend" / "public" / "data"
PUBLIC_ASSETS = ROOT / "frontend" / "public" / "assets"
BOOKLETS = ("H", "K", "L", "M", "N")


def normalize_asset_paths(obj):
    if isinstance(obj, dict):
        return {k: normalize_asset_paths(v) if k != "path" else str(v).replace("\\", "/").replace("data/assets/", "assets/") for k, v in obj.items()}
    if isinstance(obj, list):
        return [normalize_asset_paths(v) for v in obj]
    return obj


def main() -> None:
    if PUBLIC_DATA.exists(): shutil.rmtree(PUBLIC_DATA)
    PUBLIC_DATA.mkdir(parents=True, exist_ok=True)
    if PUBLIC_ASSETS.exists(): shutil.rmtree(PUBLIC_ASSETS)
    PUBLIC_ASSETS.mkdir(parents=True, exist_ok=True)

    catalog = {"schema_version":"1.1.0", "papers": []}
    for booklet in BOOKLETS:
        src = ROOT/"data"/"papers"/booklet/"questions.json"
        paper_src = ROOT/"data"/"papers"/booklet/"paper.json"
        ak_src = ROOT/"data"/"answer_keys"/booklet/"answer_key.json"
        paper = json.loads(paper_src.read_text(encoding="utf-8"))
        questions = normalize_asset_paths(json.loads(src.read_text(encoding="utf-8")))
        ak = json.loads(ak_src.read_text(encoding="utf-8"))
        out_dir = PUBLIC_DATA/booklet
        out_dir.mkdir(parents=True, exist_ok=True)
        (out_dir/"questions.json").write_text(json.dumps(questions,indent=2,ensure_ascii=False),encoding="utf-8")
        shutil.copy2(paper_src,out_dir/"paper.json")
        shutil.copy2(ak_src,out_dir/"answer_key.json")
        for fn in ("validation.json","metadata.json"):
            extra=ROOT/"data"/"papers"/booklet/fn
            if extra.exists(): shutil.copy2(extra,out_dir/fn)
        catalog["papers"].append({
            "paper_id": paper.get("paper_id",f"{paper.get('exam')}-PAPER-I-{booklet}"),
            "exam": paper.get("exam"), "session": paper.get("session"), "exam_date": paper.get("exam_date"),
            "title": paper.get("title"), "booklet_code": booklet, "question_count": paper.get("question_count"),
            "available_languages": paper.get("available_languages", sorted({q.get('language') for q in questions.get('questions',[]) if q.get('language')})),
            "questions": f"{booklet}/questions.json", "answer_key": f"{booklet}/answer_key.json",
            "paper": f"{booklet}/paper.json",
            "validation": f"{booklet}/validation.json" if (out_dir/"validation.json").exists() else None,
            "status": "review" if booklet == "H" else "published"
        })
    (PUBLIC_DATA/"catalog.json").write_text(json.dumps(catalog,indent=2,ensure_ascii=False),encoding="utf-8")

    assets_src=ROOT/"data"/"assets"
    if assets_src.exists():
        for p in assets_src.rglob("*"):
            if p.is_file():
                target=PUBLIC_ASSETS/p.relative_to(assets_src); target.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(p,target)
    print("Synced data and visual assets to frontend/public.")

if __name__ == "__main__": main()
