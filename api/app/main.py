from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.config import get_settings
from app.exceptions.auth import AppError
from app.routers import admin_email, auth, billing, bookings, businesses, claims, clients, health, me_bookings, me_orders, orders, plan_change_requests, public, public_directory, review_requests, reviews, schedule, services, superadmin, waitlist
from app.services.review_request_email_scheduler import app_lifespan

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url="/docs" if settings.docs_enabled else None,
    redoc_url="/redoc" if settings.docs_enabled else None,
    openapi_url="/openapi.json" if settings.docs_enabled else None,
    lifespan=app_lifespan,
)


@app.exception_handler(AppError)
async def app_error_handler(_request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message}},
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(health.router, prefix=settings.api_v1_prefix)
app.include_router(auth.router, prefix=settings.api_v1_prefix)
app.include_router(admin_email.router, prefix=settings.api_v1_prefix)
app.include_router(me_bookings.router, prefix=settings.api_v1_prefix)
app.include_router(me_orders.router, prefix=settings.api_v1_prefix)
app.include_router(claims.router, prefix=settings.api_v1_prefix)
app.include_router(services.router, prefix=settings.api_v1_prefix)
app.include_router(businesses.router, prefix=settings.api_v1_prefix)
app.include_router(billing.router, prefix=settings.api_v1_prefix)
app.include_router(billing.webhook_router, prefix=settings.api_v1_prefix)
app.include_router(plan_change_requests.admin_router, prefix=settings.api_v1_prefix)
app.include_router(plan_change_requests.superadmin_router, prefix=settings.api_v1_prefix)
app.include_router(schedule.router, prefix=settings.api_v1_prefix)
app.include_router(bookings.router, prefix=settings.api_v1_prefix)
app.include_router(waitlist.router, prefix=settings.api_v1_prefix)
app.include_router(reviews.router, prefix=settings.api_v1_prefix)
app.include_router(review_requests.router, prefix=settings.api_v1_prefix)
app.include_router(orders.router, prefix=settings.api_v1_prefix)
app.include_router(clients.router, prefix=settings.api_v1_prefix)
app.include_router(superadmin.router, prefix=settings.api_v1_prefix)
app.include_router(public.router, prefix=settings.api_v1_prefix)
app.include_router(public_directory.router, prefix=settings.api_v1_prefix)

upload_root = Path(settings.mini_site_upload_root)
upload_root.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(upload_root)), name="mini_site_uploads")
