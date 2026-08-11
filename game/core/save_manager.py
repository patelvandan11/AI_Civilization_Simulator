"""
JSON save/load for users and per-player state.

Storage layout (local, swappable later for online backend):
    saves/users.json
    saves/players/{user_id}.json
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from game.core.player import Player


class SaveManager:
    """
    File-backed persistence for player saves.

    Args:
        root: Project root containing ``saves/`` and ``data/``.
    """

    def __init__(self, root: Path | None = None) -> None:
        """
        Initialize paths under the project root.

        Args:
            root: Absolute project root; defaults to two levels above this file.
        """
        self.root = root or Path(__file__).resolve().parents[2]
        self.saves_dir = self.root / "saves"
        self.players_dir = self.saves_dir / "players"
        self.data_dir = self.root / "data"
        self.players_dir.mkdir(parents=True, exist_ok=True)
        self.saves_dir.mkdir(parents=True, exist_ok=True)

    def player_path(self, user_id: str) -> Path:
        """
        Path to a player's save file.

        Args:
            user_id: Account id.

        Returns:
            Path ``saves/players/{user_id}.json``.
        """
        safe = "".join(ch for ch in user_id if ch.isalnum() or ch in ("_", "-"))
        return self.players_dir / f"{safe}.json"

    def load_player(self, user_id: str) -> Player:
        """
        Load a player save, creating a default if missing.

        Args:
            user_id: Account id.

        Returns:
            Player instance.
        """
        path = self.player_path(user_id)
        if not path.exists():
            player = Player.new(user_id)
            self.save_player(player)
            return player
        with path.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
        return Player.from_dict(data)

    def save_player(self, player: Player) -> None:
        """
        Atomically write player state to disk.

        On Windows, ``Path.replace`` can fail with Access Denied if another
        process holds the file — retry, then fall back to a direct write.

        Args:
            player: Player to persist.
        """
        import time

        path = self.player_path(player.user_id)
        tmp = path.with_suffix(".tmp")
        payload = json.dumps(player.to_dict(), indent=2)
        with tmp.open("w", encoding="utf-8") as fh:
            fh.write(payload)

        last_error: OSError | None = None
        for attempt in range(5):
            try:
                tmp.replace(path)
                return
            except OSError as exc:
                last_error = exc
                time.sleep(0.05 * (attempt + 1))

        # Fallback: write directly (still durable enough for local saves).
        try:
            with path.open("w", encoding="utf-8") as fh:
                fh.write(payload)
            if tmp.exists():
                try:
                    tmp.unlink()
                except OSError:
                    pass
        except OSError:
            if last_error is not None:
                raise last_error
            raise

    def load_json_data(self, name: str) -> dict[str, Any]:
        """
        Load a data table from ``data/{name}.json``.

        Args:
            name: File stem (items, crops, recipes, buildings).

        Returns:
            Parsed JSON object.
        """
        path = self.data_dir / f"{name}.json"
        with path.open("r", encoding="utf-8") as fh:
            return json.load(fh)
