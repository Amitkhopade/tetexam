from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))

from extract_paper import clean_text, ordered_option_segments, parse_question_text


def test_bilingual_standard_question():
    raw = '''Which is correct?\n(1) A\n(2) B\n(3) C\n(4) D\nसही विकल्प कौन सा है?\n(1) अ\n(2) ब\n(3) स\n(4) द'''
    parsed, confidence, warnings = parse_question_text(raw, 1, 'bilingual')
    assert parsed['en']['question_text'] == 'Which is correct?'
    assert parsed['en']['options']['4'] == 'D'
    assert parsed['hi']['question_text'] == 'सही विकल्प कौन सा है?'
    assert parsed['hi']['options']['1'] == 'अ'
    assert confidence > 0.9
    assert not warnings


def test_vector_option_fallback_is_detectable():
    raw = '''What fraction?\n(1)\n(2)\n(3)\n(4)\nभिन्न कितना है?\n(1)\n(2)\n(3)\n(4)'''
    parsed, confidence, warnings = parse_question_text(raw, 41, 'bilingual')
    assert any('options' in w for w in warnings)
    assert parsed['en']['options']['1'] == ''
    assert parsed['hi']['options']['4'] == ''


def test_wrapped_option_content():
    raw = '''Which is correct?\n(1) A long option\nthat wraps to a second line.\n(2) B\n(3) C\n(4) D'''
    parsed, confidence, warnings = parse_question_text(raw, 1, 'en')
    assert parsed['single']['options']['1'] == 'A long option that wraps to a second line.'
    assert not warnings


def test_option_markers_without_space_before_marker():
    q, segments = ordered_option_segments('Question? (1) One (2) Two (3) Three(4) Four')
    assert q == 'Question?'
    assert segments[-1][0] == '4'
    assert segments[-1][1] == 'Four'


def test_clean_text():
    assert clean_text('  A\u00a0 B  \n C ') == 'A B C'
