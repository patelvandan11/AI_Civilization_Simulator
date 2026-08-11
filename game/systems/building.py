"""
Building system: spend resources to craft structures (game-time build duration).
City builder edition: concurrent build_queue replaces single-slot building.
"""

from __future__ import annotations

from typing import Any

from game.core.player import BuildJob, PlacedBuilding, Player


# ---------------------------------------------------------------------------
# Placement rule constants (mirror data/buildings.json placement_rule values)
# ---------------------------------------------------------------------------
RULE_ANY_OWNED      = "any_owned"
RULE_NO_WATER       = "no_water"
RULE_ROAD_ADJACENT  = "road_adjacent"
RULE_ROAD_OR_SIDE   = "road_or_sidewalk"
RULE_ROAD_ONLY      = "road_only"
RULE_RIVER_ONLY     = "river_only"


class BuildingSystem:
    """
    Construct buildings from data/buildings.json definitions.

    Args:
        buildings: Building definition table.
    """

    def __init__(self, buildings: dict[str, Any]) -> None:
        """Store building catalog."""
        self.buildings = buildings

    def list_definitions(self) -> list[dict[str, Any]]:
        """Return all building definitions ordered by category then name."""
        cat_order = {"infrastructure": 0, "residential": 1, "commercial": 2, "civic": 3, "decorative": 4}
        defs = list(self.buildings.values())
        defs.sort(key=lambda d: (cat_order.get(d.get("category", ""), 9), d.get("name", "")))
        return defs

    def get_definition(self, building_id: str) -> dict[str, Any] | None:
        """Return a single building definition."""
        return self.buildings.get(building_id)

    def inventory_count(self, player: Player, building_id: str) -> int:
        """
        Count completed buildings in inventory (x=None, not in-progress).

        Args:
            player: Active player.
            building_id: Building id.

        Returns:
            Total count in inventory.
        """
        return sum(
            b.count
            for b in player.buildings
            if b.building_id == building_id
            and b.x is None
            and b.ready_at_game_seconds is None
        )

    def owned_count(self, player: Player, building_id: str) -> int:
        """
        Count completed + in-progress instances (legacy helper).

        Args:
            player: Active player.
            building_id: Building id.

        Returns:
            Total count.
        """
        return sum(b.count for b in player.buildings if b.building_id == building_id)

    def queue_count(self, player: Player, building_id: str) -> int:
        """Count how many of a building are currently being crafted."""
        return sum(1 for bj in player.build_queue if bj.building_id == building_id)

    def tick(self, player: Player) -> list[str]:
        """
        Complete any build jobs whose game-time ready_at has passed.

        Args:
            player: Active player.

        Returns:
            List of completion messages.
        """
        messages: list[str] = []
        now = player.clock.total_seconds
        completed: list[BuildJob] = []

        for bj in player.build_queue:
            if now >= bj.ready_at_game_seconds:
                completed.append(bj)
                name = self.buildings.get(bj.building_id, {}).get("name", bj.building_id)
                messages.append(f"{name} ready — added to inventory!")

        for bj in completed:
            player.build_queue.remove(bj)
            # Add to player inventory (PlacedBuilding with x=None = in inventory)
            self._add_to_inventory(player, bj.building_id)

        # Legacy: also tick any old PlacedBuilding that has ready_at_game_seconds
        for b in player.buildings:
            if b.ready_at_game_seconds is not None and now >= b.ready_at_game_seconds:
                b.ready_at_game_seconds = None
                name = self.buildings.get(b.building_id, {}).get("name", b.building_id)
                messages.append(f"{name} construction complete.")

        if completed or any(b.ready_at_game_seconds is None for b in player.buildings):
            self._merge_completed(player)

        return messages

    def _add_to_inventory(self, player: Player, building_id: str) -> None:
        """Add one unit of a building to the player's completed inventory."""
        for b in player.buildings:
            if b.building_id == building_id and b.x is None and b.ready_at_game_seconds is None:
                b.count += 1
                return
        player.buildings.append(
            PlacedBuilding(
                building_id=building_id,
                count=1,
                ready_at_game_seconds=None,
                x=None,
                y=None,
            )
        )

    def _merge_completed(self, player: Player) -> None:
        """Collapse finished inventory buildings with the same id into one stack."""
        merged: dict[str, PlacedBuilding] = {}
        in_progress: list[PlacedBuilding] = []
        map_placed: list[PlacedBuilding]  = []

        for b in player.buildings:
            if b.ready_at_game_seconds is not None:
                in_progress.append(b)
                continue
            if b.x is not None or b.y is not None:
                map_placed.append(b)
                continue
            if b.building_id in merged:
                merged[b.building_id].count += b.count
            else:
                merged[b.building_id] = PlacedBuilding(
                    building_id=b.building_id,
                    count=b.count,
                    ready_at_game_seconds=None,
                    x=None,
                    y=None,
                )

        player.buildings = list(merged.values()) + in_progress + map_placed

    def can_build(self, player: Player, building_id: str) -> tuple[bool, str]:
        """
        Check whether the player may start crafting this building.

        Args:
            player: Active player.
            building_id: Building id.

        Returns:
            (ok, reason).
        """
        definition = self.buildings.get(building_id)
        if not definition:
            return False, "Unknown building."
        if definition.get("unique") and (
            self.inventory_count(player, building_id) > 0
            or self.queue_count(player, building_id) > 0
            or any(b.building_id == building_id and b.x is not None for b in player.buildings)
        ):
            return False, f"{definition['name']} already built or in queue."
        req = definition.get("requirements", {})
        if not player.inventory.can_afford(req):
            missing = [
                f"{item}×{qty}"
                for item, qty in req.items()
                if not player.inventory.has(item, qty)
            ]
            return False, "Need: " + ", ".join(missing)
        return True, "OK"

    def start_build(self, player: Player, building_id: str) -> str:
        """
        Consume resources and enqueue building for crafting.

        Args:
            player: Active player.
            building_id: Building id.

        Returns:
            Status message.
        """
        ok, reason = self.can_build(player, building_id)
        if not ok:
            return reason

        definition = self.buildings[building_id]
        req = definition.get("requirements", {})
        player.inventory.consume(req)

        duration = float(definition.get("build_time_game_seconds", 30))
        ready_at = player.clock.total_seconds + duration
        player.build_queue.append(BuildJob(building_id=building_id, ready_at_game_seconds=ready_at))

        if duration < 60:
            eta = f"{int(duration)}s"
        else:
            eta = f"{duration / 60:.0f} min"
        return f"Crafting {definition['name']}… (ready in {eta})"

    def apply_farm_expansions(self, player: Player) -> None:
        """
        Ensure plot_count matches completed Farm buildings.

        Args:
            player: Active player.
        """
        from game.core.player import FarmPlot

        completed_farms = sum(
            b.count
            for b in player.buildings
            if b.building_id == "farm" and b.ready_at_game_seconds is None
        )
        target = 9 + completed_farms * 3
        if target > player.plot_count:
            player.plot_count = target
            while len(player.plots) < player.plot_count:
                player.plots.append(FarmPlot(index=len(player.plots)))
