#!/usr/bin/env python3
"""Serve the project page locally without browser caching."""

from __future__ import annotations

import argparse
import errno
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


DOCS_DIRECTORY = Path(__file__).resolve().parent / "docs"


class NoCacheHTTPRequestHandler(SimpleHTTPRequestHandler):
    """Return every file with headers that disable browser caches."""

    def send_head(self):
        # Ignore conditional requests left over from a previous development
        # server so the first refresh also receives the complete current file.
        for header in ("If-Modified-Since", "If-None-Match"):
            if header in self.headers:
                del self.headers[header]
        return super().send_head()

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Serve docs/ with caching disabled for local development."
    )
    parser.add_argument("--port", type=int, default=8090, help="port to serve (default: 8090)")
    parser.add_argument("--bind", default="127.0.0.1", help="address to bind (default: 127.0.0.1)")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    handler = partial(NoCacheHTTPRequestHandler, directory=str(DOCS_DIRECTORY))

    try:
        server = ThreadingHTTPServer((args.bind, args.port), handler)
    except OSError as error:
        if error.errno == errno.EADDRINUSE:
            raise SystemExit(
                f"Port {args.port} is already in use. Stop the existing server with Ctrl+C, "
                "then run this command again."
            ) from error
        raise

    host, port = server.server_address[:2]
    print(f"Serving {DOCS_DIRECTORY} at http://{host}:{port}/ with caching disabled")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
