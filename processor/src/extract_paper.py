from __future__ import annotations

import argparse
import json
import os
import re
from dataclasses import dataclass, asdict, field
from pathlib import Path
from typing import Iterable, Optional

import fitz  # PyMuPDF

QUESTION_START_RE = re.compile(r"^\s*(\d{1,3})\.\s*(.*)$")
OPTION_RE = re.compile(r"\(\s*([1-4])\s*\)\s*")
OPTION_DOT_RE = re.compile(r"(?<!\w)([1-4])\.\s+")
PART_RE = re.compile(r"PART\s+([IVX]+)", re.I)
LANGUAGE_RE = re.compile(r"\b(ENGLISH|HINDI)\b", re.I)
RANGE_RE = re.compile(r"Q\.\s*Nos?\.?\s*(\d{1,3})\s*(?:to|–|-|—)\s*(\d{1,3})|प्र\.?\s*सं\.?[^0-9]{0,20}(\d{1,3})[^0-9]{0,20}(?:से|-|–|—)[^0-9]{0,20}(\d{1,3})", re.I)

PARTS = {
    "I": (1, 30, "Child Development and Pedagogy"),
    "II": (31, 60, "Mathematics"),
    "III": (61, 90, "Environmental Studies"),
    "IV": (91, 120, "Language I"),
    "V": (121, 150, "Language II"),
}

@dataclass
class Line:
    text: str
    x0: float
    y0: float
    x1: float
    y1: float
    page: int

    @property
    def bbox(self) -> list[float]:
        return [round(self.x0, 2), round(self.y0, 2), round(self.x1, 2), round(self.y1, 2)]

@dataclass
class ContextGroup:
    start: int
    end: int
    text: str
    page_start: int
    page_end: int
    kind: str = "passage"

@dataclass
class Question:
    id: str
    exam: str
    booklet_code: str
    question_number: int
    part: str
    part_name: str
    language: str
    question_text: str
    options: dict[str, str]
    context_text: str | None = None
    source: dict = field(default_factory=dict)
    extraction: dict = field(default_factory=dict)


def clean_text(text: str) -> str:
    text = text.replace("\u00a0", " ")
    text = text.replace("\u200b", "")
    return re.sub(r"\s+", " ", text).strip()

def join_lines(lines: Iterable[str]) -> str:
    vals = [clean_text(x) for x in lines if clean_text(x)]
    # Preserve paragraph-ish separation without creating giant whitespace.
    return " ".join(vals)


def normalize_option_label(raw: str) -> str:
    return raw.strip()


def detect_question_starts(lines: list[Line]) -> list[int]:
    starts: list[int] = []
    for i, line in enumerate(lines):
        if QUESTION_START_RE.match(line.text) and int(QUESTION_START_RE.match(line.text).group(1)) <= 150:
            starts.append(i)
    return starts


def vertical_overlap(a: Line, b: Line) -> float:
    top = max(a.y0, b.y0)
    bottom = min(a.y1, b.y1)
    overlap = max(0.0, bottom - top)
    return overlap / max(1.0, min(a.y1 - a.y0, b.y1 - b.y0))


def merge_visual_lines(lines: list[Line]) -> list[Line]:
    # PDF text extraction can place a question number in a separate span/line from its text
    # even though they share the same visual baseline. Merge only close, vertically-overlapping
    # fragments; larger horizontal gaps remain separate columns/cells.
    lines = sorted(lines, key=lambda l: (l.y0, l.x0))
    used = [False] * len(lines)
    out: list[Line] = []
    for i, base in enumerate(lines):
        if used[i]:
            continue
        group = [base]
        used[i] = True
        changed = True
        while changed:
            changed = False
            gx0 = min(g.x0 for g in group)
            gx1 = max(g.x1 for g in group)
            gy0 = min(g.y0 for g in group)
            gy1 = max(g.y1 for g in group)
            for j, cand in enumerate(lines):
                if used[j]:
                    continue
                vo = vertical_overlap(group[-1], cand)
                gap = max(cand.x0 - gx1, gx0 - cand.x1, 0.0)
                numeric_fragment = bool(re.fullmatch(r"\s*\d{1,3}\.\s*", cand.text)) or bool(re.fullmatch(r"\s*\d{1,3}\.\s*", group[-1].text))
                if vo >= 0.45 and (gap <= 28 or numeric_fragment):
                    group.append(cand)
                    used[j] = True
                    changed = True
                    gx0 = min(g.x0 for g in group)
                    gx1 = max(g.x1 for g in group)
        group.sort(key=lambda l: l.x0)
        text = " ".join(g.text.strip() for g in group if g.text.strip())
        out.append(Line(text, min(g.x0 for g in group), min(g.y0 for g in group), max(g.x1 for g in group), max(g.y1 for g in group), base.page))
    # Cluster rows so small baseline jitter (e.g. option (3)/(4)) is read left-to-right.
    out.sort(key=lambda l: (l.y0, l.x0))
    row_buckets: list[list[Line]] = []
    for line in out:
        placed = False
        for row in reversed(row_buckets[-4:]):
            row_y = sum(x.y0 for x in row) / len(row)
            if abs(line.y0 - row_y) <= 3.5:
                row.append(line)
                placed = True
                break
        if not placed:
            row_buckets.append([line])
    final = []
    for row in row_buckets:
        final.extend(sorted(row, key=lambda l: l.x0))
    return final


