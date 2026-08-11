"""
Crafting system: consume ingredients, produce items after real craft_seconds.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from game.core.player import CraftJob, Player
from game.systems.farming import format_remaining, parse_utc, utc_now


class CraftingSystem:
    """
    Craft recipes from data/recipes.json.

    Args:
        recipes: Recipe definition table.
    """

    def __init__(self, recipes: dict[str, Any]) -> None:
        """Store recipe catalog."""
        self.recipes = recipes

    def list_recipes(self) -> list[dict[str, Any]]:
        """Return recipes in stable order."""
        return [self.recipes[k] for k in sorted(self.recipes.keys())]

    def can_craft(self, player: Player, recipe_id: str) -> tuple[bool, str]:
        """
        Check whether crafting can start.

        Args:
            player: Active player.
            recipe_id: Recipe id.

        Returns:
            (ok, reason).
        """
        recipe = self.recipes.get(recipe_id)
        if not recipe:
            return False, "Unknown recipe."
        if player.craft_job is not None:
            return False, "Already crafting something."
        req = recipe.get("requirements", {})
        if not player.inventory.can_afford(req):
            missing = [
                f"{item}×{qty}"
                for item, qty in req.items()
                if not player.inventory.has(item, qty)
            ]
            return False, "Missing: " + ", ".join(missing)
        return True, "OK"

    def start_craft(self, player: Player, recipe_id: str) -> str:
        """
        Begin a craft job after consuming requirements.

        Args:
            player: Active player.
            recipe_id: Recipe id.

        Returns:
            Status message.
        """
        ok, reason = self.can_craft(player, recipe_id)
        if not ok:
            return reason
        recipe = self.recipes[recipe_id]
        player.inventory.consume(recipe.get("requirements", {}))
        duration = float(recipe.get("craft_seconds", 5))
        finishes = utc_now().timestamp() + duration
        finishes_iso = datetime.fromtimestamp(finishes, tz=timezone.utc).isoformat()
        player.craft_job = CraftJob(recipe_id=recipe_id, finishes_at=finishes_iso)
        return f"Crafting {recipe['name']}… ({int(duration)}s)"

    def tick(self, player: Player) -> str | None:
        """
        Complete craft job when real time elapses.

        Args:
            player: Active player.

        Returns:
            Completion message, or None.
        """
        job = player.craft_job
        if job is None:
            return None
        if utc_now() < parse_utc(job.finishes_at):
            return None
        recipe = self.recipes.get(job.recipe_id)
        player.craft_job = None
        if not recipe:
            return "Craft finished (unknown recipe)."
        out_id = str(recipe["output_id"])
        out_count = int(recipe.get("output_count", 1))
        player.inventory.add(out_id, out_count)
        return f"Crafted {out_count}× {recipe['name']}."

    def job_label(self, player: Player) -> str:
        """
        Status line for the active craft job.

        Args:
            player: Active player.

        Returns:
            Label string.
        """
        job = player.craft_job
        if job is None:
            return "Idle"
        recipe = self.recipes.get(job.recipe_id, {})
        remaining = (parse_utc(job.finishes_at) - utc_now()).total_seconds()
        name = recipe.get("name", job.recipe_id)
        if remaining <= 0:
            return f"{name} finishing…"
        return f"{name} {format_remaining(remaining)}"
