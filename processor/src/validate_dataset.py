from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BOOKLETS = ("H", "K", "L", "M", "N")


def validate_paper(path: Path, booklet: str) -> list[str]:
    issues: list[str] = []
    data = json.loads(path.read_text(encoding="utf-8"))
    questions = data.get("questions", [])
    expected = 150 if booklet == "H" else 300
    if len(questions) != expected:
        issues.append(f"{path}: expected {expected} language records, found {len(questions)}")
    seen = set()
    expected_languages = {"en"} if booklet == "H" else {"en", "hi"}
    for q in questions:
        key = (q.get("question_number"), q.get("language"))
        if key in seen:
            issues.append(f"{path}: duplicate record {key}")
        seen.add(key)
        if q.get("language") not in {"en", "hi"}:
            issues.append(f"{path}: unsupported language {q.get('language')}")
        if not q.get("question_text", "").strip():
            issues.append(f"{path}: empty question text {q.get('id')}")
        opts = q.get("options", {})
        if len(opts) != 4 and not q.get("source", {}).get("visual_fallback"):
            issues.append(f"{path}: malformed options {q.get('id')}")
    # H intentionally publishes the English reconstruction only because the source uses legacy Hindi encoding.
    if booklet == "H" and {x.get("language") for x in questions} != {"en"}:
        issues.append(f"{path}: H must contain English-only records")
    return issues


def validate_answer_key(path: Path, booklet: str) -> list[str]:
    if not path.exists():
        return [f"{path}: answer key missing"]
    issues=[]
    data=json.loads(path.read_text(encoding="utf-8"))
    main=data.get("answers", {})
    if booklet == "H":
        if len(main) != 90:
            issues.append(f"{path}: expected 90 main answers, found {len(main)}")
        allowed=set(main.values())
        if not allowed.issubset({"1","2","3","4","Z"}):
            issues.append(f"{path}: invalid H answer value detected")
        return issues
    if booklet in {"M", "N"}:
        if len(main) != 90:
            issues.append(f"{path}: expected 90 main answers, found {len(main)}")
        variants=data.get("language_variants", {})
        for lang in ("en","hi"):
            if len(variants.get(lang,{})) != 60:
                issues.append(f"{path}: expected 60 {lang} variant answers, found {len(variants.get(lang,{}))}")
        allowed=set(main.values()) | {v for x in variants.values() for v in x.values()}
        if not allowed.issubset({"1","2","3","4","Z"}):
            issues.append(f"{path}: invalid answer value detected")
    return issues


def main() -> None:
    issues=[]
    for booklet in BOOKLETS:
        issues.extend(validate_paper(ROOT/"data"/"papers"/booklet/"questions.json", booklet))
        issues.extend(validate_answer_key(ROOT/"data"/"answer_keys"/booklet/"answer_key.json", booklet))
    if issues:
        print("DATASET VALIDATION FAILED")
        for issue in issues:
            print("-", issue)
        raise SystemExit(1)
    print("DATASET VALIDATION PASS")

if __name__ == "__main__":
    main()
