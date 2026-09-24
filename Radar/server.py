#!/usr/bin/env python3
"""Static file server + same-origin proxy for the OpenSky API.

OpenSky's API sends an Access-Control-Allow-Origin header locked to its own
domain, so the browser can't call it directly from a page served elsewhere.
This proxies /proxy/* requests to OpenSky server-side (no browser CORS
involved) and serves the static app files for everything else.

Usage: python server.py [port]   (default port 8000)
"""
import sys
import json
import urllib.request
import urllib.error
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

OPENSKY_BASE = "https://opensky-network.org/api"
PROXY_ROUTES = {
    "/proxy/states": "/states/all",
    "/proxy/flights": "/flights/aircraft",
}


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urlsplit(self.path)
        if parsed.path in PROXY_ROUTES:
            self.proxy(PROXY_ROUTES[parsed.path], parsed.query)
        else:
            super().do_GET()

    def proxy(self, upstream_path, query):
        url = f"{OPENSKY_BASE}{upstream_path}"
        if query:
            url += f"?{query}"
        try:
            with urllib.request.urlopen(url, timeout=15) as resp:
                body = resp.read()
                status = resp.status
        except urllib.error.HTTPError as e:
            body = e.read()
            status = e.code
        except urllib.error.URLError as e:
            body = json.dumps({"error": str(e.reason)}).encode()
            status = 502

        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    httpd = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"Radar scope running at http://localhost:{port}/")
    httpd.serve_forever()
