import os

import pytest

from luna_cs_uil import LunaCsUilClient, resolve_figures
from luna_cs_uil.exceptions import NotFoundException


def test_resolve_figures_replaces_known_placeholders_only():
    markdown = "![Figure 1](uil-cs-api-figure:1) and ![Figure 2](uil-cs-api-figure:2)"
    assert resolve_figures(markdown, {"uil-cs-api-figure:1": "https://cdn.example/1.png"}) == (
        "![Figure 1](https://cdn.example/1.png) and ![Figure 2](uil-cs-api-figure:2)"
    )


def test_resolve_figures_ignores_text_that_is_not_a_link_target():
    assert resolve_figures("see uil-cs-api-figure:1", {"uil-cs-api-figure:1": "x"}) == "see uil-cs-api-figure:1"


# Live tests run against LUNA_CS_UIL_BASE_URL, e.g. a local server.
BASE_URL = os.environ.get("LUNA_CS_UIL_BASE_URL")
live = pytest.mark.skipif(not BASE_URL, reason="LUNA_CS_UIL_BASE_URL not set")


@pytest.fixture
def client():
    with LunaCsUilClient(BASE_URL) as client:
        yield client


@live
def test_version(client):
    assert client.meta.get_version().startswith("v")


@live
def test_competitions_and_their_problems(client):
    competitions = client.competitions.get_all_competitions(limit=2)
    assert competitions
    assert client.competitions.get_competition_problems(competitions[0].id)


@live
def test_problem_statement(client):
    [first] = client.problems.get_all_problems(limit=1)
    assert client.problems.get_problem_by_id(first.id).name == first.name
    assert first.name in client.get_problem_statement(first.id)


@live
def test_missing_problem_is_404(client):
    with pytest.raises(NotFoundException):
        client.problems.get_problem_by_id(999_999_999)
