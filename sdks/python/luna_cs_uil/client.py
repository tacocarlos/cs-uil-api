"""The entry point for the UIL CS problems API."""

from luna_cs_uil.api.competition_api import CompetitionApi
from luna_cs_uil.api.meta_api import MetaApi
from luna_cs_uil.api.problem_api import ProblemApi
from luna_cs_uil.api_client import ApiClient
from luna_cs_uil.configuration import Configuration
from luna_cs_uil.figures import resolve_figures

#: Where the API is hosted.
DEFAULT_BASE_URL = "https://api.lunaghs.dev"


class LunaCsUilClient:
    """Client for the UIL CS problems API.

    Use it as a context manager to release its connection pool::

        with LunaCsUilClient() as client:
            competitions = client.competitions.get_all_competitions()
            statement = client.get_problem_statement(competitions[0].id)
    """

    def __init__(self, base_url: str = DEFAULT_BASE_URL) -> None:
        """Create a client for the API at ``base_url`` (its origin, without ``/api``)."""
        self.api_client = ApiClient(Configuration(host=base_url.rstrip("/")))
        self.problems = ProblemApi(self.api_client)
        self.competitions = CompetitionApi(self.api_client)
        self.meta = MetaApi(self.api_client)

    def get_problem_statement(self, problem_id: int) -> str:
        """A problem's statement as markdown, with figure placeholders replaced by their URLs."""
        statement = self.problems.get_problem_markdown_by_id(problem_id)
        return resolve_figures(statement.markdown, statement.images)

    def close(self) -> None:
        """Close pooled connections."""
        self.api_client.rest_client.pool_manager.clear()

    def __enter__(self) -> "LunaCsUilClient":
        return self

    def __exit__(self, *_: object) -> None:
        self.close()
