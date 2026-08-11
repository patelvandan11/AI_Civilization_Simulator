"""
Farming system: plant / grow / harvest using real-world UTC timers.
"""

from __future__ import annotations

import random
from datetime import datetime, timezone
from typing import Any

from game.core.player import FarmPlot, Player


def utc_now() -> datetime:
    """Return timezone-aware UTC now."""
    return datetime.now(timezone.utc)


def parse_utc(iso: str) -> datetime:
    """
    Parse an ISO-8601 timestamp to aware UTC datetime.

    Args:
        iso: ISO timestamp string.

    Returns:
        Aware datetime in UTC.
    """
    dt = datetime.fromisoformat(iso)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def format_remaining(seconds: float) -> str:
    """
    Format remaining seconds as ``H:MM:SS`` or ``M:SS``.

    Args:
        seconds: Remaining time (clamped >= 0).

    Returns:
        Human-readable countdown.
    """
    secs = max(0, int(seconds))
    h, rem = divmod(secs, 3600)
    m, s = divmod(rem, 60)
    if h > 0:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"


class FarmingSystem:
    """
    Operate on player farm plots using crop definitions from data.

    Args:
        crops: Dict of crop_id -> crop definition from crops.json.
    """

    def __init__(self, crops: dict[str, Any]) -> None:
        """Store crop table."""
        self.crops = crops

    def plot_status(self, plot: FarmPlot) -> dict[str, Any]:
        """
        Compute display status for a plot.

        Args:
            plot: Farm plot.

        Returns:
            Dict with keys: state (empty|growing|ready), label, remaining, crop.
        """
        if not plot.crop_id or not plot.planted_at:
            return {
                "state": "empty",
                "label": "Empty",
                "remaining": 0.0,
                "crop": None,
            }
        crop = self.crops.get(plot.crop_id)
        if not crop:
            return {
                "state": "empty",
                "label": "Unknown crop",
                "remaining": 0.0,
                "crop": None,
            }
        planted = parse_utc(plot.planted_at)
        elapsed = (utc_now() - planted).total_seconds()
        needed = float(crop["growth_seconds"])
        remaining = max(0.0, needed - elapsed)
        if remaining <= 0:
            return {
                "state": "ready",
                "label": f"{crop['name']} READY",
                "remaining": 0.0,
                "crop": crop,
            }
        return {
            "state": "growing",
            "label": f"{crop['name']} {format_remaining(remaining)}",
            "remaining": remaining,
            "crop": crop,
        }

    def plant(self, player: Player, plot_index: int, crop_id: str) -> str:
        """
        Plant a crop on an empty plot, consuming one seed.

        Args:
            player: Active player.
            plot_index: Plot index.
            crop_id: Crop definition id.

        Returns:
            Status message for HUD.
        """
        crop = self.crops.get(crop_id)
        if not crop:
            return "Unknown crop."
        if plot_index < 0 or plot_index >= len(player.plots):
            return "Invalid plot."
        plot = player.plots[plot_index]
        if plot.crop_id:
            return "Plot is already planted."
        seed_id = str(crop["seed_id"])
        if not player.inventory.remove(seed_id, 1):
            return f"Need 1 {seed_id}."
        plot.crop_id = crop_id
        plot.planted_at = utc_now().isoformat()
        hours = float(crop["growth_seconds"]) / 3600.0
        return f"Planted {crop['name']} (ready in {hours:g}h real time)."

    def harvest(self, player: Player, plot_index: int) -> str:
        """
        Harvest a ready crop into inventory.

        Args:
            player: Active player.
            plot_index: Plot index.

        Returns:
            Status message.
        """
        if plot_index < 0 or plot_index >= len(player.plots):
            return "Invalid plot."
        plot = player.plots[plot_index]
        status = self.plot_status(plot)
        if status["state"] != "ready":
            if status["state"] == "growing":
                return f"Still growing: {format_remaining(status['remaining'])}."
            return "Nothing to harvest."
        crop = status["crop"]
        amount = random.randint(int(crop["yield_min"]), int(crop["yield_max"]))
        yield_id = str(crop["yield_id"])
        if not player.inventory.add(yield_id, amount):
            return "Inventory full."
        plot.crop_id = None
        plot.planted_at = None
        return f"Harvested {amount}× {yield_id}."

    def interact(self, player: Player, plot_index: int, preferred_crop: str = "apple") -> str:
        """
        One-click plot action: harvest if ready, else plant preferred crop.

        Args:
            player: Active player.
            plot_index: Plot index.
            preferred_crop: Crop to plant on empty plots.

        Returns:
            Status message.
        """
        if plot_index < 0 or plot_index >= len(player.plots):
            return "Invalid plot."
        status = self.plot_status(player.plots[plot_index])
        if status["state"] == "ready":
            return self.harvest(player, plot_index)
        if status["state"] == "growing":
            return f"Growing… {status['label']}"
        return self.plant(player, plot_index, preferred_crop)