def split_inline_question_markers(lines: list[Line]) -> list[Line]:
    # Some PDF text blocks collapse the next question onto the previous line. Only split
    # an inline marker when it follows a plausible sequential question number; this prevents
    # numeric prose such as "50. Surbhi" from being mistaken for Q50.
    marker = re.compile(r"(?<![\w)])(\d{1,3})\.\s+")
    out: list[Line] = []
    last_q: int | None = None
    for line in lines:
        matches = [m for m in marker.finditer(line.text) if 1 <= int(m.group(1)) <= 150]
        if not matches:
            out.append(line)
            continue
        accepted: list[re.Match] = []
        for m in matches:
            n = int(m.group(1))
            at_start = m.start() == 0
            if at_start:
                accepted.append(m)
                last_q = n
            elif last_q is not None and n == last_q + 1:
                accepted.append(m)
                last_q = n
            elif not out and not accepted:
                # A first question marker that happens to occur after a short extraction prefix.
                accepted.append(m)
                last_q = n
        if not accepted:
            out.append(line)
            continue
        # Preserve any non-question prefix before first accepted marker.
        prefix = line.text[:accepted[0].start()].strip()
        if prefix:
            out.append(Line(prefix, line.x0, line.y0, line.x1, line.y1, line.page))
        for idx, m in enumerate(accepted):
            end_pos = accepted[idx + 1].start() if idx + 1 < len(accepted) else len(line.text)
            chunk = line.text[m.start():end_pos].strip()
            if chunk:
                out.append(Line(chunk, line.x0, line.y0, line.x1, line.y1, line.page))
    out.sort(key=lambda l: (round(l.y0, 1), round(l.x0, 1)))
    return out


def page_lines(page: fitz.Page, page_no: int, ocr_fallback: bool = False) -> list[Line]:
    # Native extraction first. These papers are text PDFs and PyMuPDF preserves word placement.
    d = page.get_text("dict")
    result: list[Line] = []
    for block in d.get("blocks", []):
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            text = "".join(span.get("text", "") for span in line.get("spans", []))
            if not text.strip():
                continue
            x0, y0, x1, y1 = line["bbox"]
            result.append(Line(text=text, x0=x0, y0=y0, x1=x1, y1=y1, page=page_no))
    result = merge_visual_lines(result)
    result = split_inline_question_markers(result)
    if result or not ocr_fallback:
        return result

    # OCR fallback for image-only pages. Requires pytesseract + local tesseract.
    import pytesseract
    from PIL import Image
    cmd = os.getenv("TESSERACT_CMD")
    if cmd:
        pytesseract.pytesseract.tesseract_cmd = cmd
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    try:
        data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT, lang="eng+hin")
    except pytesseract.TesseractError:
        data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT, lang="eng")
    lines_by_key: dict[tuple[int, int, int], list[tuple[str, int, int, int, int]]] = {}
    n = len(data["text"])
    for i in range(n):
        txt = data["text"][i].strip()
        if not txt:
            continue
        key = (data["block_num"][i], data["par_num"][i], data["line_num"][i])
        lines_by_key.setdefault(key, []).append((txt, data["left"][i], data["top"][i], data["width"][i], data["height"][i]))
    scale = 2.0
    for words in lines_by_key.values():
        words.sort(key=lambda w: w[1])
        txt = " ".join(w[0] for w in words)
        x0 = min(w[1] for w in words) / scale
        y0 = min(w[2] for w in words) / scale
        x1 = max(w[1] + w[3] for w in words) / scale
        y1 = max(w[2] + w[4] for w in words) / scale
        result.append(Line(txt, x0, y0, x1, y1, page_no))
    result = merge_visual_lines(result)
    return split_inline_question_markers(result)


