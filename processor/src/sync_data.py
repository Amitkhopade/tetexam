from __future__ import annotations
import json, shutil
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
PUBLIC_DATA = ROOT / "frontend" / "public" / "data"
PUBLIC_ASSETS = ROOT / "frontend" / "public" / "assets"

def normalize_asset_paths(obj):
    if isinstance(obj, dict):
        out={}
        for k,v in obj.items():
            out[k] = str(v).replace("\\", "/").replace("data/assets/", "assets/") if k == "path" else normalize_asset_paths(v)
        return out
    if isinstance(obj, list): return [normalize_asset_paths(v) for v in obj]
    return obj

def main():
    if PUBLIC_DATA.exists(): shutil.rmtree(PUBLIC_DATA)
    PUBLIC_DATA.mkdir(parents=True, exist_ok=True)
    if PUBLIC_ASSETS.exists(): shutil.rmtree(PUBLIC_ASSETS)
    PUBLIC_ASSETS.mkdir(parents=True, exist_ok=True)
    catalog={"schema_version":"2.0.0","papers":[]}
    papers_root=ROOT/"data"/"papers"
    for paper_dir in sorted([p for p in papers_root.iterdir() if p.is_dir()]):
        b=paper_dir.name
        qsrc=paper_dir/"questions.json"; psrc=paper_dir/"paper.json"; aksrc=ROOT/"data"/"answer_keys"/b/"answer_key.json"
        if not (qsrc.exists() and psrc.exists() and aksrc.exists()): continue
        paper=json.loads(psrc.read_text(encoding="utf-8")); questions=normalize_asset_paths(json.loads(qsrc.read_text(encoding="utf-8")))
        ak=json.loads(aksrc.read_text(encoding="utf-8")); out=PUBLIC_DATA/b; out.mkdir(parents=True,exist_ok=True)
        (out/"questions.json").write_text(json.dumps(questions,indent=2,ensure_ascii=False),encoding="utf-8")
        shutil.copy2(psrc,out/"paper.json"); shutil.copy2(aksrc,out/"answer_key.json")
        for fn in ("validation.json","metadata.json"):
            extra=paper_dir/fn
            if extra.exists(): shutil.copy2(extra,out/fn)
        vals=json.loads((out/"validation.json").read_text(encoding="utf-8")) if (out/"validation.json").exists() else {}
        catalog["papers"].append({
            "paper_id":paper.get("paper_id",f"{paper.get('exam')}-PAPER-I-{b}"),"exam":paper.get("exam"),"session":paper.get("session"),"exam_date":paper.get("exam_date"),
            "title":paper.get("title"),"booklet_code":b,"question_count":paper.get("question_count",150),"duration_minutes":paper.get("duration_minutes",150),
            "available_languages":paper.get("available_languages",sorted({q.get("language") for q in questions.get("questions",[]) if q.get("language")})),
            "questions":f"{b}/questions.json","answer_key":f"{b}/answer_key.json","paper":f"{b}/paper.json","validation":f"{b}/validation.json" if (out/"validation.json").exists() else None,
            "status":"published" if vals.get("validation_status")=="PASS" else "review"
        })
    (PUBLIC_DATA/"catalog.json").write_text(json.dumps(catalog,indent=2,ensure_ascii=False),encoding="utf-8")
    assets_src=ROOT/"data"/"assets"
    if assets_src.exists():
        for p in assets_src.rglob("*"):
            if p.is_file():
                target=PUBLIC_ASSETS/p.relative_to(assets_src); target.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(p,target)
    print("Synced dynamic paper catalog and data.")
if __name__ == "__main__": main()
