from app.schemas.order import ORDER_MESSAGE_PREVIEW_LENGTH


def trim_message_preview(
    body: str | None,
    max_length: int = ORDER_MESSAGE_PREVIEW_LENGTH,
) -> str:
    if body is None:
        return ""
    text = body.strip()
    if len(text) <= max_length:
        return text
    return f"{text[: max_length - 3]}..."
