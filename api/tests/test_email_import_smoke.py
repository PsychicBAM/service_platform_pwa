def test_email_and_order_message_services_import_without_cycle() -> None:
    from app.services.email_notification_service import EmailNotificationService
    from app.services.order_message_service import OrderMessageService

    assert EmailNotificationService is not None
    assert OrderMessageService is not None


def test_app_main_imports_without_cycle() -> None:
    from app.main import app

    assert app is not None
