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

_BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.5",
}


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


# ---------------------------------------------------------------------------
# Специальные парсеры для магазинов с антибот-защитой
# ---------------------------------------------------------------------------

def _wb_image_url(nm: int) -> str:
    """Сформировать URL изображения Wildberries по ID товара."""
    vol = nm // 100000
    part = nm // 1000
    # Маппинг vol -> basket номер (актуально на 2025)
    basket_ranges = [
        (143, "01"), (287, "02"), (431, "03"), (719, "04"),
        (1007, "05"), (1061, "06"), (1115, "07"), (1169, "08"),
        (1313, "09"), (1601, "10"), (1655, "11"), (1919, "12"),
        (2045, "13"), (2189, "14"), (2405, "15"), (2621, "16"),
        (2837, "17"),
    ]
    basket = "18"
    for threshold, b in basket_ranges:
        if vol <= threshold:
            basket = b
            break
    return f"https://basket-{basket}.wbbasket.ru/vol{vol}/part{part}/{nm}/images/big/1.webp"


def _try_wildberries(url: str, result: dict) -> bool:
    """Извлечь данные из URL Wildberries без HTTP-запроса к сайту."""
    parsed = urlparse(url)
    if "wildberries.ru" not in parsed.hostname:
        return False

    # Извлекаем ID товара из URL: /catalog/194571866/detail.aspx
    match = re.search(r"/catalog/(\d+)", parsed.path)
    if not match:
        return False

    nm = int(match.group(1))
    result["image"] = _wb_image_url(nm)
    return True


async def _try_wb_api(url: str, result: dict, client: httpx.AsyncClient) -> bool:
    """Получить название и цену через внутренний API Wildberries."""
    parsed = urlparse(url)
    if "wildberries.ru" not in parsed.hostname:
        return False

    match = re.search(r"/catalog/(\d+)", parsed.path)
    if not match:
        return False

    nm = match.group(1)
    try:
        api_url = f"https://card.wb.ru/cards/v2/detail?appType=1&curr=rub&dest=-1257786&nm={nm}"
        resp = await client.get(api_url, headers=_BROWSER_HEADERS)
        data = resp.json()
        products = data.get("data", {}).get("products", [])
        if products:
            p = products[0]
            if not result["title"] and p.get("name"):
                brand = p.get("brand", "")
                name = p["name"]
                result["title"] = f"{brand} {name}".strip() if brand else name
            if not result["price"]:
                sizes = p.get("sizes", [])
                if sizes:
                    price = sizes[0].get("price", {}).get("total", 0)
                    if price:
                        result["price"] = str(price // 100)
        return True
    except Exception:
        return False


async def _try_ozon_api(url: str, result: dict, client: httpx.AsyncClient) -> bool:
    """Попытаться получить данные Ozon через мобильный API."""
    parsed = urlparse(url)
    if "ozon.ru" not in parsed.hostname:
        return False

    # Извлекаем slug товара из URL
    match = re.search(r"/product/[^/]*?-(\d+)/?", parsed.path)
    if not match:
        return False

    return False  # Ozon API требует авторизацию, обрабатываем через microlink


async def _try_microlink(url: str, result: dict, client: httpx.AsyncClient) -> bool:
    """Фоллбэк через microlink.io API (бесплатный, без ключа)."""
    try:
        api_url = f"https://api.microlink.io/?url={url}"
        resp = await client.get(api_url, timeout=15)
        if resp.status_code != 200:
            return False
        data = resp.json()
        if data.get("status") != "success":
            return False

        d = data.get("data") or {}
        if not result["title"] and d.get("title"):
            result["title"] = d["title"]
        if not result["description"] and d.get("description"):
            result["description"] = d["description"]

        # Изображение может быть dict с url или строка
        img = d.get("image")
        if not result["image"] and img:
            if isinstance(img, dict):
                result["image"] = img.get("url")
            elif isinstance(img, str):
                result["image"] = img

        return True
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Основная функция парсинга
# ---------------------------------------------------------------------------

def _validate_redirect(response: httpx.Response) -> None:
    """Проверка каждого редиректа на SSRF — предотвращает DNS rebinding атаки.

    При follow_redirects httpx может перейти на внутренний IP после первичной
    проверки публичного хоста. Эта функция вызывается как event_hook на каждый ответ.
    """
    if response.is_redirect:
        location = response.headers.get("location", "")
        if location and not _is_safe_url(location):
            raise httpx.RequestError(
                f"Редирект на небезопасный URL заблокирован: {location}",
                request=response.request,
            )


async def fetch_link_preview(url: str) -> dict:
    result = {"title": None, "image": None, "price": None, "description": None}

    if not _is_safe_url(url):
        return result

    # Шаг 1: Для WB сразу формируем URL картинки (не требует запроса)
    _try_wildberries(url, result)

    # Шаг 2: Прямой парсинг HTML страницы
    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=10,
            max_redirects=3,
            # Безопасность: проверяем каждый редирект на SSRF
            event_hooks={"response": [_validate_redirect]},
        ) as client:
            async with client.stream(
                "GET",
                url,
                headers=_BROWSER_HEADERS,
            ) as resp:
                resp.raise_for_status()
                chunks = []
                total = 0
                async for chunk in resp.aiter_bytes():
                    total += len(chunk)
                    if total > _MAX_BODY_BYTES:
                        break
                    chunks.append(chunk)
                body = b"".join(chunks).decode("utf-8", errors="replace")

            _parse_html(url, body, result)

            # Шаг 3: Для WB — получаем название и цену через API
            await _try_wb_api(url, result, client)

            # Шаг 4: Если изображения всё ещё нет — microlink.io фоллбэк
            if not result["image"]:
                await _try_microlink(url, result, client)

    except Exception:
        # Если прямой запрос провалился (403, таймаут и т.д.),
        # пробуем через microlink как единственный источник
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                # Для WB — API для названия/цены
                await _try_wb_api(url, result, client)
                # microlink для остальных данных
                await _try_microlink(url, result, client)
        except Exception:
            pass

    return result


