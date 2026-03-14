"""
Tests for Google OAuth endpoint POST /api/auth/google.

Since we can't call the real Google API in CI, we mock httpx.AsyncClient
to simulate various Google responses.
"""
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from tests.conftest import register_user, auth_headers


# ── Helper: mock a successful Google tokeninfo response ──────────────────────

def _google_response(sub="g-123", email="google@example.com", name="Google User", aud=None):
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "sub": sub,
        "email": email,
        "name": name,
        "aud": aud or "test-client-id.apps.googleusercontent.com",
    }
    return mock_resp


def _google_error_response(status_code=400):
    mock_resp = MagicMock()
    mock_resp.status_code = status_code
    mock_resp.json.return_value = {"error": "invalid_token"}
    return mock_resp


# Patch target: httpx.AsyncClient used inside the endpoint
PATCH_TARGET = "app.routers.auth.httpx.AsyncClient"
CLIENT_ID = "test-client-id.apps.googleusercontent.com"


def _mock_client(response):
    """Return a context-manager mock that yields an async client returning `response`."""
    mock_get = AsyncMock(return_value=response)
    mock_client_instance = MagicMock()
    mock_client_instance.get = mock_get
    mock_cm = MagicMock()
    mock_cm.__aenter__ = AsyncMock(return_value=mock_client_instance)
    mock_cm.__aexit__ = AsyncMock(return_value=False)
    return mock_cm


@pytest.mark.asyncio
class TestGoogleAuthEndpoint:

    async def test_google_not_configured_returns_501(self, client):
        """When GOOGLE_CLIENT_ID is empty, endpoint returns 501."""
        with patch("app.routers.auth.settings") as mock_settings:
            mock_settings.GOOGLE_CLIENT_ID = ""
            resp = await client.post("/api/auth/google", json={"id_token": "any"})
        assert resp.status_code == 501
        assert "not configured" in resp.json()["detail"]

    async def test_invalid_google_token_returns_401(self, client):
        """When Google returns non-200, endpoint returns 401."""
        with patch("app.routers.auth.settings") as mock_settings:
            mock_settings.GOOGLE_CLIENT_ID = CLIENT_ID
            with patch(PATCH_TARGET, return_value=_mock_client(_google_error_response(400))):
                resp = await client.post("/api/auth/google", json={"id_token": "bad-token"})
        assert resp.status_code == 401
        assert resp.json()["detail"] == "Invalid Google token"

    async def test_audience_mismatch_returns_401(self, client):
        """When `aud` in token doesn't match GOOGLE_CLIENT_ID, return 401."""
        google_resp = _google_response(aud="other-client-id.apps.googleusercontent.com")
        with patch("app.routers.auth.settings") as mock_settings:
            mock_settings.GOOGLE_CLIENT_ID = CLIENT_ID
            with patch(PATCH_TARGET, return_value=_mock_client(google_resp)):
                resp = await client.post("/api/auth/google", json={"id_token": "token"})
        assert resp.status_code == 401
        assert resp.json()["detail"] == "Token audience mismatch"

    async def test_new_user_is_created(self, client):
        """A new Google user gets an account and JWT on first login."""
        google_resp = _google_response()
        with patch("app.routers.auth.settings") as mock_settings:
            mock_settings.GOOGLE_CLIENT_ID = CLIENT_ID
            with patch(PATCH_TARGET, return_value=_mock_client(google_resp)):
                resp = await client.post("/api/auth/google", json={"id_token": "valid-token"})
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["user"]["email"] == "google@example.com"
        assert data["user"]["name"] == "Google User"

    async def test_existing_google_user_logs_in(self, client):
        """Same Google user logs in twice — should succeed both times and return same user id."""
        google_resp = _google_response(sub="g-456", email="return@example.com", name="Returner")

        with patch("app.routers.auth.settings") as mock_settings:
            mock_settings.GOOGLE_CLIENT_ID = CLIENT_ID
            with patch(PATCH_TARGET, return_value=_mock_client(google_resp)):
                resp1 = await client.post("/api/auth/google", json={"id_token": "tok"})

        with patch("app.routers.auth.settings") as mock_settings:
            mock_settings.GOOGLE_CLIENT_ID = CLIENT_ID
            with patch(PATCH_TARGET, return_value=_mock_client(google_resp)):
                resp2 = await client.post("/api/auth/google", json={"id_token": "tok"})

        assert resp1.status_code == 200
        assert resp2.status_code == 200
        assert resp1.json()["user"]["id"] == resp2.json()["user"]["id"]

    async def test_google_links_to_existing_email_user(self, client):
        """If a user registered with email/password, Google login links the account."""
        # Create email user
        await register_user(client, "linked@example.com", "Linked User", "pass1234")

        # Google login with same email
        google_resp = _google_response(sub="g-link-999", email="linked@example.com", name="Linked User")
        with patch("app.routers.auth.settings") as mock_settings:
            mock_settings.GOOGLE_CLIENT_ID = CLIENT_ID
            with patch(PATCH_TARGET, return_value=_mock_client(google_resp)):
                resp = await client.post("/api/auth/google", json={"id_token": "link-token"})

        assert resp.status_code == 200
        data = resp.json()
        assert data["user"]["email"] == "linked@example.com"
        # The access token should be valid
        assert len(data["access_token"]) > 10

    async def test_google_user_can_access_protected_route(self, client):
        """JWT returned from /google should allow access to /me."""
        google_resp = _google_response(sub="g-789", email="protected@example.com")
        with patch("app.routers.auth.settings") as mock_settings:
            mock_settings.GOOGLE_CLIENT_ID = CLIENT_ID
            with patch(PATCH_TARGET, return_value=_mock_client(google_resp)):
                resp = await client.post("/api/auth/google", json={"id_token": "tok"})

        token = resp.json()["access_token"]
        me_resp = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_resp.status_code == 200
        assert me_resp.json()["email"] == "protected@example.com"

    async def test_missing_sub_returns_401(self, client):
        """Token without `sub` field is rejected."""
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "email": "nosub@example.com",
            "aud": CLIENT_ID,
            # No "sub"
        }
        with patch("app.routers.auth.settings") as mock_settings:
            mock_settings.GOOGLE_CLIENT_ID = CLIENT_ID
            with patch(PATCH_TARGET, return_value=_mock_client(mock_resp)):
                resp = await client.post("/api/auth/google", json={"id_token": "tok"})
        assert resp.status_code == 401
        assert resp.json()["detail"] == "Incomplete Google profile"

    async def test_name_falls_back_to_email_prefix(self, client):
        """When Google doesn't return name, username is taken from email prefix."""
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "sub": "g-noname",
            "email": "noname@example.com",
            "aud": CLIENT_ID,
            # No "name"
        }
        with patch("app.routers.auth.settings") as mock_settings:
            mock_settings.GOOGLE_CLIENT_ID = CLIENT_ID
            with patch(PATCH_TARGET, return_value=_mock_client(mock_resp)):
                resp = await client.post("/api/auth/google", json={"id_token": "tok"})
        assert resp.status_code == 200
        assert resp.json()["user"]["name"] == "noname"
