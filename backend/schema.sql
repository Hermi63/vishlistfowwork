-- Social Wishlist Database Schema

CREATE TYPE gift_status AS ENUM ('available', 'reserved', 'crowdfunding', 'funded');

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

CREATE TABLE wishlists (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date TIMESTAMPTZ,
    slug VARCHAR(255) UNIQUE NOT NULL,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wishlists_slug ON wishlists(slug);
CREATE INDEX idx_wishlists_owner ON wishlists(owner_id);

CREATE TABLE wishlist_items (
    id SERIAL PRIMARY KEY,
    wishlist_id INTEGER NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    url VARCHAR(2048),
    image_url VARCHAR(2048),
    price NUMERIC(12, 2),
    status gift_status DEFAULT 'available',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_items_wishlist ON wishlist_items(wishlist_id);

CREATE TABLE reservations (
    id SERIAL PRIMARY KEY,
    item_id INTEGER UNIQUE NOT NULL REFERENCES wishlist_items(id) ON DELETE CASCADE,
    reserved_by_name VARCHAR(255) NOT NULL,
    reserved_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE contributions (
    id SERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES wishlist_items(id) ON DELETE CASCADE,
    contributor_name VARCHAR(255) NOT NULL,
    contributor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contributions_item ON contributions(item_id);
