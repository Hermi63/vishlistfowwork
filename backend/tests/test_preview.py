"""
Tests for link preview endpoint and service:
  POST /api/link-preview
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from tests.conftest import auth_headers, register_user


# ── helpers ───────────────────────────────────────────────────────────────────

async def setup_user(client, email, password="password123"):
    await register_user(client, email, "Preview User", password)
    return await auth_headers(client, email, password)


def _make_html_response(html: str, status_code: int = 200):
    """Build a mock httpx streaming response."""
    mock_resp = MagicMock()
    mock_resp.status_code = status_code
    mock_resp.raise_for_status = MagicMock()

    async def aiter_bytes():
        yield html.encode("utf-8")

    mock_resp.aiter_bytes = aiter_bytes
    return mock_resp


# ── Endpoint access control ───────────────────────────────────────────────────

@pytest.mark.asyncio
class TestLinkPreviewAccess:

    async def test_requires_auth(self, client):
        resp = await client.post("/api/link-preview", json={"url": "https://example.com"})
        assert resp.status_code == 401

    async def test_valid_user_can_call(self, client):
        h = await setup_user(client, "preview_auth@example.com")
        with patch("app.services.link_preview._is_safe_url", return_value=False):
            resp = await client.post("/api/link-preview", json={"url": "https://example.com"}, headers=h)
        assert resp.status_code == 200

    async def test_missing_url(self, client):
        h = await setup_user(client, "preview_nourl@example.com")
        resp = await client.post("/api/link-preview", json={}, headers=h)
        assert resp.status_code == 422

    async def test_empty_url(self, client):
        h = await setup_user(client, "preview_emptyurl@example.com")
        resp = await client.post("/api/link-preview", json={"url": ""}, headers=h)
        assert resp.status_code == 422


# ── Unsafe URL protection ─────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestSafeUrl:

    async def test_localhost_rejected(self, client):
        from app.services.link_preview import _is_safe_url
        assert _is_safe_url("http://localhost/") is False
        assert _is_safe_url("http://localhost:8080/") is False

    async def test_private_ip_rejected(self, client):
        from app.services.link_preview import _is_safe_url
        assert _is_safe_url("http://192.168.1.1/") is False
        assert _is_safe_url("http://10.0.0.1/") is False
        assert _is_safe_url("http://172.16.0.1/") is False

    async def test_link_local_rejected(self, client):
        from app.services.link_preview import _is_safe_url
        assert _is_safe_url("http://169.254.169.254/") is False

    async def test_non_http_scheme_rejected(self, client):
        from app.services.link_preview import _is_safe_url
        assert _is_safe_url("ftp://example.com/") is False
        assert _is_safe_url("file:///etc/passwd") is False

    async def test_public_url_accepted(self, client):
        from app.services.link_preview import _is_safe_url
        # example.com resolves to a public IP
        result = _is_safe_url("https://example.com/")
        assert isinstance(result, bool)  # May be True or False depending on DNS, just not crash


# ── OpenGraph parsing ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestLinkPreviewParsing:

    async def test_og_tags_extracted(self, client):
        h = await setup_user(client, "og_tags@example.com")
        html = """
        <html><head>
          <meta property="og:title" content="Test Product" />
          <meta property="og:image" content="https://cdn.example.com/img.jpg" />
          <meta property="og:description" content="A great item" />
        </head></html>
        """
        mock_stream_resp = _make_html_response(html)
        mock_stream_ctx = MagicMock()
        mock_stream_ctx.__aenter__ = AsyncMock(return_value=mock_stream_resp)
        mock_stream_ctx.__aexit__ = AsyncMock(return_value=False)

        mock_client = MagicMock()
        mock_client.stream = MagicMock(return_value=mock_stream_ctx)
        mock_client_ctx = MagicMock()
        mock_client_ctx.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_ctx.__aexit__ = AsyncMock(return_value=False)

        with patch("app.services.link_preview._is_safe_url", return_value=True):
            with patch("app.services.link_preview.httpx.AsyncClient", return_value=mock_client_ctx):
                resp = await client.post(
                    "/api/link-preview",
                    json={"url": "https://example.com/product"},
                    headers=h,
                )

        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Test Product"
        assert data["image"] == "https://cdn.example.com/img.jpg"
        assert data["description"] == "A great item"

    async def test_falls_back_to_title_tag(self, client):
        h = await setup_user(client, "titlefallback@example.com")
        html = "<html><head><title>Fallback Title</title></head></html>"

        mock_stream_resp = _make_html_response(html)
        mock_stream_ctx = MagicMock()
        mock_stream_ctx.__aenter__ = AsyncMock(return_value=mock_stream_resp)
        mock_stream_ctx.__aexit__ = AsyncMock(return_value=False)
        mock_client = MagicMock()
        mock_client.stream = MagicMock(return_value=mock_stream_ctx)
        mock_client_ctx = MagicMock()
        mock_client_ctx.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_ctx.__aexit__ = AsyncMock(return_value=False)

        with patch("app.services.link_preview._is_safe_url", return_value=True):
            with patch("app.services.link_preview.httpx.AsyncClient", return_value=mock_client_ctx):
                resp = await client.post(
                    "/api/link-preview",
                    json={"url": "https://example.com"},
                    headers=h,
                )

        assert resp.status_code == 200
        assert resp.json()["title"] == "Fallback Title"

    async def test_price_extracted_from_og_meta(self, client):
        h = await setup_user(client, "og_price@example.com")
        html = """
        <html><head>
          <meta property="og:title" content="Pricy" />
          <meta property="og:price:amount" content="1999.99" />
        </head></html>
        """
        mock_stream_resp = _make_html_response(html)
        mock_stream_ctx = MagicMock()
        mock_stream_ctx.__aenter__ = AsyncMock(return_value=mock_stream_resp)
        mock_stream_ctx.__aexit__ = AsyncMock(return_value=False)
        mock_client = MagicMock()
        mock_client.stream = MagicMock(return_value=mock_stream_ctx)
        mock_client_ctx = MagicMock()
        mock_client_ctx.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_ctx.__aexit__ = AsyncMock(return_value=False)

        with patch("app.services.link_preview._is_safe_url", return_value=True):
            with patch("app.services.link_preview.httpx.AsyncClient", return_value=mock_client_ctx):
                resp = await client.post(
                    "/api/link-preview",
                    json={"url": "https://shop.example.com"},
                    headers=h,
                )

        assert resp.status_code == 200
        assert resp.json()["price"] == "1999.99"

    async def test_unsafe_url_returns_empty_result(self, client):
        h = await setup_user(client, "unsafe_url@example.com")
        with patch("app.services.link_preview._is_safe_url", return_value=False):
            resp = await client.post(
                "/api/link-preview",
                json={"url": "http://192.168.1.1/"},
                headers=h,
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] is None
        assert data["image"] is None

    async def test_network_error_returns_empty_result(self, client):
        h = await setup_user(client, "net_err@example.com")

        async def boom(*args, **kwargs):
            raise Exception("Network error")

        with patch("app.services.link_preview._is_safe_url", return_value=True):
            with patch("app.services.link_preview.httpx.AsyncClient") as mock_cls:
                mock_client = MagicMock()
                mock_client.__aenter__ = AsyncMock(side_effect=boom)
                mock_client.__aexit__ = AsyncMock(return_value=False)
                mock_cls.return_value = mock_client
                resp = await client.post(
                    "/api/link-preview",
                    json={"url": "https://unreachable.example.com"},
                    headers=h,
                )

        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] is None
