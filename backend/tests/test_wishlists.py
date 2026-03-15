"""
Integration tests for wishlist endpoints:
  GET    /api/wishlists/my
  POST   /api/wishlists/
  GET    /api/wishlists/{slug}
  PUT    /api/wishlists/{slug}
  DELETE /api/wishlists/{slug}
"""
import pytest

from tests.conftest import auth_headers, register_user


# ── helpers ───────────────────────────────────────────────────────────────────

async def create_wishlist(client, headers, title="My Wishlist", description=None):
    body = {"title": title}
    if description:
        body["description"] = description
    resp = await client.post("/api/wishlists/", json=body, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


# ── GET /my ───────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestMyWishlists:

    async def test_my_wishlists_empty(self, client):
        await register_user(client, "empty@example.com", "Empty", "password123")
        h = await auth_headers(client, "empty@example.com", "password123")
        resp = await client.get("/api/wishlists/my", headers=h)
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_my_wishlists_returns_created(self, client):
        await register_user(client, "owner@example.com", "Owner", "password123")
        h = await auth_headers(client, "owner@example.com", "password123")
        await create_wishlist(client, h, "Birthday List")
        resp = await client.get("/api/wishlists/my", headers=h)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["title"] == "Birthday List"

    async def test_my_wishlists_multiple(self, client):
        await register_user(client, "multi@example.com", "Multi", "password123")
        h = await auth_headers(client, "multi@example.com", "password123")
        await create_wishlist(client, h, "List A")
        await create_wishlist(client, h, "List B")
        resp = await client.get("/api/wishlists/my", headers=h)
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    async def test_my_wishlists_only_own(self, client):
        """User should only see their own wishlists."""
        await register_user(client, "a@example.com", "A", "password123")
        await register_user(client, "b@example.com", "B", "password123")
        ha = await auth_headers(client, "a@example.com", "password123")
        hb = await auth_headers(client, "b@example.com", "password123")
        await create_wishlist(client, ha, "A's List")
        await create_wishlist(client, hb, "B's List")

        resp_a = await client.get("/api/wishlists/my", headers=ha)
        resp_b = await client.get("/api/wishlists/my", headers=hb)
        assert len(resp_a.json()) == 1
        assert resp_a.json()[0]["title"] == "A's List"
        assert len(resp_b.json()) == 1
        assert resp_b.json()[0]["title"] == "B's List"

    async def test_my_wishlists_requires_auth(self, client):
        resp = await client.get("/api/wishlists/my")
        assert resp.status_code == 401

    async def test_my_wishlists_includes_item_count(self, client):
        await register_user(client, "count@example.com", "Count", "password123")
        h = await auth_headers(client, "count@example.com", "password123")
        wl = await create_wishlist(client, h, "Count List")
        slug = wl["slug"]

        # Add an item
        await client.post(
            f"/api/wishlists/{slug}/items/",
            json={"title": "Item 1"},
            headers=h,
        )

        resp = await client.get("/api/wishlists/my", headers=h)
        assert resp.json()[0]["item_count"] == 1


# ── POST / ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestCreateWishlist:

    async def test_create_basic(self, client):
        await register_user(client, "creator@example.com", "Creator", "password123")
        h = await auth_headers(client, "creator@example.com", "password123")
        resp = await client.post("/api/wishlists/", json={"title": "New List"}, headers=h)
        assert resp.status_code == 201
        data = resp.json()
        assert "id" in data
        assert "slug" in data

    async def test_create_with_description(self, client):
        await register_user(client, "desc@example.com", "Desc", "password123")
        h = await auth_headers(client, "desc@example.com", "password123")
        resp = await client.post(
            "/api/wishlists/",
            json={"title": "With Desc", "description": "A nice description"},
            headers=h,
        )
        assert resp.status_code == 201

    async def test_create_slug_contains_title(self, client):
        await register_user(client, "slug@example.com", "Slug", "password123")
        h = await auth_headers(client, "slug@example.com", "password123")
        resp = await create_wishlist(client, h, "My Birthday Party")
        assert "birthday" in resp["slug"] or "my" in resp["slug"]

    async def test_create_requires_auth(self, client):
        resp = await client.post("/api/wishlists/", json={"title": "No auth"})
        assert resp.status_code == 401

    async def test_create_empty_title(self, client):
        await register_user(client, "emptytitle@example.com", "ET", "password123")
        h = await auth_headers(client, "emptytitle@example.com", "password123")
        resp = await client.post("/api/wishlists/", json={"title": ""}, headers=h)
        assert resp.status_code == 422

    async def test_create_missing_title(self, client):
        await register_user(client, "notitle@example.com", "NT", "password123")
        h = await auth_headers(client, "notitle@example.com", "password123")
        resp = await client.post("/api/wishlists/", json={}, headers=h)
        assert resp.status_code == 422


# ── GET /{slug} ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestGetWishlist:

    async def test_get_own_wishlist(self, client):
        await register_user(client, "get@example.com", "Get", "password123")
        h = await auth_headers(client, "get@example.com", "password123")
        wl = await create_wishlist(client, h, "My List")
        resp = await client.get(f"/api/wishlists/{wl['slug']}", headers=h)
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "My List"
        assert data["is_owner"] is True

    async def test_get_not_found(self, client):
        resp = await client.get("/api/wishlists/nonexistent-slug-9999")
        assert resp.status_code == 404

    async def test_get_private_wishlist_by_owner(self, client):
        """Owner can always see their own private wishlist."""
        await register_user(client, "priv@example.com", "Priv", "password123")
        h = await auth_headers(client, "priv@example.com", "password123")
        wl = await create_wishlist(client, h, "Private List")
        slug = wl["slug"]

        # Make it explicitly private
        await client.put(f"/api/wishlists/{slug}", json={"is_public": False}, headers=h)

        resp = await client.get(f"/api/wishlists/{slug}", headers=h)
        assert resp.status_code == 200

    async def test_get_private_wishlist_by_guest_returns_404(self, client):
        """Private wishlist should be invisible to guests."""
        await register_user(client, "privowner@example.com", "PO", "password123")
        h = await auth_headers(client, "privowner@example.com", "password123")
        wl = await create_wishlist(client, h, "Secret List")
        slug = wl["slug"]

        # Make it private explicitly
        await client.put(f"/api/wishlists/{slug}", json={"is_public": False}, headers=h)

        # Guest (no auth) cannot see private wishlist
        resp = await client.get(f"/api/wishlists/{slug}")
        assert resp.status_code == 404

    async def test_get_public_wishlist_by_guest(self, client):
        """Public wishlist is accessible without auth."""
        await register_user(client, "pubowner@example.com", "PubOwner", "password123")
        h = await auth_headers(client, "pubowner@example.com", "password123")
        wl = await create_wishlist(client, h, "Public List")
        slug = wl["slug"]

        # Make it public
        await client.put(f"/api/wishlists/{slug}", json={"is_public": True}, headers=h)

        resp = await client.get(f"/api/wishlists/{slug}")
        assert resp.status_code == 200
        assert resp.json()["is_owner"] is False

    async def test_get_wishlist_owner_field(self, client):
        await register_user(client, "ownerfield@example.com", "OwnerField", "password123")
        h = await auth_headers(client, "ownerfield@example.com", "password123")
        wl = await create_wishlist(client, h, "Test")
        slug = wl["slug"]

        resp = await client.get(f"/api/wishlists/{slug}", headers=h)
        data = resp.json()
        assert "owner" in data
        assert data["owner"]["name"] == "OwnerField"
        assert "email" not in data["owner"]  # email is PII, should not be exposed


# ── PUT /{slug} ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestUpdateWishlist:

    async def test_update_title(self, client):
        await register_user(client, "upd@example.com", "Upd", "password123")
        h = await auth_headers(client, "upd@example.com", "password123")
        wl = await create_wishlist(client, h, "Old Title")
        slug = wl["slug"]

        resp = await client.put(f"/api/wishlists/{slug}", json={"title": "New Title"}, headers=h)
        assert resp.status_code == 200
        assert resp.json()["ok"] is True

    async def test_update_make_public(self, client):
        await register_user(client, "pub@example.com", "Pub", "password123")
        h = await auth_headers(client, "pub@example.com", "password123")
        wl = await create_wishlist(client, h, "Soon Public")
        slug = wl["slug"]

        resp = await client.put(f"/api/wishlists/{slug}", json={"is_public": True}, headers=h)
        assert resp.status_code == 200

        # Verify it's now accessible without auth
        pub_resp = await client.get(f"/api/wishlists/{slug}")
        assert pub_resp.status_code == 200

    async def test_update_not_owner(self, client):
        await register_user(client, "realowner@example.com", "RealOwner", "password123")
        await register_user(client, "notowner@example.com", "NotOwner", "password123")
        h_owner = await auth_headers(client, "realowner@example.com", "password123")
        h_other = await auth_headers(client, "notowner@example.com", "password123")

        wl = await create_wishlist(client, h_owner, "Owned List")
        slug = wl["slug"]

        resp = await client.put(f"/api/wishlists/{slug}", json={"title": "Hacked"}, headers=h_other)
        assert resp.status_code == 403

    async def test_update_not_found(self, client):
        await register_user(client, "updnf@example.com", "UpdNF", "password123")
        h = await auth_headers(client, "updnf@example.com", "password123")
        resp = await client.put("/api/wishlists/no-such-slug", json={"title": "X"}, headers=h)
        assert resp.status_code == 404

    async def test_update_requires_auth(self, client):
        resp = await client.put("/api/wishlists/any-slug", json={"title": "X"})
        assert resp.status_code == 401


# ── DELETE /{slug} ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestDeleteWishlist:

    async def test_delete_own_wishlist(self, client):
        await register_user(client, "del@example.com", "Del", "password123")
        h = await auth_headers(client, "del@example.com", "password123")
        wl = await create_wishlist(client, h, "To Delete")
        slug = wl["slug"]

        resp = await client.delete(f"/api/wishlists/{slug}", headers=h)
        assert resp.status_code == 204

        # Verify gone
        get_resp = await client.get(f"/api/wishlists/{slug}", headers=h)
        assert get_resp.status_code == 404

    async def test_delete_not_owner(self, client):
        await register_user(client, "delowner@example.com", "DelOwner", "password123")
        await register_user(client, "delother@example.com", "DelOther", "password123")
        h_owner = await auth_headers(client, "delowner@example.com", "password123")
        h_other = await auth_headers(client, "delother@example.com", "password123")

        wl = await create_wishlist(client, h_owner, "Protected")
        slug = wl["slug"]

        resp = await client.delete(f"/api/wishlists/{slug}", headers=h_other)
        assert resp.status_code == 403

    async def test_delete_not_found(self, client):
        await register_user(client, "delnf@example.com", "DelNF", "password123")
        h = await auth_headers(client, "delnf@example.com", "password123")
        resp = await client.delete("/api/wishlists/no-such-slug", headers=h)
        assert resp.status_code == 404

    async def test_delete_requires_auth(self, client):
        resp = await client.delete("/api/wishlists/any-slug")
        assert resp.status_code == 401

    async def test_delete_removed_from_my_list(self, client):
        await register_user(client, "delfrommy@example.com", "DelFromMy", "password123")
        h = await auth_headers(client, "delfrommy@example.com", "password123")
        wl = await create_wishlist(client, h, "Deletable")
        slug = wl["slug"]

        await client.delete(f"/api/wishlists/{slug}", headers=h)

        my_resp = await client.get("/api/wishlists/my", headers=h)
        assert my_resp.json() == []
