from pydantic import BaseModel, Field, field_validator

LEGAL_CONSENT_REQUIRED = "LEGAL_CONSENT_REQUIRED"
LEGAL_CONSENT_VERSION = "draft-placeholder-v1"


class LegalConsentRequiredMixin(BaseModel):
    legal_consent_accepted: bool = Field(
        ...,
        description="Must be true to acknowledge draft legal/privacy terms.",
    )

    @field_validator("legal_consent_accepted")
    @classmethod
    def validate_legal_consent_accepted(cls, value: bool) -> bool:
        if value is not True:
            raise ValueError(LEGAL_CONSENT_REQUIRED)
        return value
