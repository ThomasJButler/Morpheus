from app.rag.citations import CitationStreamValidator, strip_think


def run(tokens, n_sources=3):
    validator = CitationStreamValidator(n_sources)
    text_parts = []
    cited_in_order = []
    for token in tokens:
        text, new = validator.feed(token)
        text_parts.append(text)
        cited_in_order.extend(new)
    text, new = validator.finish()
    text_parts.append(text)
    cited_in_order.extend(new)
    return "".join(text_parts), cited_in_order, validator


def test_valid_marker_passes_and_reports_once():
    text, new, validator = run(["The answer ", "[1]", " and again [1]."])
    assert text == "The answer [1] and again [1]."
    assert new == [1]
    assert validator.cited == [1]


def test_fabricated_marker_never_appears():
    text, new, _ = run(["Fabricated [9] here."], n_sources=3)
    assert "[9]" not in text
    assert text == "Fabricated  here."
    assert new == []


def test_marker_split_across_tokens():
    text, new, _ = run(["see [", "2", "]", " done"])
    assert text == "see [2] done"
    assert new == [2]


def test_fabricated_marker_split_across_tokens():
    text, new, _ = run(["bad [", "9", "]", " end"], n_sources=3)
    assert "[9]" not in text
    assert new == []


def test_zero_and_out_of_range_dropped():
    text, new, _ = run(["a [0] b [4] c"], n_sources=3)
    assert text == "a  b  c"
    assert new == []


def test_markdown_links_untouched():
    text, _, _ = run(["see [the docs](http://localhost) now"])
    assert text == "see [the docs](http://localhost) now"


def test_unclosed_partial_marker_flushes_as_text():
    text, new, _ = run(["trailing [12"])
    assert text == "trailing [12"
    assert new == []


def test_think_block_stripped():
    text, _, _ = run(["<think>secret reasoning</think>Visible [1]"])
    assert "secret" not in text
    assert text == "Visible [1]"


def test_think_block_split_across_tokens():
    text, _, _ = run(["<thi", "nk>hidden 1 2 3</th", "ink>Answer [2]"])
    assert "hidden" not in text
    assert text == "Answer [2]"


def test_lone_angle_bracket_passes():
    text, _, _ = run(["a < b and a<c"])
    assert text == "a < b and a<c"


def test_multiple_citations_order_of_first_sight():
    text, new, validator = run(["[2] then [1] then [2] again"])
    assert new == [2, 1]
    assert validator.cited == [2, 1]
    assert text == "[2] then [1] then [2] again"


def test_strip_think_helper():
    assert strip_think("<think>x\ny</think>query one\nquery two") == "query one\nquery two"