def _parse_html(base_url: str, body: str, result: dict) -> None:
    """Извлечь метаданные из HTML."""
    soup = BeautifulSoup(body, "html.parser")

    def _meta_content(tag):
        if tag and tag.get("content"):
            return tag["content"].strip()
        return None

    def _to_absolute(src: str | None) -> str | None:
        if not src:
            return None
        src = src.strip()
        if src.startswith(("http://", "https://")):
            return src
        if src.startswith("//"):
            return "https:" + src
        return urljoin(base_url, src)

    # OpenGraph (проверяем и property, и name)
    og_title = soup.find("meta", property="og:title") or soup.find("meta", attrs={"name": "og:title"})
    og_image = soup.find("meta", property="og:image") or soup.find("meta", attrs={"name": "og:image"})
    og_desc = soup.find("meta", property="og:description") or soup.find("meta", attrs={"name": "og:description"})

    if not result["title"]:
        result["title"] = _meta_content(og_title)
    if not result["image"]:
        result["image"] = _to_absolute(_meta_content(og_image))
    if not result["description"]:
        result["description"] = _meta_content(og_desc)

    # Фоллбэк для title
    if not result["title"]:
        title_tag = soup.find("title")
        if title_tag:
            result["title"] = title_tag.get_text(strip=True)

    # Фоллбэки для изображения
    if not result["image"]:
        tw_image = soup.find("meta", attrs={"name": "twitter:image"}) or soup.find("meta", property="twitter:image")
        if tw_image:
            result["image"] = _to_absolute(_meta_content(tw_image))

    if not result["image"]:
        schema_img = soup.find("meta", attrs={"itemprop": "image"})
        if schema_img:
            result["image"] = _to_absolute(_meta_content(schema_img))

    if not result["image"]:
        for img_tag in soup.find_all("img", src=True, limit=10):
            src = img_tag.get("src", "")
            if any(skip in src.lower() for skip in ("1x1", "pixel", "track", "data:image", ".svg", "logo", "icon")):
                continue
            result["image"] = _to_absolute(src)
            break

    # Цена
    if not result["price"]:
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
