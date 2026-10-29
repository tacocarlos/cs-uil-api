# luna-cs-uil

Python client for the UIL Computer Science problems API at `https://api.lunaghs.dev`: past contests' competitions, problems, statements and judge data.

> **Unofficial.** This project is not affiliated with or endorsed by the University Interscholastic League (UIL).

## Install

```sh
pip install luna-cs-uil
```

Requires Python 3.10+.

## Usage

```python
from luna_cs_uil import LunaCsUilClient

with LunaCsUilClient() as client:
    competitions = client.competitions.get_all_competitions()
    problems = client.competitions.get_competition_problems(competitions[0].id)

    # The statement as markdown, with figure links pointing at their images.
    statement = client.get_problem_statement(problems[0].id)
```

`client.problems`, `client.competitions` and `client.meta` expose every endpoint; models are Pydantic. Failed requests raise `luna_cs_uil.exceptions.ApiException`; a missing problem or competition raises its subclass `NotFoundException`.

`LunaCsUilClient(base_url)` targets another server; `base_url` is the API origin without `/api`.

## Figures

Statements refer to figures by placeholder, e.g. `![Figure 1](uil-cs-api-figure:1)`, and `get_problem_markdown_by_id` returns each placeholder's current URL in `images`. Image URLs can change, so resolve them when you render rather than storing them. `get_problem_statement` does this for you, or call `resolve_figures(markdown, images)` yourself. Placeholders without an image are left unchanged.

## Reference

Every endpoint and model is documented in [`docs/`](docs/).

## License

MIT. See [LICENSE](LICENSE).
