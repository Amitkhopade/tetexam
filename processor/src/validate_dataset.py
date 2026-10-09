from __future__ import annotations
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]

def validate_paper(path:Path, booklet:str):
    issues=[]; data=json.loads(path.read_text(encoding="utf-8")); qs=data.get("questions",[]); expected=150 if booklet=="H" else 300
    if len(qs)!=expected: issues.append(f"{path}: expected {expected} records, found {len(qs)}")
    seen=set(); expected_langs={"en"} if booklet=="H" else {"en","hi"}; actual_langs=set(); nums_by_lang={}
    for q in qs:
        qn=q.get("question_number"); lang=q.get("language"); actual_langs.add(lang); nums_by_lang.setdefault(lang,set()).add(qn); key=(qn,lang)
        if key in seen: issues.append(f"{path}: duplicate record {key}")
        seen.add(key)
        if lang not in expected_langs: issues.append(f"{path}: unsupported language {lang}")
        if not str(q.get("question_text","")).strip(): issues.append(f"{path}: empty question {q.get('id')}")
        if len(q.get("options",{}))<4 and not q.get("source",{}).get("visual_fallback"): issues.append(f"{path}: incomplete options {q.get('id')}")
    for lang in expected_langs:
        if nums_by_lang.get(lang,set()) != set(range(1,151)): issues.append(f"{path}: {lang} questions must cover 1-150")
    if actual_langs != expected_langs: issues.append(f"{path}: expected languages {sorted(expected_langs)}, found {sorted(actual_langs)}")
    return issues

def validate_answer_key(path:Path, booklet:str):
    issues=[]; data=json.loads(path.read_text(encoding="utf-8")); answers=data.get("answers",{}); allowed={"1","2","3","4","Z"}
    missing=[str(i) for i in range(1,151) if str(i) not in answers]
    if missing: issues.append(f"{path}: missing default answers {missing[:10]}")
    if not set(map(str,answers.values())).issubset(allowed): issues.append(f"{path}: invalid default answer value")
    variants=data.get("language_variants",{})
    for lang in (["en","hi"] if booklet!="H" else ["en"]):
        miss=[str(i) for i in range(91,151) if str(i) not in variants.get(lang,{})]
        if miss: issues.append(f"{path}: missing {lang} variant answers {miss[:10]}")
        if not set(map(str,variants.get(lang,{}).values())).issubset(allowed): issues.append(f"{path}: invalid {lang} variant value")
    inferred=data.get("inferred_answers",{}) or {}
    if booklet == "H":
        expected_inferred={str(i) for i in range(91,151)}
        if set(inferred) != expected_inferred:
            issues.append(f"{path}: H must mark exactly Q91-Q150 as inferred because the supplied H key covers Q1-Q90 only")
        for qn, detail in inferred.items():
            if detail.get("provenance") != "inferred": issues.append(f"{path}: H Q{qn} must be labelled inferred")
            if str(detail.get("answer", "")) not in allowed: issues.append(f"{path}: H Q{qn} inferred default answer is invalid")
            variants_detail=detail.get("language_variants", {})
            for lang in ("en", "hi"):
                if str(variants_detail.get(lang, "")) not in allowed:
                    issues.append(f"{path}: H Q{qn} inferred {lang} answer is invalid or missing")
    elif inferred:
        issues.append(f"{path}: unexpected inferred answers for booklet {booklet}")
    return issues

def main():
    issues=[]; papers=ROOT/"data"/"papers"
    for p in sorted([p for p in papers.iterdir() if p.is_dir()]):
        q=p/"questions.json"; ak=ROOT/"data"/"answer_keys"/p.name/"answer_key.json"
        if q.exists() and ak.exists(): issues+=validate_paper(q,p.name)+validate_answer_key(ak,p.name)
    if issues:
        print("DATASET VALIDATION FAILED"); [print("-",x) for x in issues]; raise SystemExit(1)
    print("DATASET VALIDATION PASS")
if __name__=="__main__": main()
