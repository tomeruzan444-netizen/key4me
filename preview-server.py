"""Fast local preview server for dist/.

- Multi-threaded (ThreadingHTTPServer) so many assets load in parallel.
- Hashed build assets (/_astro/, /wp-content/) are cached long → instant on
  repeat navigation. Only HTML is no-cache, so you always see the latest build.
Run from the keyforme/ folder:  python preview-server.py
"""
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        p = self.path.split("?")[0]
        if p.endswith((".html", "/")) or "." not in p.rsplit("/", 1)[-1]:
            # HTML / pretty-URL routes: always fresh.
            self.send_header("Cache-Control", "no-cache")
        else:
            # Static assets: cache aggressively for snappy navigation.
            self.send_header("Cache-Control", "public, max-age=86400")
        super().end_headers()

    def log_message(self, *args):
        pass  # quiet


if __name__ == "__main__":
    print("Preview running at http://localhost:8080 (threaded, asset cache)")
    ThreadingHTTPServer(("127.0.0.1", 8080), Handler).serve_forever()
