#!/usr/bin/env python3
"""
Tiny local server for "Abandoned but not Forgotten".

    python3 serve.py            # http://localhost:8080
    python3 serve.py 9000       # a different port

Threaded (it serves five texture files plus six JS modules at once) and it
turns on Last-Modified handling so repeat loads come back fast.
"""
import functools
import http.server
import os
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
ROOT = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass


class Server(socketserver.ThreadingTCPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == "__main__":
    os.chdir(ROOT)
    with Server(("0.0.0.0", PORT), functools.partial(Handler, directory=ROOT)) as httpd:
        print(f"Abandoned but not Forgotten → http://localhost:{PORT}/index.html")
        httpd.serve_forever()