def detect_language(lines: list[Line], question_number: int, current_language: str | None) -> str:
    # Part IV/V section headers carry the authoritative language state.
    blob = " ".join(l.text for l in lines[:30]).upper()
    if question_number >= 91:
        if "LANGUAGE I" in blob or "LANGUAGE II" in blob or "ENGLISH" in blob or "HINDI" in blob or "हिंदी" in blob:
            if "HINDI" in blob or "हिंदी" in blob:
                return "hi"
            if "ENGLISH" in blob:
                return "en"
        return current_language or "en"
    return "bilingual"


def detect_part(question_number: int) -> tuple[str, str]:
    for code, (start, end, name) in PARTS.items():
        if start <= question_number <= end:
            return code, name
    return "?", "Unknown"


def strip_direction_tail(text: str) -> str:
    text = clean_text(text)
    patterns = [
        r"^selecting the correct/most appropriate options\.?\s*",
        r"^selecting the correct/most appropriate option\.?\s*",
        r"^सही/सबसे उपयुक्त उत्तर वाले विकल्प को चुनिए\.?\s*",
        r"^सही /सबसे उचित विकल्प चुनिए\.?\s*",
    ]
    for pattern in patterns:
        text = re.sub(pattern, "", text, flags=re.I)
    return text.strip()


def extract_context_declarations(lines: list[Line]) -> list[ContextGroup]:
    groups: list[ContextGroup] = []
    qidx = detect_question_starts(lines)
    for i, line in enumerate(lines):
        # Context declarations are authoritative when they occur on a Directions/निर्देश line.
        matches = list(RANGE_RE.finditer(line.text))
        if not matches:
            continue
        if "Directions" not in line.text and "निर्देश" not in line.text:
            continue
        m = matches[-1]
        match_groups = [g for g in m.groups() if g is not None]
        if len(match_groups) < 2:
            continue
        start_q, end_q = int(match_groups[0]), int(match_groups[1])
        next_q = next((idx for idx in qidx if idx > i), len(lines))
        content = [l.text for l in lines[i + 1:next_q]
                   if "ACF-26-I/" not in l.text and not re.fullmatch(r"\(\s*\d+\s*\)", l.text.strip())]
        text = strip_direction_tail(join_lines(content))
        if text:
            groups.append(ContextGroup(start_q, end_q, text, line.page, lines[next_q].page if next_q < len(lines) else line.page))
    return groups


def ordered_option_segments(text: str) -> tuple[str, list[tuple[str, str]]]:
    matches = list(OPTION_RE.finditer(text))
    marker_type = "paren"
    if len(matches) < 4:
        matches = list(OPTION_DOT_RE.finditer(text))
        marker_type = "dot"
    if len(matches) < 4:
        return clean_text(text), []
    question_text = clean_text(text[:matches[0].start()])
    segments: list[tuple[str, str]] = []
    for idx, m in enumerate(matches):
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
        segments.append((m.group(1), clean_text(text[m.end():end])))
    return question_text, segments


def split_options(text: str) -> tuple[str, dict[str, str]]:
    qtext, segments = ordered_option_segments(text)
    return qtext, {label: payload for label, payload in segments}


