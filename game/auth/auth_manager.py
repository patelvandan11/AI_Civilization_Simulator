"""
Local User ID + password authentication.

Passwords are stored as PBKDF2-HMAC hashes in ``saves/users.json``.
The storage interface is intentionally thin so an online backend can
replace file I/O later without changing call sites.
"""

from __future__ import annotations

import hashlib
import json
import re
import secrets
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


_USER_ID_RE = re.compile(r"^[A-Za-z0-9_]{3,16}$")
_PBKDF2_ITERATIONS = 120_000


@dataclass(slots=True)
class AuthResult:
    """Outcome of a register or login attempt."""

    ok: bool
    message: str
    user_id: str | None = None


class AuthManager:
    """
    Register and sign-in against a local users database.

    Args:
        root: Project root containing ``saves/``.
    """

    def __init__(self, root: Path | None = None) -> None:
        """
        Create auth manager and ensure users file exists.

        Args:
            root: Project root path.
        """
        self.root = root or Path(__file__).resolve().parents[2]
        self.users_path = self.root / "saves" / "users.json"
        self.users_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.users_path.exists():
            self._write_users({"users": {}})

    def validate_user_id(self, user_id: str) -> str | None:
        """
        Validate User ID format.

        Args:
            user_id: Candidate id.

        Returns:
            Error message, or None if valid.
        """
        if not _USER_ID_RE.match(user_id):
            return "User ID must be 3-16 chars (letters, numbers, underscore)."
        return None

    def validate_password(self, password: str) -> str | None:
        """
        Validate password strength (minimal local rules).

        Args:
            password: Candidate password.

        Returns:
            Error message, or None if valid.
        """
        if len(password) < 4:
            return "Password must be at least 4 characters."
        if len(password) > 64:
            return "Password is too long."
        return None

    def register(self, user_id: str, password: str) -> AuthResult:
        """
        Create a new local account.

        Args:
            user_id: Desired account id.
            password: Plaintext password (hashed before storage).

        Returns:
            AuthResult with success flag and message.
        """
        user_id = user_id.strip()
        err = self.validate_user_id(user_id)
        if err:
            return AuthResult(False, err)
        err = self.validate_password(password)
        if err:
            return AuthResult(False, err)

        db = self._read_users()
        users: dict[str, Any] = db.setdefault("users", {})
        if user_id.lower() in {u.lower() for u in users}:
            return AuthResult(False, "That User ID is already taken.")

        salt = secrets.token_hex(16)
        users[user_id] = {
            "password_hash": self._hash_password(password, salt),
            "salt": salt,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        self._write_users(db)
        return AuthResult(True, "Account created. You can sign in.", user_id)

    def login(self, user_id: str, password: str) -> AuthResult:
        """
        Authenticate an existing account.

        Args:
            user_id: Account id.
            password: Plaintext password.

        Returns:
            AuthResult; ``user_id`` set on success.
        """
        user_id = user_id.strip()
        db = self._read_users()
        users: dict[str, Any] = db.get("users", {})

        # Case-insensitive lookup, store canonical key.
        canonical = None
        for key in users:
            if key.lower() == user_id.lower():
                canonical = key
                break
        if canonical is None:
            return AuthResult(False, "Unknown User ID. Register first.")

        record = users[canonical]
        expected = record.get("password_hash", "")
        salt = record.get("salt", "")
        actual = self._hash_password(password, salt)
        if not secrets.compare_digest(expected, actual):
            return AuthResult(False, "Incorrect password.")
        return AuthResult(True, "Welcome back!", canonical)

    def _hash_password(self, password: str, salt: str) -> str:
        """
        Derive a PBKDF2-HMAC-SHA256 hash hex string.

        Args:
            password: Plaintext password.
            salt: Hex salt string.

        Returns:
            Hex digest.
        """
        return hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            bytes.fromhex(salt),
            _PBKDF2_ITERATIONS,
        ).hex()

    def _read_users(self) -> dict[str, Any]:
        """Load users database from disk."""
        try:
            with self.users_path.open("r", encoding="utf-8") as fh:
                return json.load(fh)
        except (OSError, json.JSONDecodeError):
            return {"users": {}}

    def _write_users(self, data: dict[str, Any]) -> None:
        """Write users database atomically."""
        tmp = self.users_path.with_suffix(".tmp")
        with tmp.open("w", encoding="utf-8") as fh:
            json.dump(data, fh, indent=2)
        tmp.replace(self.users_path)
