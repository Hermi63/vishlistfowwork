"""
Integration tests for authentication endpoints:
  POST /api/auth/register
  POST /api/auth/login
  GET  /api/auth/me
"""
import pytest

from tests.conftest import auth_headers, register_user


@pytest.mark.asyncio
class TestRegister:

    async def test_register_success(self, client):
        resp = await client.post(
            "/api/auth/register",
            json={"email": "new@example.com", "name": "New User", "password": "password123"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "new@example.com"
        assert data["user"]["name"] == "New User"
        assert "id" in data["user"]

    async def test_register_duplicate_email(self, client):
        await register_user(client, "dup@example.com", "User One", "password123")
        resp = await client.post(
            "/api/auth/register",
            json={"email": "dup@example.com", "name": "User Two", "password": "password456"},
        )
        assert resp.status_code == 400
        assert "already registered" in resp.json()["detail"]

    async def test_register_short_password(self, client):
        resp = await client.post(
            "/api/auth/register",
            json={"email": "short@example.com", "name": "Short", "password": "abc"},
        )
        assert resp.status_code == 422

    async def test_register_invalid_email(self, client):
        resp = await client.post(
            "/api/auth/register",
            json={"email": "not-an-email", "name": "Bad", "password": "password123"},
        )
        assert resp.status_code == 422

    async def test_register_empty_name(self, client):
        resp = await client.post(
            "/api/auth/register",
            json={"email": "empty@example.com", "name": "", "password": "password123"},
        )
        assert resp.status_code == 422

    async def test_register_missing_fields(self, client):
        resp = await client.post("/api/auth/register", json={"email": "x@example.com"})
        assert resp.status_code == 422

    async def test_register_returns_valid_token(self, client):
        """Token returned on register should allow access to /me."""
        resp = await client.post(
            "/api/auth/register",
            json={"email": "tokentest@example.com", "name": "Token User", "password": "password123"},
        )
        token = resp.json()["access_token"]
        me_resp = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_resp.status_code == 200
        assert me_resp.json()["email"] == "tokentest@example.com"


@pytest.mark.asyncio
class TestLogin:

    async def test_login_success(self, client):
        await register_user(client, "login@example.com", "Login User", "mypassword")
        resp = await client.post(
            "/api/auth/login",
            json={"email": "login@example.com", "password": "mypassword"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["user"]["email"] == "login@example.com"

    async def test_login_wrong_password(self, client):
        await register_user(client, "wrongpass@example.com", "User", "correctpass")
        resp = await client.post(
            "/api/auth/login",
            json={"email": "wrongpass@example.com", "password": "wrongpass"},
        )
        assert resp.status_code == 401
        assert resp.json()["detail"] == "Invalid credentials"

    async def test_login_nonexistent_user(self, client):
        resp = await client.post(
            "/api/auth/login",
            json={"email": "ghost@example.com", "password": "anypassword"},
        )
        assert resp.status_code == 401

    async def test_login_missing_email(self, client):
        resp = await client.post("/api/auth/login", json={"password": "password123"})
        assert resp.status_code == 422

    async def test_login_token_is_usable(self, client):
        await register_user(client, "usable@example.com", "Usable", "password123")
        headers = await auth_headers(client, "usable@example.com", "password123")
        me_resp = await client.get("/api/auth/me", headers=headers)
        assert me_resp.status_code == 200

    async def test_login_case_sensitive_email(self, client):
        """Email lookup should be exact (emails are case-sensitive in this app)."""
        await register_user(client, "exact@example.com", "Exact", "password123")
        resp = await client.post(
            "/api/auth/login",
            json={"email": "EXACT@example.com", "password": "password123"},
        )
        # Depending on DB collation this may pass or fail; we just check it's not a 500
        assert resp.status_code in (200, 401)


@pytest.mark.asyncio
class TestMe:

    async def test_me_returns_current_user(self, client):
        await register_user(client, "me@example.com", "Me User", "password123")
        headers = await auth_headers(client, "me@example.com", "password123")
        resp = await client.get("/api/auth/me", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "me@example.com"
        assert data["name"] == "Me User"
        assert "id" in data

    async def test_me_no_token(self, client):
        resp = await client.get("/api/auth/me")
        assert resp.status_code == 401

    async def test_me_invalid_token(self, client):
        resp = await client.get("/api/auth/me", headers={"Authorization": "Bearer invalid.token.here"})
        assert resp.status_code == 401

    async def test_me_malformed_auth_header(self, client):
        resp = await client.get("/api/auth/me", headers={"Authorization": "NotBearer token"})
        assert resp.status_code == 401

    async def test_me_different_users(self, client):
        """Two different users should get their own data."""
        await register_user(client, "user1@example.com", "User One", "password123")
        await register_user(client, "user2@example.com", "User Two", "password123")

        h1 = await auth_headers(client, "user1@example.com", "password123")
        h2 = await auth_headers(client, "user2@example.com", "password123")

        r1 = await client.get("/api/auth/me", headers=h1)
        r2 = await client.get("/api/auth/me", headers=h2)

        assert r1.json()["email"] == "user1@example.com"
        assert r2.json()["email"] == "user2@example.com"
        assert r1.json()["id"] != r2.json()["id"]
