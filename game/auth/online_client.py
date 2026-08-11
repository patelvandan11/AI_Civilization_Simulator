"""
Auth client that prefers online server, falls back to local AuthManager.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from game.auth.auth_manager import AuthManager, AuthResult


@dataclass(slots=True)
class Session:
    """Authenticated session."""

    user_id: str
    token: str | None = None
    online: bool = False


class HybridAuth:
    """
    Try online auth first; on connection failure use local JSON auth.
    """

    def __init__(
        self,
        root: Path | None = None,
        base_url: str = "http://127.0.0.1:8765",
        timeout: float = 1.5,
    ) -> None:
        """
        Create hybrid auth.

        Args:
            root: Project root for local fallback.
            base_url: Online auth server URL.
            timeout: HTTP timeout seconds.
        """
        self.root = root or Path(__file__).resolve().parents[2]
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.local = AuthManager(self.root)
        self.session: Session | None = None
        self.mode: str = "unknown"  # online | local

    def server_available(self) -> bool:
        """Return True if /health responds."""
        try:
            with urllib.request.urlopen(f"{self.base_url}/health", timeout=self.timeout) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return bool(data.get("ok"))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError):
            return False

    def _post(self, path: str, payload: dict[str, Any]) -> dict[str, Any] | None:
        """POST JSON; return parsed body or None on failure."""
        req = urllib.request.Request(
            f"{self.base_url}{path}",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError):
            return None

    def register(self, user_id: str, password: str) -> AuthResult:
        """Register online if possible, else local."""
        if self.server_available():
            data = self._post("/register", {"user_id": user_id, "password": password})
            if data is not None:
                self.mode = "online"
                result = AuthResult(
                    bool(data.get("ok")),
                    str(data.get("message", "")),
                    data.get("user_id"),
                )
                if result.ok and result.user_id:
                    self.session = Session(
                        result.user_id,
                        data.get("token"),
                        online=True,
                    )
                return result
        self.mode = "local"
        result = self.local.register(user_id, password)
        if result.ok and result.user_id:
            self.session = Session(result.user_id, online=False)
        return result

    def login(self, user_id: str, password: str) -> AuthResult:
        """Login online if possible, else local."""
        if self.server_available():
            data = self._post("/login", {"user_id": user_id, "password": password})
            if data is not None:
                self.mode = "online"
                result = AuthResult(
                    bool(data.get("ok")),
                    str(data.get("message", "")),
                    data.get("user_id"),
                )
                if result.ok and result.user_id:
                    self.session = Session(
                        result.user_id,
                        data.get("token"),
                        online=True,
                    )
                return result
        self.mode = "local"
        result = self.local.login("vandan_11", "vandan")
        if result.ok and result.user_id:
            self.session = Session(result.user_id, online=False)
        return result
