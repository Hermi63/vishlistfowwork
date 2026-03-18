import ipaddress
import re
import socket
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

# Maximum allowed response body size (1 MB)
_MAX_BODY_BYTES = 1 * 1024 * 1024

_PRIVATE_NETWORKS = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),  # link-local / AWS metadata
    ipaddress.ip_network("100.64.0.0/10"),   # shared address space
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]


def _is_safe_url(url: str) -> bool:
    """Return True only for public http/https URLs that don't point at private IPs."""
    try:
        parsed = urlparse(url)
    except Exception:
        return False

    # Only allow http and https
    if parsed.scheme not in ("http", "https"):
        return False

    hostname = parsed.hostname
    if not hostname:
        return False

    # Reject localhost variants
    if hostname.lower() in ("localhost", "localhost.localdomain"):
        return False

    # Resolve hostname and check every returned address
    try:
        infos = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        return False

    for info in infos:
        addr_str = info[4][0]
        try:
            addr = ipaddress.ip_address(addr_str)
        except ValueError:
            return False
        for net in _PRIVATE_NETWORKS:
            if addr in net:
                return False

    return True


async def fetch_link_preview(url: str) -> dict:
    result = {"title": None, "image": None, "price": None, "description": None}

    if not _is_safe_url(url):
        return result

    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=10,
            max_redirects=3,
        ) as client:
            async with client.stream(
                "GET",
                url,
                headers={
                    "User-Agent": (
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/124.0.0.0 Safari/537.36"
                    ),
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.5",
                },
            ) as resp:
                resp.raise_for_status()
                # Enforce size limit — read at most _MAX_BODY_BYTES
                chunks = []
                total = 0
                async for chunk in resp.aiter_bytes():
                    total += len(chunk)
                    if total > _MAX_BODY_BYTES:
                        break
                    chunks.append(chunk)
                body = b"".join(chunks).decode("utf-8", errors="replace")
    except Exception:
        return result

    soup = BeautifulSoup(body, "html.parser")

    def _meta_content(tag):
        """Извлечь content из мета-тега."""
        if tag and tag.get("content"):
            return tag["content"].strip()
        return None

    def _to_absolute(src: str | None) -> str | None:
        """Преобразовать относительный URL в абсолютный."""
        if not src:
            return None
        src = src.strip()
        if src.startswith(("http://", "https://")):
            return src
        if src.startswith("//"):
            return "https:" + src
        return urljoin(url, src)

    # OpenGraph (проверяем и property, и name — сайты используют оба варианта)
    og_title = soup.find("meta", property="og:title") or soup.find("meta", attrs={"name": "og:title"})
    og_image = soup.find("meta", property="og:image") or soup.find("meta", attrs={"name": "og:image"})
    og_desc = soup.find("meta", property="og:description") or soup.find("meta", attrs={"name": "og:description"})

    result["title"] = _meta_content(og_title)
    result["image"] = _to_absolute(_meta_content(og_image))
    result["description"] = _meta_content(og_desc)

    # Фоллбэк для title — <title> тег
    if not result["title"]:
        title_tag = soup.find("title")
        if title_tag:
            result["title"] = title_tag.get_text(strip=True)

    # Фоллбэки для изображения если og:image не найден
    if not result["image"]:
        # twitter:image
        tw_image = soup.find("meta", attrs={"name": "twitter:image"}) or soup.find("meta", property="twitter:image")
        if tw_image:
            result["image"] = _to_absolute(_meta_content(tw_image))

    if not result["image"]:
        # itemprop="image" (Schema.org)
        schema_img = soup.find("meta", attrs={"itemprop": "image"})
        if schema_img:
            result["image"] = _to_absolute(_meta_content(schema_img))

    if not result["image"]:
        # Первый достаточно большой <img> тег на странице (вероятно фото товара)
        for img_tag in soup.find_all("img", src=True, limit=10):
            src = img_tag.get("src", "")
            # Пропускаем крошечные иконки, трекеры и data-URI
            if any(skip in src.lower() for skip in ("1x1", "pixel", "track", "data:image", ".svg", "logo", "icon")):
                continue
            result["image"] = _to_absolute(src)
            break

    # Цена
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
