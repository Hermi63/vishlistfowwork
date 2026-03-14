"""
Unit tests for security utilities: password hashing and JWT tokens.
No database required.
"""
import time

import pytest

from app.core.security import (
    create_access_token,
    decode_token,
    hash_password,
    verify_password,
)


class TestPasswordHashing:
    def test_hash_is_not_plaintext(self):
        hashed = hash_password("secret123")
        assert hashed != "secret123"

    def test_verify_correct_password(self):
        hashed = hash_password("mysecret")
        assert verify_password("mysecret", hashed) is True

    def test_verify_wrong_password(self):
        hashed = hash_password("correct")
        assert verify_password("wrong", hashed) is False

    def test_different_hashes_for_same_password(self):
        """bcrypt should produce different salted hashes."""
        h1 = hash_password("same")
        h2 = hash_password("same")
        assert h1 != h2

    def test_empty_password_hashes(self):
        hashed = hash_password("")
        assert verify_password("", hashed) is True

    def test_unicode_password(self):
        hashed = hash_password("пароль123")
        assert verify_password("пароль123", hashed) is True
        assert verify_password("password123", hashed) is False


class TestJWT:
    def test_create_and_decode_token(self):
        token = create_access_token(42)
        assert isinstance(token, str)
        assert len(token) > 10
        user_id = decode_token(token)
        assert user_id == 42

    def test_decode_invalid_token(self):
        result = decode_token("totally.invalid.token")
        assert result is None

    def test_decode_empty_string(self):
        result = decode_token("")
        assert result is None

    def test_decode_tampered_token(self):
        token = create_access_token(1)
        # Tamper with the signature part
        parts = token.split(".")
        parts[2] = parts[2][:-5] + "XXXXX"
        tampered = ".".join(parts)
        assert decode_token(tampered) is None

    def test_different_user_ids(self):
        t1 = create_access_token(1)
        t2 = create_access_token(99)
        assert decode_token(t1) == 1
        assert decode_token(t2) == 99
        assert t1 != t2

    def test_token_is_string(self):
        token = create_access_token(1)
        assert isinstance(token, str)


class TestSlugGeneration:
    """Unit tests for wishlist slug generation logic."""

    def test_make_slug_basic(self):
        from app.routers.wishlists import _make_slug
        slug = _make_slug("My Birthday Wishlist", 5)
        assert slug == "my-birthday-wishlist-5"

    def test_make_slug_special_chars(self):
        from app.routers.wishlists import _make_slug
        slug = _make_slug("Hello! @World#", 1)
        assert "hello" in slug
        assert "world" in slug
        assert "1" in slug

    def test_make_slug_max_length(self):
        from app.routers.wishlists import _make_slug
        long_title = "A" * 200
        slug = _make_slug(long_title, 3)
        # base slug is max 50 chars + "-" + user_id
        assert len(slug) <= 55

    def test_make_slug_cyrillic(self):
        from app.routers.wishlists import _make_slug
        slug = _make_slug("Список желаний", 7)
        # python-slugify handles unicode
        assert "7" in slug
        assert " " not in slug
