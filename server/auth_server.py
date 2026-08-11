"""
Lightweight online auth HTTP server (stdlib only).

Run:  py -3 -m server.auth_server
API:
  POST /register  JSON {user_id, password} -> {ok, message, token?}
  POST /login    JSON {user_id, password} -> {ok, message, token?}
  GET  /health
"""

from __future__ import annotations

import hashlib
import json
import secrets
import sys
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
USERS_PATH = ROOT / "saves" / "online_users.json"
TOKENS: dict[str, str] = {}  # token -> user_id
PBKDF2_ITERATIONS = 120_000


def _load() -> dict[str, Any]:
    """Load online users DB."""
    USERS_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not USERS_PATH.exists():
        return {"users": {}}
    try:
        return json.loads(USERS_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {"users": {}}


def _save(data: dict[str, Any]) -> None:
    """Persist online users DB."""
    USERS_PATH.write_text(json.dumps(data, indent=2), encoding="utf-8")


def _hash(password: str, salt: str) -> str:
    """PBKDF2 hash."""
    return hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(salt),
        PBKDF2_ITERATIONS,
    ).hex()


class AuthHandler(BaseHTTPRequestHandler):
    """JSON auth endpoints."""

    def log_message(self, format: str, *args: Any) -> None:
        """Quieter logging."""
        sys.stderr.write("[auth] " + (format % args) + "\n")

    def _read_json(self) -> dict[str, Any]:
        """Parse JSON body."""
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b"{}"
        try:
            return json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            return {}

    def _send(self, code: int, payload: dict[str, Any]) -> None:
        """Write JSON response."""
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:  # noqa: N802
        """CORS preflight."""
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        """Health check."""
        if urlparse(self.path).path == "/health":
            self._send(200, {"ok": True, "service": "ai-civ-auth"})
        else:
            self._send(404, {"ok": False, "message": "Not found"})

    def do_POST(self) -> None:  # noqa: N802
        """Register / login."""
        path = urlparse(self.path).path
        data = self._read_json()
        user_id = str(data.get("user_id", "")).strip()
        password = str(data.get("password", ""))

        if path == "/register":
            self._send(200, self._register(user_id, password))
        elif path == "/login":
            self._send(200, self._login(user_id, password))
        else:
            self._send(404, {"ok": False, "message": "Not found"})

    def _register(self, user_id: str, password: str) -> dict[str, Any]:
        """Create account."""
        if not (3 <= len(user_id) <= 16) or not user_id.replace("_", "").isalnum():
            return {"ok": False, "message": "User ID must be 3-16 alphanumeric/underscore."}
        if len(password) < 4:
            return {"ok": False, "message": "Password too short."}
        db = _load()
        users = db.setdefault("users", {})
        if any(k.lower() == user_id.lower() for k in users):
            return {"ok": False, "message": "User ID taken."}
        salt = secrets.token_hex(16)
        users[user_id] = {
            "salt": salt,
            "password_hash": _hash(password, salt),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        _save(db)
        token = secrets.token_hex(24)
        TOKENS[token] = user_id
        return {"ok": True, "message": "Registered.", "user_id": user_id, "token": token}

    def _login(self, user_id: str, password: str) -> dict[str, Any]:
        """Authenticate."""
        db = _load()
        users = db.get("users", {})
        canonical = next((k for k in users if k.lower() == user_id.lower()), None)
        if canonical is None:
            return {"ok": False, "message": "Unknown User ID."}
        rec = users[canonical]
        if not secrets.compare_digest(rec["password_hash"], _hash(password, rec["salt"])):
            return {"ok": False, "message": "Incorrect password."}
        token = secrets.token_hex(24)
        TOKENS[token] = canonical
        return {"ok": True, "message": "Welcome.", "user_id": canonical, "token": token}


def main() -> None:
    """Start auth server on port 8765."""
    host, port = "127.0.0.1", 8765
    server = ThreadingHTTPServer((host, port), AuthHandler)
    print(f"Auth server listening on http://{host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