def parse_question_text(raw: str, qnum: int, language_mode: str) -> tuple[dict, float, list[str]]:
    raw = raw.replace("\u00a0", " ").replace("\u200b", "")
    qtext, ordered = ordered_option_segments(raw)
    warnings: list[str] = []
    confidence = 1.0

    if language_mode == "bilingual" and len(ordered) >= 8:
        matches = list(OPTION_RE.finditer(raw))
        if len(matches) < 8:
            matches = list(OPTION_DOT_RE.finditer(raw))
        if len(matches) < 8:
            warnings.append("Could not reliably locate all 8 bilingual option markers")
            confidence -= 0.2
            return {"single": {"question_text": qtext, "options": {}}}, max(confidence, 0.0), warnings

        first_text = clean_text(raw[:matches[0].start()])
        # English option 4 and Hindi question are adjacent in the source: there is no option marker
        # between them. Split at the first Devanagari character, which is robust for this booklet.
        en4_span = raw[matches[3].end():matches[4].start()]
        span_lines = [line.strip() for line in en4_span.splitlines() if line.strip()]
        hi_line_idx = next((i for i, line in enumerate(span_lines) if re.search(r"[\u0900-\u097F]", line)), None)
        if hi_line_idx is not None:
            en4_payload = clean_text(" ".join(span_lines[:hi_line_idx]))
            hindi_question = clean_text(" ".join(span_lines[hi_line_idx:]))
        else:
            # Fall back to the first Devanagari character within the span.
            devanagari = re.search(r"[\u0900-\u097F]", en4_span)
            if devanagari:
                en4_payload = clean_text(en4_span[:devanagari.start()])
                hindi_question = clean_text(en4_span[devanagari.start():])
            else:
                en4_payload = clean_text(en4_span)
                hindi_question = ""
                warnings.append("Could not detect Hindi question boundary")
                confidence -= 0.2

        first_opts = {}
        for idx in range(4):
            payload = clean_text(raw[matches[idx].end():matches[idx + 1].start()])
            if idx == 3:
                payload = en4_payload
            first_opts[str(idx + 1)] = payload
        hi_opts = {}
        for idx in range(4, 8):
            payload = clean_text(raw[matches[idx].end():matches[idx + 1].start()] if idx < 7 else raw[matches[idx].end():])
            hi_opts[str(idx - 3)] = payload
        result = {
            "en": {"question_text": first_text, "options": first_opts},
            "hi": {"question_text": hindi_question, "options": hi_opts},
        }
        if not hindi_question:
            warnings.append("Hindi question text appears empty")
        if any(not v for v in first_opts.values()) or any(not v for v in hi_opts.values()):
            warnings.append("One or more bilingual options are empty")
            # This often means the content is rendered as vector artwork (fractions, equations, diagrams).
            confidence -= 0.08
        return result, max(confidence, 0.0), warnings

    opts = {k: v for k, v in ordered}
    if len(ordered) < 4:
        warnings.append(f"Expected 4 options, detected {len(ordered)}")
        confidence -= 0.35
    elif len(ordered) > 4:
        warnings.append(f"Detected {len(ordered)} option markers; retained first four")
        confidence -= 0.12
    selected = {str(i): opts.get(str(i), "") for i in range(1, 5)}
    missing = [k for k, v in selected.items() if not v]
    if missing:
        warnings.append("Missing option content: " + ", ".join(missing))
        confidence -= 0.12 * len(missing)
    return {"single": {"question_text": qtext, "options": selected}}, max(confidence, 0.0), warnings

def union_bbox(lines: list[Line]) -> list[float]:
    if not lines:
        return [0, 0, 0, 0]
    return [
        round(min(l.x0 for l in lines), 2),
        round(min(l.y0 for l in lines), 2),
        round(max(l.x1 for l in lines), 2),
        round(max(l.y1 for l in lines), 2),
    ]


def render_question_crop(page: fitz.Page, bbox: list[float], output_path: Path, padding: float = 5.0) -> None:
    rect = fitz.Rect(bbox)
    rect.x0 = max(0, rect.x0 - padding)
    rect.y0 = max(0, rect.y0 - padding)
    rect.x1 = min(page.rect.width, rect.x1 + padding)
    rect.y1 = min(page.rect.height, rect.y1 + padding)
    pix = page.get_pixmap(matrix=fitz.Matrix(2.2, 2.2), clip=rect, alpha=False)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    pix.save(str(output_path))


