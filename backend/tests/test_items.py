"""
Integration tests for item endpoints:
  POST   /api/wishlists/{slug}/items/
  PUT    /api/wishlists/{slug}/items/{item_id}
  DELETE /api/wishlists/{slug}/items/{item_id}
  POST   /api/wishlists/{slug}/items/{item_id}/reserve
  DELETE /api/wishlists/{slug}/items/{item_id}/reserve
  POST   /api/wishlists/{slug}/items/{item_id}/contribute
  DELETE /api/wishlists/{slug}/items/{item_id}/contribute/{contribution_id}
"""
import pytest

from tests.conftest import auth_headers, register_user


# ── helpers ───────────────────────────────────────────────────────────────────

async def setup_user(client, email, name="User", password="password123"):
    await register_user(client, email, name, password)
    h = await auth_headers(client, email, password)
    return h


async def create_wishlist(client, headers, title="Test Wishlist"):
    resp = await client.post("/api/wishlists/", json={"title": title}, headers=headers)
    assert resp.status_code == 201
    return resp.json()


async def add_item(client, headers, slug, title="Test Item", price=None):
    body = {"title": title}
    if price is not None:
        body["price"] = price
    resp = await client.post(f"/api/wishlists/{slug}/items/", json=body, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def make_public(client, headers, slug):
    await client.put(f"/api/wishlists/{slug}", json={"is_public": True}, headers=headers)


# ── POST /items/ ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestAddItem:

    async def test_add_item_basic(self, client):
        h = await setup_user(client, "additem@example.com")
        wl = await create_wishlist(client, h)
        slug = wl["slug"]

        resp = await client.post(
            f"/api/wishlists/{slug}/items/",
            json={"title": "My Gift"},
            headers=h,
        )
        assert resp.status_code == 201
        assert "id" in resp.json()

    async def test_add_item_with_all_fields(self, client):
        h = await setup_user(client, "allfields@example.com")
        wl = await create_wishlist(client, h)
        slug = wl["slug"]

        resp = await client.post(
            f"/api/wishlists/{slug}/items/",
            json={
                "title": "Full Item",
                "description": "A detailed description",
                "url": "https://example.com/product",
                "image_url": "https://example.com/img.jpg",
                "price": 99.99,
            },
            headers=h,
        )
        assert resp.status_code == 201

    async def test_add_item_not_owner(self, client):
        h_owner = await setup_user(client, "owner_add@example.com")
        h_other = await setup_user(client, "other_add@example.com")
        wl = await create_wishlist(client, h_owner)
        slug = wl["slug"]

        resp = await client.post(
            f"/api/wishlists/{slug}/items/",
            json={"title": "Stolen item"},
            headers=h_other,
        )
        assert resp.status_code == 403

    async def test_add_item_requires_auth(self, client):
        h = await setup_user(client, "noauth_item@example.com")
        wl = await create_wishlist(client, h)
        resp = await client.post(
            f"/api/wishlists/{wl['slug']}/items/",
            json={"title": "Anon Item"},
        )
        assert resp.status_code == 401

    async def test_add_item_empty_title(self, client):
        h = await setup_user(client, "emptytitleitem@example.com")
        wl = await create_wishlist(client, h)
        resp = await client.post(
            f"/api/wishlists/{wl['slug']}/items/",
            json={"title": ""},
            headers=h,
        )
        assert resp.status_code == 422

    async def test_add_item_nonexistent_wishlist(self, client):
        h = await setup_user(client, "nolist@example.com")
        resp = await client.post(
            "/api/wishlists/no-such-slug/items/",
            json={"title": "Ghost"},
            headers=h,
        )
        assert resp.status_code == 404

    async def test_add_item_negative_price(self, client):
        h = await setup_user(client, "negprice@example.com")
        wl = await create_wishlist(client, h)
        resp = await client.post(
            f"/api/wishlists/{wl['slug']}/items/",
            json={"title": "Neg price", "price": -5.0},
            headers=h,
        )
        assert resp.status_code == 422

    async def test_add_item_appears_in_wishlist(self, client):
        h = await setup_user(client, "appears@example.com")
        wl = await create_wishlist(client, h)
        slug = wl["slug"]
        await add_item(client, h, slug, "Visible Item")

        resp = await client.get(f"/api/wishlists/{slug}", headers=h)
        items = resp.json()["items"]
        assert len(items) == 1
        assert items[0]["title"] == "Visible Item"


# ── PUT /items/{item_id} ──────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestUpdateItem:

    async def test_update_item_title(self, client):
        h = await setup_user(client, "upd_item@example.com")
        wl = await create_wishlist(client, h)
        slug = wl["slug"]
        item = await add_item(client, h, slug, "Old Title")

        resp = await client.put(
            f"/api/wishlists/{slug}/items/{item['id']}",
            json={"title": "New Title"},
            headers=h,
        )
        assert resp.status_code == 200
        assert resp.json()["ok"] is True

    async def test_update_item_not_owner(self, client):
        h_owner = await setup_user(client, "owner_upd@example.com")
        h_other = await setup_user(client, "other_upd@example.com")
        wl = await create_wishlist(client, h_owner)
        slug = wl["slug"]
        item = await add_item(client, h_owner, slug)

        resp = await client.put(
            f"/api/wishlists/{slug}/items/{item['id']}",
            json={"title": "Hacked"},
            headers=h_other,
        )
        assert resp.status_code == 403

    async def test_update_item_not_found(self, client):
        h = await setup_user(client, "updnf@example.com")
        wl = await create_wishlist(client, h)
        slug = wl["slug"]

        resp = await client.put(
            f"/api/wishlists/{slug}/items/99999",
            json={"title": "Ghost"},
            headers=h,
        )
        assert resp.status_code == 404

    async def test_update_item_price(self, client):
        h = await setup_user(client, "upd_price@example.com")
        wl = await create_wishlist(client, h)
        slug = wl["slug"]
        item = await add_item(client, h, slug, price=50.0)

        resp = await client.put(
            f"/api/wishlists/{slug}/items/{item['id']}",
            json={"price": 99.99},
            headers=h,
        )
        assert resp.status_code == 200


# ── DELETE /items/{item_id} ───────────────────────────────────────────────────

@pytest.mark.asyncio
class TestDeleteItem:

    async def test_delete_item(self, client):
        h = await setup_user(client, "del_item@example.com")
        wl = await create_wishlist(client, h)
        slug = wl["slug"]
        item = await add_item(client, h, slug)

        resp = await client.delete(
            f"/api/wishlists/{slug}/items/{item['id']}",
            headers=h,
        )
        assert resp.status_code == 204

        # Verify it's gone
        wl_resp = await client.get(f"/api/wishlists/{slug}", headers=h)
        assert wl_resp.json()["items"] == []

    async def test_delete_item_not_owner(self, client):
        h_owner = await setup_user(client, "owner_del@example.com")
        h_other = await setup_user(client, "other_del@example.com")
        wl = await create_wishlist(client, h_owner)
        slug = wl["slug"]
        item = await add_item(client, h_owner, slug)

        resp = await client.delete(
            f"/api/wishlists/{slug}/items/{item['id']}",
            headers=h_other,
        )
        assert resp.status_code == 403

    async def test_delete_item_requires_auth(self, client):
        h = await setup_user(client, "del_noauth@example.com")
        wl = await create_wishlist(client, h)
        slug = wl["slug"]
        item = await add_item(client, h, slug)

        resp = await client.delete(f"/api/wishlists/{slug}/items/{item['id']}")
        assert resp.status_code == 401


# ── POST /items/{item_id}/reserve ─────────────────────────────────────────────

@pytest.mark.asyncio
class TestReserveItem:

    async def test_reserve_as_guest(self, client):
        h_owner = await setup_user(client, "res_owner@example.com")
        wl = await create_wishlist(client, h_owner)
        slug = wl["slug"]
        item = await add_item(client, h_owner, slug)
        await make_public(client, h_owner, slug)

        resp = await client.post(
            f"/api/wishlists/{slug}/items/{item['id']}/reserve",
            json={"name": "Anonymous Friend"},
        )
        assert resp.status_code == 200
        assert resp.json()["ok"] is True

    async def test_reserve_as_authenticated_user(self, client):
        h_owner = await setup_user(client, "res_owner2@example.com")
        h_friend = await setup_user(client, "res_friend@example.com")
        wl = await create_wishlist(client, h_owner)
        slug = wl["slug"]
        item = await add_item(client, h_owner, slug)
        await make_public(client, h_owner, slug)

        resp = await client.post(
            f"/api/wishlists/{slug}/items/{item['id']}/reserve",
            json={"name": "My Friend"},
            headers=h_friend,
        )
        assert resp.status_code == 200

    async def test_owner_cannot_reserve_own_gift(self, client):
        h = await setup_user(client, "owner_res@example.com")
        wl = await create_wishlist(client, h)
        slug = wl["slug"]
        item = await add_item(client, h, slug)

        resp = await client.post(
            f"/api/wishlists/{slug}/items/{item['id']}/reserve",
            json={"name": "Owner Self"},
            headers=h,
        )
        assert resp.status_code == 403

    async def test_cannot_reserve_already_reserved(self, client):
        h_owner = await setup_user(client, "double_res_owner@example.com")
        wl = await create_wishlist(client, h_owner)
        slug = wl["slug"]
        item = await add_item(client, h_owner, slug)
        await make_public(client, h_owner, slug)

        # First reservation
        await client.post(
            f"/api/wishlists/{slug}/items/{item['id']}/reserve",
            json={"name": "Friend One"},
        )

        # Second reservation should fail
        resp = await client.post(
            f"/api/wishlists/{slug}/items/{item['id']}/reserve",
            json={"name": "Friend Two"},
        )
        assert resp.status_code == 409

    async def test_reserve_nonexistent_item(self, client):
        h = await setup_user(client, "res_noitem@example.com")
        wl = await create_wishlist(client, h)
        slug = wl["slug"]

        resp = await client.post(
            f"/api/wishlists/{slug}/items/99999/reserve",
            json={"name": "Anyone"},
        )
        assert resp.status_code == 404

    async def test_reserved_item_status_in_wishlist(self, client):
        """Owner sees reservation=None (privacy), guest sees reserved status."""
        h_owner = await setup_user(client, "res_status_owner@example.com")
        wl = await create_wishlist(client, h_owner)
        slug = wl["slug"]
        item = await add_item(client, h_owner, slug)
        await make_public(client, h_owner, slug)

        await client.post(
            f"/api/wishlists/{slug}/items/{item['id']}/reserve",
            json={"name": "Secret Friend"},
        )

        # Owner should not see who reserved (privacy)
        owner_resp = await client.get(f"/api/wishlists/{slug}", headers=h_owner)
        owner_item = owner_resp.json()["items"][0]
        assert owner_item["reservation"] is None
        assert owner_item["status"] == "reserved"

        # Guest sees the reservation
        guest_resp = await client.get(f"/api/wishlists/{slug}")
        guest_item = guest_resp.json()["items"][0]
        assert guest_item["reservation"] is not None
        assert guest_item["reservation"]["reserved_by_name"] == "Secret Friend"


# ── DELETE /items/{item_id}/reserve ──────────────────────────────────────────

@pytest.mark.asyncio
class TestUnreserveItem:

    async def test_unreserve_as_same_auth_user(self, client):
        h_owner = await setup_user(client, "unres_owner@example.com")
        h_friend = await setup_user(client, "unres_friend@example.com")
        wl = await create_wishlist(client, h_owner)
        slug = wl["slug"]
        item = await add_item(client, h_owner, slug)
        await make_public(client, h_owner, slug)

        await client.post(
            f"/api/wishlists/{slug}/items/{item['id']}/reserve",
            json={"name": "Friend"},
            headers=h_friend,
        )

        resp = await client.delete(
            f"/api/wishlists/{slug}/items/{item['id']}/reserve",
            headers=h_friend,
        )
        assert resp.status_code == 200

    async def test_unreserve_by_wrong_user(self, client):
        h_owner = await setup_user(client, "unres_owner2@example.com")
        h_friend = await setup_user(client, "unres_friend2@example.com")
        h_other = await setup_user(client, "unres_other2@example.com")
        wl = await create_wishlist(client, h_owner)
        slug = wl["slug"]
        item = await add_item(client, h_owner, slug)
        await make_public(client, h_owner, slug)

        await client.post(
            f"/api/wishlists/{slug}/items/{item['id']}/reserve",
            json={"name": "Friend"},
            headers=h_friend,
        )

        resp = await client.delete(
            f"/api/wishlists/{slug}/items/{item['id']}/reserve",
            headers=h_other,
        )
        assert resp.status_code == 403

    async def test_unreserve_not_reserved(self, client):
        h = await setup_user(client, "unres_notres@example.com")
        wl = await create_wishlist(client, h)
        slug = wl["slug"]
        item = await add_item(client, h, slug)

        resp = await client.delete(
            f"/api/wishlists/{slug}/items/{item['id']}/reserve",
        )
        assert resp.status_code == 404


# ── POST /items/{item_id}/contribute ─────────────────────────────────────────

@pytest.mark.asyncio
class TestContribute:

    async def test_contribute_basic(self, client):
        h_owner = await setup_user(client, "contrib_owner@example.com")
        wl = await create_wishlist(client, h_owner)
        slug = wl["slug"]
        item = await add_item(client, h_owner, slug, price=100.0)
        await make_public(client, h_owner, slug)

        resp = await client.post(
            f"/api/wishlists/{slug}/items/{item['id']}/contribute",
            json={"name": "Contributor", "amount": 25.0},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["ok"] is True
        assert data["total"] == pytest.approx(25.0)

    async def test_contribute_reaches_funded_status(self, client):
        h_owner = await setup_user(client, "funded_owner@example.com")
        wl = await create_wishlist(client, h_owner)
        slug = wl["slug"]
        item = await add_item(client, h_owner, slug, price=50.0)
        await make_public(client, h_owner, slug)

        resp = await client.post(
            f"/api/wishlists/{slug}/items/{item['id']}/contribute",
            json={"name": "BigSpender", "amount": 50.0},
        )
        assert resp.status_code == 200

        wl_resp = await client.get(f"/api/wishlists/{slug}")
        item_data = wl_resp.json()["items"][0]
        assert item_data["status"] == "funded"

    async def test_owner_cannot_contribute(self, client):
        h = await setup_user(client, "owner_contrib@example.com")
        wl = await create_wishlist(client, h)
        slug = wl["slug"]
        item = await add_item(client, h, slug, price=100.0)

        resp = await client.post(
            f"/api/wishlists/{slug}/items/{item['id']}/contribute",
            json={"name": "Self", "amount": 10.0},
            headers=h,
        )
        assert resp.status_code == 403

    async def test_cannot_contribute_to_reserved_item(self, client):
        h_owner = await setup_user(client, "no_contrib_res@example.com")
        wl = await create_wishlist(client, h_owner)
        slug = wl["slug"]
        item = await add_item(client, h_owner, slug)
        await make_public(client, h_owner, slug)

        # Reserve it first
        await client.post(
            f"/api/wishlists/{slug}/items/{item['id']}/reserve",
            json={"name": "Reserver"},
        )

        # Contribution should fail
        resp = await client.post(
            f"/api/wishlists/{slug}/items/{item['id']}/contribute",
            json={"name": "Contributor", "amount": 10.0},
        )
        assert resp.status_code == 409

    async def test_contribute_amount_zero(self, client):
        h_owner = await setup_user(client, "zero_contrib@example.com")
        wl = await create_wishlist(client, h_owner)
        slug = wl["slug"]
        item = await add_item(client, h_owner, slug)
        await make_public(client, h_owner, slug)

        resp = await client.post(
            f"/api/wishlists/{slug}/items/{item['id']}/contribute",
            json={"name": "Zero", "amount": 0},
        )
        assert resp.status_code == 422

    async def test_contribute_negative_amount(self, client):
        h_owner = await setup_user(client, "neg_contrib@example.com")
        wl = await create_wishlist(client, h_owner)
        slug = wl["slug"]
        item = await add_item(client, h_owner, slug)

        resp = await client.post(
            f"/api/wishlists/{slug}/items/{item['id']}/contribute",
            json={"name": "Negative", "amount": -10.0},
        )
        assert resp.status_code == 422

    async def test_multiple_contributions_sum_correctly(self, client):
        h_owner = await setup_user(client, "multi_contrib@example.com")
        wl = await create_wishlist(client, h_owner)
        slug = wl["slug"]
        item = await add_item(client, h_owner, slug, price=100.0)
        await make_public(client, h_owner, slug)

        await client.post(
            f"/api/wishlists/{slug}/items/{item['id']}/contribute",
            json={"name": "A", "amount": 30.0},
        )
        resp = await client.post(
            f"/api/wishlists/{slug}/items/{item['id']}/contribute",
            json={"name": "B", "amount": 20.0},
        )
        assert resp.json()["total"] == pytest.approx(50.0)

    async def test_owner_does_not_see_contributors(self, client):
        """Owner should not see contribution details (surprise preservation)."""
        h_owner = await setup_user(client, "priv_contrib_owner@example.com")
        wl = await create_wishlist(client, h_owner)
        slug = wl["slug"]
        item = await add_item(client, h_owner, slug, price=100.0)
        await make_public(client, h_owner, slug)

        await client.post(
            f"/api/wishlists/{slug}/items/{item['id']}/contribute",
            json={"name": "Secret Contributor", "amount": 10.0},
        )

        owner_resp = await client.get(f"/api/wishlists/{slug}", headers=h_owner)
        owner_item = owner_resp.json()["items"][0]
        assert owner_item["contributions"] == []

        # Guest sees contributions
        guest_resp = await client.get(f"/api/wishlists/{slug}")
        guest_item = guest_resp.json()["items"][0]
        assert len(guest_item["contributions"]) == 1
        assert guest_item["contributions"][0]["contributor_name"] == "Secret Contributor"


# ── DELETE /items/{item_id}/contribute/{contribution_id} ─────────────────────

@pytest.mark.asyncio
class TestRemoveContribution:

    async def test_remove_anonymous_contribution(self, client):
        h_owner = await setup_user(client, "rm_contrib_owner@example.com")
        wl = await create_wishlist(client, h_owner)
        slug = wl["slug"]
        item = await add_item(client, h_owner, slug, price=100.0)
        await make_public(client, h_owner, slug)

        contrib_resp = await client.post(
            f"/api/wishlists/{slug}/items/{item['id']}/contribute",
            json={"name": "Anon", "amount": 10.0},
        )
        assert contrib_resp.status_code == 200

        # Get contribution id from wishlist
        wl_resp = await client.get(f"/api/wishlists/{slug}")
        contrib_id = wl_resp.json()["items"][0]["contributions"][0]["id"]

        resp = await client.delete(
            f"/api/wishlists/{slug}/items/{item['id']}/contribute/{contrib_id}",
        )
        assert resp.status_code == 200
        assert resp.json()["total"] == pytest.approx(0.0)

    async def test_remove_auth_contribution_by_same_user(self, client):
        h_owner = await setup_user(client, "rm_auth_contrib_owner@example.com")
        h_friend = await setup_user(client, "rm_auth_contrib_friend@example.com")
        wl = await create_wishlist(client, h_owner)
        slug = wl["slug"]
        item = await add_item(client, h_owner, slug, price=100.0)
        await make_public(client, h_owner, slug)

        await client.post(
            f"/api/wishlists/{slug}/items/{item['id']}/contribute",
            json={"name": "Friend", "amount": 15.0},
            headers=h_friend,
        )

        wl_resp = await client.get(f"/api/wishlists/{slug}")
        contrib_id = wl_resp.json()["items"][0]["contributions"][0]["id"]

        resp = await client.delete(
            f"/api/wishlists/{slug}/items/{item['id']}/contribute/{contrib_id}",
            headers=h_friend,
        )
        assert resp.status_code == 200

    async def test_remove_contribution_by_wrong_user(self, client):
        h_owner = await setup_user(client, "rm_wrong_owner@example.com")
        h_friend = await setup_user(client, "rm_wrong_friend@example.com")
        h_other = await setup_user(client, "rm_wrong_other@example.com")
        wl = await create_wishlist(client, h_owner)
        slug = wl["slug"]
        item = await add_item(client, h_owner, slug, price=100.0)
        await make_public(client, h_owner, slug)

        await client.post(
            f"/api/wishlists/{slug}/items/{item['id']}/contribute",
            json={"name": "Friend", "amount": 15.0},
            headers=h_friend,
        )

        wl_resp = await client.get(f"/api/wishlists/{slug}")
        contrib_id = wl_resp.json()["items"][0]["contributions"][0]["id"]

        resp = await client.delete(
            f"/api/wishlists/{slug}/items/{item['id']}/contribute/{contrib_id}",
            headers=h_other,
        )
        assert resp.status_code == 403

    async def test_remove_nonexistent_contribution(self, client):
        h = await setup_user(client, "rm_nonexist@example.com")
        wl = await create_wishlist(client, h)
        slug = wl["slug"]
        item = await add_item(client, h, slug)

        resp = await client.delete(
            f"/api/wishlists/{slug}/items/{item['id']}/contribute/99999",
        )
        assert resp.status_code == 404
