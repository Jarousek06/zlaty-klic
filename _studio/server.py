# Dev server pro web ZLATÝ KLÍČ.
# Jako `python -m http.server` nad složkou zlaty-klic/, ale:
#  - zakazuje cache (po úpravě se vždy načte aktuální verze),
#  - přijímá POST /__save?name=soubor.png ze studia (_studio/index.html)
#    a ukládá rendery do _studio/raw/. Na produkci se nenasazuje.
# Použití: python zlaty-klic/_studio/server.py 5188
import functools
import http.server
import os
import pathlib
import socket
import sys
from urllib.parse import parse_qs, urlparse

ROOT = pathlib.Path(__file__).resolve().parent.parent
RAW = ROOT / "_studio" / "raw"


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        super().end_headers()

    def do_POST(self):
        url = urlparse(self.path)
        if url.path != "/__save":
            self.send_error(404)
            return
        name = os.path.basename(parse_qs(url.query).get("name", [""])[0])
        if not name.endswith(".png"):
            self.send_error(400, "only .png")
            return
        length = int(self.headers.get("Content-Length", 0))
        RAW.mkdir(parents=True, exist_ok=True)
        (RAW / name).write_bytes(self.rfile.read(length))
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"ok")


class DualStackServer(http.server.ThreadingHTTPServer):
    address_family = socket.AF_INET6

    def server_bind(self):
        self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        super().server_bind()


port = int(sys.argv[1]) if len(sys.argv) > 1 else 5188
handler = functools.partial(Handler, directory=str(ROOT))
print(f"ZLATÝ KLÍČ dev server: http://localhost:{port}")
DualStackServer(("::", port), handler).serve_forever()
