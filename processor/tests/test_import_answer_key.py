from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))
from import_answer_key import extract_rows_from_grid, norm_answer


def test_answer_aliases():
    rows = [['Question No', 'Correct Answer'], ['1', 'A'], ['2', '(3)'], ['3', '4']]
    assert extract_rows_from_grid(rows) == {'1': '1', '2': '3', '3': '4'}
    assert norm_answer('D') == '4'
