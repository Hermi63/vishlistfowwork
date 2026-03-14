import re

import httpx
from bs4 import BeautifulSoup


async def fetch_link_preview(url: str) -> dict:
    result = {"title": None, "image": None, "price": None, "description": None}
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=10) as client:
            resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0 (compatible; WishListBot/1.0)"})
            resp.raise_for_status()
    except Exception:
        return result

    soup = BeautifulSoup(resp.text, "html.parser")

    # OpenGraph
    og_title = soup.find("meta", property="og:title")
    og_image = soup.find("meta", property="og:image")
    og_desc = soup.find("meta", property="og:description")

    result["title"] = og_title["content"] if og_title and og_title.get("content") else None
    result["image"] = og_image["content"] if og_image and og_image.get("content") else None
    result["description"] = og_desc["content"] if og_desc and og_desc.get("content") else None

    if not result["title"]:
        title_tag = soup.find("title")
        if title_tag:
            result["title"] = title_tag.get_text(strip=True)

    # Try to find price
    og_price = soup.find("meta", property="og:price:amount") or soup.find(
        "meta", property="product:price:amount"
    )
    if og_price and og_price.get("content"):
        result["price"] = og_price["content"]
    else:
        price_patterns = [
            r'[\$€£₽]\s*[\d\s,.]+',
            r'[\d\s,.]+\s*(?:руб|₽|\$|€|£)',
        ]
        text = soup.get_text()
        for pat in price_patterns:
            match = re.search(pat, text)
            if match:
                result["price"] = match.group(0).strip()
                break

    return result
