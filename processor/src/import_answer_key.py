from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path
from typing import Iterable

import openpyxl
import fitz

Q_ALIASES = {"q", "question", "questionno", "questionnumber", "qno", "srno", "number", "क्रमांक", "प्रश्न"}
A_ALIASES = {"answer", "correctanswer", "correctoption", "key", "option", "ans", "उत्तर"}


def canon(s: object) -> str:
    return re.sub(r"[^a-z0-9\u0900-\u097f]", "", str(s or "").strip().lower())


def norm_answer(value: object) -> str | None:
    if value is None:
        return None
    s = str(value).strip().upper().strip("()[]{}.")
    mapping = {"A": "1", "B": "2", "C": "3", "D": "4"}
    if s in mapping:
        return mapping[s]
    if s in {"1", "2", "3", "4"}:
        return s
    return None


def extract_rows_from_grid(rows: Iterable[Iterable[object]]) -> dict[str, str]:
    rows = list(rows)
    if not rows:
        return {}
    headers = [canon(x) for x in rows[0]]
    q_idx = next((i for i, h in enumerate(headers) if h in Q_ALIASES or "question" in h or h.endswith("qno")), None)
    a_idx = next((i for i, h in enumerate(headers) if h in A_ALIASES or "answer" in h or h == "key"), None)
    if q_idx is None or a_idx is None:
        raise ValueError("Could not identify Question and Answer columns in the answer key")
    answers: dict[str, str] = {}
    for row in rows[1:]:
        if max(q_idx, a_idx) >= len(row):
            continue
        q_raw = str(row[q_idx]).strip() if row[q_idx] is not None else ""
        m = re.search(r"\d{1,3}", q_raw)
        if not m:
            continue
        a = norm_answer(row[a_idx])
        if not a:
            continue
        qn = m.group(0)
        if qn in answers and answers[qn] != a:
            raise ValueError(f"Conflicting answer key entries for Q{qn}: {answers[qn]} vs {a}")
        answers[qn] = a
    return answers


def import_csv(path: Path) -> dict[str, str]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return extract_rows_from_grid(list(csv.reader(f)))


def import_xlsx(path: Path) -> dict[str, str]:
    wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
    for ws in wb.worksheets:
        rows = list(ws.iter_rows(values_only=True))
        try:
            answers = extract_rows_from_grid(rows)
            if answers:
                return answers
        except ValueError:
            continue
    raise ValueError("No answer-key worksheet with recognizable Question/Answer columns was found")


def import_pdf(path: Path) -> dict[str, str]:
    # Generic PDF fallback for simple answer-key tables. For image-only PDFs, run OCR separately.
    text = "\n".join(page.get_text("text") for page in fitz.open(path))
    answers: dict[str, str] = {}
    # Accept formats such as: 1  A, 1. A, Q1 B, 1 (3)
    for line in text.splitlines():
        m = re.search(r"(?:Q\.?\s*)?(\d{1,3})\s*[,.:;\-]?\s*[\(\[]?\s*([1-4A-D])[\)\]]?\b", line, re.I)
        if m:
            a = norm_answer(m.group(2))
            if a:
                answers[m.group(1)] = a
    if not answers:
        raise ValueError("No answer-key pairs were detected in the PDF text layer")
    return answers


def main() -> None:
    ap = argparse.ArgumentParser(description="Import answer keys from CSV/XLSX/PDF to JSON")
    ap.add_argument("input")
    ap.add_argument("--booklet", required=True)
    ap.add_argument("--exam", default="ACF-26-I")
    ap.add_argument("--output", required=True)
    args = ap.parse_args()
    path = Path(args.input)
    if path.suffix.lower() == ".csv":
        answers = import_csv(path)
    elif path.suffix.lower() in {".xlsx", ".xlsm"}:
        answers = import_xlsx(path)
    elif path.suffix.lower() == ".pdf":
        answers = import_pdf(path)
    else:
        raise SystemExit("Supported input types: .csv, .xlsx, .xlsm, .pdf")
    result = {
        "schema_version": "1.0.0",
        "exam": args.exam,
        "booklet_code": args.booklet,
        "source_file": path.name,
        "answers": {str(k): v for k, v in sorted(answers.items(), key=lambda x: int(x[0]))},
        "count": len(answers),
        "status": "verified" if len(answers) >= 150 else "incomplete",
    }
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({"count": len(answers), "status": result["status"]}, indent=2))


if __name__ == "__main__":
    main()
