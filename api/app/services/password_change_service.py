from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.auth import (
    InvalidCurrentPasswordError,
    PasswordChangeValidationError,
)
from app.models.user import User
from app.services.password_service import (
    PasswordValidationError,
    hash_password,
    verify_password,
)


class PasswordChangeService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def change_password(
        self,
        user: User,
        *,
        current_password: str,
        new_password: str,
    ) -> None:
        if not user.password_hash or not verify_password(
            current_password,
            user.password_hash,
        ):
            raise InvalidCurrentPasswordError()

        if current_password == new_password:
            raise PasswordChangeValidationError(
                "New password must be different from the current password."
            )

        try:
            user.password_hash = hash_password(new_password)
        except PasswordValidationError as exc:
            raise PasswordChangeValidationError(str(exc)) from exc

        await self.session.commit()
        await self.session.refresh(user)
