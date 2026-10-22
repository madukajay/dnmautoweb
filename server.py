#!/usr/bin/env python3
"""DNM Auto — BeForward auction sold prices. Run: python3 server.py

The Node server in server.mjs serves the same API on port 4174.
"""

import datetime
import json
import re
import ssl
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT / "public"
HOST = "127.0.0.1"
PORT = 4173
PAGE = "https://beforward.aleado.com/stats/?p=project/findlots&s&ld"
PAGE_SIZE = 100

_lock = threading.Lock()
_cache = {}


def ssl_context():
    for cafile in (
        "/etc/ssl/cert.pem",
        "/private/etc/ssl/cert.pem",
        "/opt/homebrew/etc/ca-certificates/cert.pem",
    ):
        if Path(cafile).exists():
            return ssl.create_default_context(cafile=cafile)
    return ssl.create_default_context()


CTX = ssl_context()


def session_cookie():
    raw = (ROOT / ".env").read_text().strip()
    if raw.lower().startswith("cookie:"):
        raw = raw.split(":", 1)[1].strip()
    return raw


def aleado(url, data=None):
    request = urllib.request.Request(
        url,
        data=data,
        headers={
            "User-Agent": "Mozilla/5.0",
            "Cookie": session_cookie(),
            "Referer": PAGE,
            "Accept": "*/*",
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=60, context=CTX) as response:
            body = response.read().decode("utf-8", "replace")
            return response.status, body
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", "replace")
        return error.code, body
    except urllib.error.URLError as error:
        return 502, str(error.reason)


def member_wall(body):
    return "only to members" in body.lower()


def sajax(func, args):
    parts = [
        "p=project/findlots",
        "s",
        "ld",
        "rs=" + urllib.parse.quote(func),
        "rst=",
        "rsrnd=" + str(int(time.time() * 1000)),
    ]
    for arg in args:
        parts.append("rsargs[]=" + urllib.parse.quote(str(arg)))
    status, body = aleado("https://beforward.aleado.com/stats/?" + "&".join(parts))
    if status != 200:
        return status, body
    if member_wall(body):
        return 401, body
    if body.startswith("-"):
        return 502, body[2:]
    return 200, body


def split_name(text):
    text = text.replace("\\/", "/").strip()
    match = re.match(r"^(.*?)\s*\((\d+)\)\s*$", text)
    if not match:
        return text, None
    return match.group(1).strip(), int(match.group(2))


def parse_options(body):
    pairs = re.findall(r'value=\\"(-?\d+)\\"[^>]*>\s*([^<\\]*)', body)
    if not pairs:
        pairs = re.findall(r'value="(-?\d+)"[^>]*>\s*([^<]*)', body)
    options = []
    for value, label in pairs:
        name, count = split_name(label)
        if not name or name.startswith("---"):
            continue
        options.append({"id": value, "name": name, "count": count})
    options.sort(key=lambda item: item["name"].lower())
    return options


def parse_types(body):
    values = re.findall(r'value=\\"([^"\\]+)\\"', body)
    if not values:
        values = re.findall(r'value="([^"]+)"', body)
    types = []
    seen = set()
    for value in values:
        if "." in value or value in seen:
            continue
        if not re.match(r"^[A-Za-z0-9][A-Za-z0-9-]{1,24}$", value):
            continue
        seen.add(value)
        types.append(value)
    return types


def cached(key, loader, ttl=600):
    now = time.time()
    with _lock:
        hit = _cache.get(key)
        if hit and now - hit[0] < ttl:
            return 200, hit[1]
    status, data = loader()
    if status == 200:
        with _lock:
            _cache[key] = (time.time(), data)
    return status, data


def makers():
    def load():
        status, body = sajax("loadCompanys", ["-1"])
        if status != 200:
            return status, {"detail": "BeForward session expired. Replace the cookie in .env."}
        return 200, {"makers": parse_options(body)}

    return cached("makers", load)


def models(maker_id):
    def load():
        status, body = sajax("loadModels", [maker_id, "-1"])
        if status != 200:
            return status, {"detail": "Could not load models. The session may have expired."}
        return 200, {"models": parse_options(body)}

    return cached("models:" + maker_id, load)


def types(maker_id, model_id):
    def load():
        status, body = sajax("loadModelsType", [maker_id, model_id])
        if status != 200:
            return status, {"detail": "Could not load model types."}
        return 200, {"types": parse_types(body)}

    return cached(f"types:{maker_id}:{model_id}", load)


def text_of(fragment):
    text = re.sub(r"<[^>]+>", " ", fragment)
    return re.sub(r"\s+", " ", text).strip()


def cell(row, key):
    match = re.search(rf'id="{key}"[^>]*>([\s\S]*?)</td>', row)
    return text_of(match.group(1)) if match else ""


def hidden_value(row, key):
    match = re.search(rf'id="{key}"[^>]*>([^<]*)', row)
    return match.group(1).strip() if match else ""


def parse_lots(html):
    if member_wall(html):
        return 401, {"detail": "BeForward session expired. Replace the cookie in .env."}
    total_match = re.search(r"Found total lots:\s*(?:<[^>]+>\s*)*(\d+)", html, re.I)
    total = int(total_match.group(1)) if total_match else 0
    lots = []
    for row in re.findall(r'<tr class="ColorGreed[12]" id="cell_\d+"[\s\S]*?</tr>', html):
        number = re.search(r'id="cell_(\d+)"', row).group(1)
        photo = re.search(r'load_src="([^"]+)"', row)
        lot_id = re.search(r"[?&]id=(\d+)", row)
        end = hidden_value(row, f"jpyE{number}")
        lots.append(
            {
                "date": cell(row, f"date_{number}"),
                "lot": cell(row, f"bid_number_{number}"),
                "lot_id": lot_id.group(1) if lot_id else "",
                "auction": cell(row, f"auction_{number}"),
                "photo": photo.group(1) if photo else "",
                "maker": cell(row, f"company_{number}"),
                "model": cell(row, f"model_{number}"),
                "grade": cell(row, f"grade_{number}"),
                "year": cell(row, f"year_{number}"),
                "mileage": cell(row, f"mileage_{number}"),
                "displacement": cell(row, f"displacement_{number}"),
                "transmission": cell(row, f"transmission_{number}"),
                "color": cell(row, f"color_{number}"),
                "model_type": cell(row, f"model_type_{number}"),
                "end_thousand_jpy": int(end) if end.isdigit() else None,
                "result": cell(row, f"result_{number}"),
                "score": cell(row, f"scores_{number}"),
            }
        )
    return 200, {"count": total or len(lots), "lots": lots}


def form_value(data, key):
    value = data.get(key, "")
    if isinstance(value, list):
        value = value[-1] if value else ""
    return str(value).strip()


def search(data):
    page = form_value(data, "page") or "1"
    if not page.isdigit() or int(page) < 1:
        return 400, {"detail": "page must be a positive number."}

    def part(raw):
        if not raw:
            return None
        match = re.match(r"(\d{4})-(\d{2})-(\d{2})$", raw)
        if not match:
            return None
        return match.group(3), match.group(2), match.group(1)

    date_from = form_value(data, "date_from")
    date_to = form_value(data, "date_to")
    if not date_from or not date_to:
        end = datetime.date.today()
        start = end - datetime.timedelta(days=92)
        date_from = start.isoformat()
        date_to = end.isoformat()

    start_parts = part(date_from)
    finish_parts = part(date_to)
    if start_parts is None or finish_parts is None:
        return 400, {"detail": "Dates must be YYYY-MM-DD."}
    sday, smonth, syear = start_parts
    fday, fmonth, fyear = finish_parts

    maker = form_value(data, "maker") or "-1"
    model = form_value(data, "model") or "-1"
    fields = {
        "p": "project/findlots",
        "s": "",
        "ld": "",
        "rudder": "",
        "sday": sday,
        "smonth": smonth,
        "syear": syear,
        "fday": fday,
        "fmonth": fmonth,
        "fyear": fyear,
        "o": "d",
        "vs": str(PAGE_SIZE),
        "pg": page,
        "rows": "0",
        "model_type_count": "",
        "date_check": "1",
        "auction_check": "1",
        "bid_number_check": "1",
        "photo_check": "1",
        "company_check": "1",
        "model_check": "1",
        "grade_check": "1",
        "year_check": "1",
        "awd_check": "1",
        "transmission_check": "1",
        "displacement_check": "1",
        "mileage_check": "1",
        "inspection_check": "0",
        "color_check": "1",
        "model_type_check": "1",
        "equipment_check": "0",
        "start_price_check": "0",
        "end_price_check": "1",
        "result_check": "1",
        "scores_check": "1",
        "mrk": maker,
        "mdl_id": "-1",
        "mdl": model,
        "year1": form_value(data, "year_from"),
        "year2": form_value(data, "year_to"),
        "v1": form_value(data, "cc_from"),
        "v2": form_value(data, "cc_to"),
        "mileage1": form_value(data, "mileage_from"),
        "mileage2": form_value(data, "mileage_to"),
        "lot_pos": "none",
        "lot": form_value(data, "lot"),
        "chassis_no_pos": "none",
        "chassis_no": form_value(data, "chassis"),
        "result_pos": "",
        "result": form_value(data, "result"),
        "end_price_pos": "none",
        "end1": form_value(data, "price_from"),
        "end2": form_value(data, "price_to"),
        "scores_pos": "none",
        "type_pos": "",
        "type": form_value(data, "model_type"),
        "transmission_pos": "none",
        "transmission": form_value(data, "transmission"),
        "awd_pos": "none",
        "awd": form_value(data, "shift"),
        "word_pos": "",
        "word": form_value(data, "grade"),
        "color_pos": "none",
        "lsfc_pos": "none",
        "exch": "jpy",
    }
    pairs = list(fields.items())
    if form_value(data, "score"):
        pairs.append(("score[]", form_value(data, "score")))
    if form_value(data, "color"):
        pairs.append(("color[]", form_value(data, "color")))
    status, body = aleado(PAGE, urllib.parse.urlencode(pairs).encode())
    if status != 200:
        return status, {"detail": "BeForward did not return the results page."}
    code, payload = parse_lots(body)
    if code == 200:
        payload["page"] = int(page)
        payload["page_size"] = PAGE_SIZE
        payload["pages"] = max(1, (payload["count"] + PAGE_SIZE - 1) // PAGE_SIZE)
    return code, payload


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print("%s - %s" % (self.address_string(), fmt % args))

    def send_json(self, status, payload):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length else b"{}"
        try:
            data = json.loads(raw.decode() or "{}")
        except json.JSONDecodeError:
            data = None
        return data

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"
        query = urllib.parse.parse_qs(parsed.query)
        if path == "/api/makers":
            status, data = makers()
            self.send_json(status, data)
            return
        if path == "/api/models":
            maker_id = (query.get("maker") or [""])[0]
            if not re.match(r"^-?\d+$", maker_id):
                self.send_json(400, {"detail": "maker id is required."})
                return
            status, data = models(maker_id)
            self.send_json(status, data)
            return
        if path == "/api/types":
            maker_id = (query.get("maker") or [""])[0]
            model_id = (query.get("model") or [""])[0]
            if not re.match(r"^-?\d+$", maker_id) or not re.match(r"^-?\d+$", model_id):
                self.send_json(400, {"detail": "maker and model ids are required."})
                return
            status, data = types(maker_id, model_id)
            self.send_json(status, data)
            return
        self.serve_static(parsed.path)

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path.rstrip("/") != "/api/lots":
            self.send_error(404)
            return
        data = self.read_json()
        if data is None:
            self.send_json(400, {"detail": "Expected JSON."})
            return
        status, payload = search(data)
        self.send_json(status, payload)

    def send_file(self, root, relative):
        target = (root / relative).resolve()
        base = str(root.resolve())
        if str(target) != base and not str(target).startswith(base + "/"):
            self.send_error(404)
            return
        if not target.is_file():
            self.send_error(404)
            return
        kind = {
            ".html": "text/html; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".js": "text/javascript; charset=utf-8",
            ".svg": "image/svg+xml",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".webp": "image/webp",
        }.get(target.suffix.lower(), "application/octet-stream")
        body = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", kind)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(body)

    def serve_static(self, path):
        relative = "index.html" if path in ("", "/") else path.lstrip("/")
        self.send_file(PUBLIC, relative)


def main():
    if not session_cookie():
        raise SystemExit("Put the BeForward cookie in .env")
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"DNM Auto running at http://{HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