def parse_pdf(pdf_path: str, exam: str, booklet_code: str, ocr_fallback: bool = False, asset_root: str | None = None) -> dict:
    doc = fitz.open(pdf_path)
    all_questions: list[Question] = []
    contexts: list[ContextGroup] = []
    current_language: str | None = None
    previous_question: Question | None = None

    for page_index in range(1, len(doc) + 1):
        # Question content exists on printed pages 2-51 for these sample booklets.
        page = doc[page_index - 1]
        lines = page_lines(page, page_index, ocr_fallback=ocr_fallback)
        if not lines:
            continue

        # Avoid instruction/back-cover numbered bullets.
        if page_index == 1 or page_index == len(doc):
            continue

        context_decls = extract_context_declarations(lines)
        for ctx in context_decls:
            if ctx.text:
                contexts.append(ctx)

        qstarts = detect_question_starts(lines)
        if not qstarts:
            # If there is a continuation page, attach all useful text to active context.
            if contexts:
                ctx = contexts[-1]
                if ctx.end >= 1:
                    blob = join_lines([l.text for l in lines if "ACF-26-I/" not in l.text])
                    if blob and not re.search(r"PART\s+[IVX]+", blob, re.I):
                        # Do not duplicate obvious page footer/header.
                        ctx.text = clean_text(ctx.text + " " + blob)
                        ctx.page_end = page_index
            continue

        # Two-column capability: detect x-clusters among question starts.
        start_lines = [lines[i] for i in qstarts]
        xs = [l.x0 for l in start_lines]
        two_col = False
        split_x = None
        if len(xs) >= 4:
            xs_sorted = sorted(xs)
            gaps = [(xs_sorted[i + 1] - xs_sorted[i], i) for i in range(len(xs_sorted) - 1)]
            if gaps:
                gap, idx = max(gaps)
                median_x = (xs_sorted[0] + xs_sorted[-1]) / 2
                if gap > 80 and xs_sorted[idx] < median_x < xs_sorted[idx + 1]:
                    left_count = idx + 1
                    right_count = len(xs_sorted) - left_count
                    if left_count >= 2 and right_count >= 2:
                        two_col = True
                        split_x = (xs_sorted[idx] + xs_sorted[idx + 1]) / 2

        if two_col and split_x is not None:
            cols = ["left", "right"]
            line_groups = {
                "left": [l for l in lines if l.x0 < split_x],
                "right": [l for l in lines if l.x0 >= split_x],
            }
            ordered_starts: list[tuple[str, Line]] = []
            for col in cols:
                for l in line_groups[col]:
                    m = QUESTION_START_RE.match(l.text)
                    if m:
                        ordered_starts.append((col, l))
            # Preserve top-to-bottom within each column; process left then right, matching typical layout.
            chunks_by_col = []
            for col in cols:
                col_lines = line_groups[col]
                qidx = detect_question_starts(col_lines)
                chunks_by_col.append((col, col_lines, qidx))
        else:
            chunks_by_col = [("single", lines, qstarts)]

        for col, col_lines, qidxs in chunks_by_col:
            for pos, start_i in enumerate(qidxs):
                end_i = qidxs[pos + 1] if pos + 1 < len(qidxs) else len(col_lines)
                chunk_lines = col_lines[start_i:end_i]
                if not chunk_lines:
                    continue
                m = QUESTION_START_RE.match(chunk_lines[0].text)
                if not m:
                    continue
                qnum = int(m.group(1))
                # Filter only test question ranges, not instructions/back cover.
                if not (1 <= qnum <= 150):
                    continue
                part, part_name = detect_part(qnum)
                lang = detect_language(lines, qnum, current_language)
                if qnum >= 91:
                    top = " ".join(l.text for l in lines[:30])
                    top_upper = top.upper()
                    if "HINDI" in top_upper or "हिंदी" in top:
                        current_language = "hi"
                    elif "ENGLISH" in top_upper:
                        current_language = "en"
                    lang = current_language or lang

                raw = "\n".join(clean_text(x) for x in ([m.group(2)] + [l.text for l in chunk_lines[1:]]) if clean_text(x))
                parsed, confidence, warnings = parse_question_text(raw, qnum, lang)
                page_bbox = union_bbox(chunk_lines)

                # Determine shared context by number range.
                context_text = None
                for ctx in reversed(contexts):
                    if ctx.start <= qnum <= ctx.end:
                        context_text = ctx.text
                        break

                visual_fallback = None
                has_empty_options = any(not str(v).strip() for v in (parsed.get("en", {}).get("options", {}) if lang == "bilingual" else parsed.get("single", {}).get("options", {})).values())
                if asset_root and has_empty_options:
                    asset_path = Path(asset_root) / booklet_code / f"Q{qnum}.png"
                    render_question_crop(page, page_bbox, asset_path)
                    visual_fallback = {"type": "question_crop", "path": str(asset_path).replace("\\", "/")}
                    warnings = list(dict.fromkeys(warnings + ["Visual fallback crop generated for non-text content"]))
                    confidence = max(confidence, 0.82)

                source = {
                    "pdf_page": page_index,
                    "printed_page": page_index,
                    "column": col,
                    "bbox": page_bbox,
                    "has_embedded_images": bool(page.get_images(full=True)),
                    "visual_fallback": visual_fallback,
                }

                extraction = {
                    "method": "native_pdf" if page.get_text().strip() else "ocr",
                    "confidence": round(confidence, 3),
                    "status": "review" if warnings and not visual_fallback else "verified_with_visual_fallback" if visual_fallback else "verified",
                    "warnings": warnings,
                }

                if lang == "bilingual" and "en" in parsed:
                    for language_code in ("en", "hi"):
                        p = parsed[language_code]
                        q = Question(
                            id=f"{exam}-{booklet_code}-Q{qnum}-{language_code.upper()}",
                            exam=exam,
                            booklet_code=booklet_code,
                            question_number=qnum,
                            part=part,
                            part_name=part_name,
                            language=language_code,
                            question_text=p["question_text"],
                            options=p["options"],
                            context_text=context_text,
                            source=source,
                            extraction=extraction,
                        )
                        all_questions.append(q)
                        previous_question = q
                else:
                    p = parsed.get("single", {"question_text": "", "options": {}})
                    q = Question(
                        id=f"{exam}-{booklet_code}-Q{qnum}-{lang.upper()}",
                        exam=exam,
                        booklet_code=booklet_code,
                        question_number=qnum,
                        part=part,
                        part_name=part_name,
                        language=lang,
                        question_text=p["question_text"],
                        options=p["options"],
                        context_text=context_text,
                        source=source,
                        extraction=extraction,
                    )
                    all_questions.append(q)
                    previous_question = q

    # De-duplicate repeated extraction records by stable ID, retaining highest confidence.
    dedup: dict[str, Question] = {}
    for q in all_questions:
        old = dedup.get(q.id)
        if old is None or q.extraction["confidence"] > old.extraction["confidence"]:
            dedup[q.id] = q

    questions = sorted(dedup.values(), key=lambda q: (q.question_number, q.language))
    validation = validate_questions(questions, expected_booklet_code=booklet_code)

    return {
        "schema_version": "1.0.0",
        "exam": exam,
        "booklet_code": booklet_code,
        "source_file": Path(pdf_path).name,
        "question_count": len(questions),
        "questions": [asdict(q) for q in questions],
        "validation": validation,
    }


