"""Public marketplace directory sort helpers."""

from __future__ import annotations

PUBLIC_DIRECTORY_SORTS = frozenset({"popular", "rating", "reviews", "newest", "bookable", "name"})


def normalize_directory_sort(sort: str | None) -> str:
    if sort in PUBLIC_DIRECTORY_SORTS:
        return sort
    return "popular"
