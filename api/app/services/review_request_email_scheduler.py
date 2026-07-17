from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import get_settings
from app.database import async_session_factory
from app.services.review_service import ReviewService

logger = logging.getLogger(__name__)


async def run_due_review_request_email_cycle() -> int:
    async with async_session_factory() as session:
        return await ReviewService(session).process_due_review_request_emails()


async def _review_request_email_scheduler_loop() -> None:
    settings = get_settings()
    interval = max(30, int(settings.review_request_email_scheduler_interval_seconds))
    while True:
        try:
            sent = await run_due_review_request_email_cycle()
            if sent:
                logger.info("Auto review request emails sent: %s", sent)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Auto review request email scheduler cycle failed")
        await asyncio.sleep(interval)


@asynccontextmanager
async def app_lifespan(_app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    task: asyncio.Task[None] | None = None
    if settings.review_request_email_scheduler_enabled:
        task = asyncio.create_task(
            _review_request_email_scheduler_loop(),
            name="review-request-email-scheduler",
        )
        logger.info(
            "Review request email scheduler started (interval=%ss)",
            settings.review_request_email_scheduler_interval_seconds,
        )
    try:
        yield
    finally:
        if task is not None:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
