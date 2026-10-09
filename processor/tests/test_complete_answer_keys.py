import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]

def test_all_current_answer_keys_are_complete():
    for booklet in ["H", "K", "L", "M", "N"]:
        d=json.loads((ROOT/"data"/"answer_keys"/booklet/"answer_key.json").read_text(encoding="utf-8"))
        assert set(d["answers"]) == {str(i) for i in range(1,151)}
        assert set(d["answers"]).issubset({str(i) for i in range(1,151)})
        assert set(d.get("language_variants",{}).get("en",{})) == {str(i) for i in range(91,151)}
        if booklet != "H":
            assert set(d["language_variants"]["hi"]) == {str(i) for i in range(91,151)}
            assert not d.get("inferred_answers")
        else:
            assert set(d.get("inferred_answers",{})) == {str(i) for i in range(91,151)}
            assert all(x.get("provenance") == "inferred" for x in d["inferred_answers"].values())
            assert d.get("status") == "contains_inferred_answers"
