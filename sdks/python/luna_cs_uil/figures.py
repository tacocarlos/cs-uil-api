"""Figure placeholders in problem statements.

Problem statements refer to figures by placeholder, e.g.
``![Figure 1](uil-cs-api-figure:1)``, and the API returns the current URL for
each placeholder alongside the markdown. URLs can change when the server moves
its storage, so resolve them when rendering instead of saving them.
"""

from collections.abc import Mapping


def resolve_figures(markdown: str, images: Mapping[str, str]) -> str:
    """Return ``markdown`` with every placeholder in ``images`` replaced by its URL.

    Placeholders without a URL are left as they are, so a renderer can show
    them as missing. Only link targets (``](placeholder)``) are replaced; the
    placeholder format itself is the server's business.
    """
    for placeholder, url in images.items():
        markdown = markdown.replace(f"]({placeholder})", f"]({url})")
    return markdown
