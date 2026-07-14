from __future__ import annotations

MARKETPLACE_CATEGORIES: dict[str, list[str]] = {
    "all": [],
    "health-wellness": ["health", "wellness", "dental", "clinic", "medical", "therapy"],
    "home-services": ["home", "clean", "repair", "plumb", "electric", "maintenance"],
    "tutors-classes": ["tutor", "lesson", "class", "language", "math", "education"],
    "coaching-courses": ["coach", "course", "training", "mentor", "program"],
    "beauty-salon": ["beauty", "salon", "hair", "spa", "nail", "skin"],
    "events-photography": ["event", "photo", "wedding", "portrait", "studio"],
    "design-creative": ["design", "creative", "brand", "logo", "portfolio", "art"],
    "automotive": ["auto", "car", "vehicle", "mechanic", "garage"],
}


def category_keywords(category: str | None) -> list[str]:
    if not category or category == "all":
        return []
    return MARKETPLACE_CATEGORIES.get(category, [])
