"""Unit tests for pydantic schema validation rules."""

import pytest
from pydantic import ValidationError

from app.schemas.organization import OrganizationUpdate
from app.schemas.user import ProfileUpdate, ResetPassword


class TestProfileUpdate:
    def test_valid_name_and_phone(self):
        model = ProfileUpdate.model_validate({"name": "  Ada Lovelace  ", "phone": "+1 (415) 555-1234"})
        assert model.name == "Ada Lovelace"
        assert model.phone == "+1 (415) 555-1234"

    def test_empty_name_rejected(self):
        with pytest.raises(ValidationError):
            ProfileUpdate.model_validate({"name": "   "})

    def test_name_with_digits_rejected(self):
        with pytest.raises(ValidationError):
            ProfileUpdate.model_validate({"name": "Ada2"})

    def test_name_too_long_rejected(self):
        with pytest.raises(ValidationError):
            ProfileUpdate.model_validate({"name": "A" * 61})

    def test_empty_phone_normalizes_to_none(self):
        assert ProfileUpdate.model_validate({"phone": "   "}).phone is None

    def test_phone_too_short_rejected(self):
        with pytest.raises(ValidationError):
            ProfileUpdate.model_validate({"phone": "123"})

    def test_partial_update_allows_missing_fields(self):
        model = ProfileUpdate.model_validate({"name": "Grace"})
        assert model.phone is None
        assert model.avatar_url is None


class TestResetPassword:
    def test_strong_password_ok(self):
        assert ResetPassword.model_validate(
            {"identifier": "a@b.com", "code": "000000", "new_password": "StrongPass1!"}
        )

    @pytest.mark.parametrize(
        "password",
        [
            "Short1!",  # too short (7 chars)
            "lowercase1!",  # no upper
            "UPPERCASE1!",  # no lower
            "NoDigitsHere!",  # no digit
            "NoSpecialChar1",  # no special
        ],
    )
    def test_weak_passwords_rejected(self, password):
        with pytest.raises(ValidationError):
            ResetPassword.model_validate(
                {"identifier": "a@b.com", "code": "000000", "new_password": password}
            )


class TestOrganizationUpdate:
    def test_valid_update(self):
        model = OrganizationUpdate.model_validate({"name": "Acme Inc & Co", "description": "Great org"})
        assert model.name == "Acme Inc & Co"

    def test_name_too_short_rejected(self):
        with pytest.raises(ValidationError):
            OrganizationUpdate.model_validate({"name": "A"})

    def test_name_special_chars_rejected(self):
        with pytest.raises(ValidationError):
            OrganizationUpdate.model_validate({"name": "Acme!"})

    def test_description_too_long_rejected(self):
        with pytest.raises(ValidationError):
            OrganizationUpdate.model_validate({"description": "x" * 201})

    def test_empty_payload_allowed(self):
        assert OrganizationUpdate.model_validate({})