#!/usr/bin/env python3
"""本地静态预览：给文本类型显式声明 UTF-8，避免浏览器按系统编码猜测。"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys


TEXT_TYPES = {
    ".css": "text/css",
    ".html": "text/html",
    ".js": "text/javascript",
    ".json": "application/json",
    ".map": "application/json",
    ".md": "text/markdown",
    ".mjs": "text/javascript",
    ".svg": "image/svg+xml",
    ".txt": "text/plain",
    ".webmanifest": "application/manifest+json",
    ".xml": "application/xml",
}


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        **{ext: f"{mime}; charset=utf-8" for ext, mime in TEXT_TYPES.items()},
    }


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    root = Path(__file__).resolve().parent.parent
    server = ThreadingHTTPServer(("127.0.0.1", port), partial(Handler, directory=root))
    print(f"http://127.0.0.1:{port}/")
    server.serve_forever()