def validate_questions(questions: list[Question], expected_booklet_code: str) -> dict:
    by_lang = {"en": set(), "hi": set()}
    warnings: list[dict] = []
    for q in questions:
        if q.language in by_lang:
            by_lang[q.language].add(q.question_number)
        if len(q.options) != 4:
            warnings.append({"id": q.id, "issue": f"Expected 4 options, found {len(q.options)}"})
        if not q.question_text.strip():
            warnings.append({"id": q.id, "issue": "Empty question text"})
    # For Q1-90 expect EN + HI; Q91-150 expect at least one variant per language section.
    missing_core = {}
    for n in range(1, 91):
        for lang in ("en", "hi"):
            if n not in by_lang[lang]:
                missing_core[f"{n}-{lang}"] = True
    duplicates = []
    # Stable ID dedupe already done. Duplicate numbers per language should not occur after dedupe.
    counts = {}
    for q in questions:
        key = (q.question_number, q.language)
        counts[key] = counts.get(key, 0) + 1
    duplicates = [{"question_number": n, "language": lang, "count": c} for (n, lang), c in counts.items() if c > 1]
    review_count = sum(1 for q in questions if q.extraction.get("status") == "review")
    return {
        "expected_question_numbers": "1-150",
        "detected_question_records": len(questions),
        "language_counts": {k: len(v) for k, v in by_lang.items()},
        "missing_core_bilingual_questions": list(missing_core),
        "duplicate_records": duplicates,
        "review_records": review_count,
        "warnings": warnings[:250],
        "status": "PASS" if not missing_core and not duplicates and not warnings else "REVIEW",
    }


def main() -> None:
    ap = argparse.ArgumentParser(description="Extract ACF-style question paper PDFs into structured JSON")
    ap.add_argument("pdf")
    ap.add_argument("--booklet", required=True, choices=["H", "K", "L", "M", "N", "O", "P"], help="Booklet code")
    ap.add_argument("--exam", default="ACF-26-I")
    ap.add_argument("--output", required=True)
    ap.add_argument("--ocr-fallback", action="store_true")
    ap.add_argument("--asset-root", default=None, help="Directory for image crops when options contain vector/visual content")
    args = ap.parse_args()
    result = parse_pdf(args.pdf, args.exam, args.booklet, ocr_fallback=args.ocr_fallback, asset_root=args.asset_root)
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result["validation"], ensure_ascii=False, indent=2))
    if result["validation"]["status"] != "PASS":
        raise SystemExit(2)


if __name__ == "__main__":
    main()
