"""
Player state: identity, money, inventory, farm plots, buildings, craft queue.
City builder edition adds: owned_land, terrain_data, camera position, craft_queue.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from game.core.time_system import GameClock
from game.systems.inventory import Inventory, starter_inventory


def _default_owned_land(cx: int = 20, cy: int = 20, size: int = 10) -> list[list[int]]:
    """Generate the default 10x10 starting land block centred on the map."""
    half = size // 2
    coords: list[list[int]] = []
    for y in range(cy - half, cy - half + size):
        for x in range(cx - half, cx - half + size):
            coords.append([x, y])
    return coords


@dataclass(slots=True)
class FarmPlot:
    """
    Single farm plot that may hold a growing crop.

    Crop readiness is based on real UTC ``planted_at`` + crop growth_seconds.
    """

    index: int
    crop_id: str | None = None
    planted_at: str | None = None  # ISO-8601 UTC

    def to_dict(self) -> dict[str, Any]:
        """Serialize plot."""
        return {
            "index": self.index,
            "crop_id": self.crop_id,
            "planted_at": self.planted_at,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> FarmPlot:
        """Deserialize plot."""
        return cls(
            index=int(data.get("index", 0)),
            crop_id=data.get("crop_id"),
            planted_at=data.get("planted_at"),
        )


@dataclass(slots=True)
class PlacedBuilding:
    """A building owned by the player — either in inventory (x=None) or placed on map."""

    building_id: str
    count: int = 1
    # Game-time second when construction finishes (None = complete).
    ready_at_game_seconds: float | None = None
    x: int | None = None
    y: int | None = None

    def to_dict(self) -> dict[str, Any]:
        """Serialize building entry."""
        return {
            "building_id": self.building_id,
            "count": self.count,
            "ready_at_game_seconds": self.ready_at_game_seconds,
            "x": self.x,
            "y": self.y,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> PlacedBuilding:
        """Deserialize building entry."""
        return cls(
            building_id=str(data["building_id"]),
            count=int(data.get("count", 1)),
            ready_at_game_seconds=data.get("ready_at_game_seconds"),
            x=data.get("x"),
            y=data.get("y"),
        )


@dataclass(slots=True)
class CraftJob:
    """In-progress craft using real UTC end time."""

    recipe_id: str
    finishes_at: str  # ISO-8601 UTC

    def to_dict(self) -> dict[str, str]:
        """Serialize craft job."""
        return {"recipe_id": self.recipe_id, "finishes_at": self.finishes_at}

    @classmethod
    def from_dict(cls, data: dict[str, str]) -> CraftJob:
        """Deserialize craft job."""
        return cls(recipe_id=str(data["recipe_id"]), finishes_at=str(data["finishes_at"]))


@dataclass(slots=True)
class BuildJob:
    """In-progress building craft (timed via game-clock seconds)."""

    building_id: str
    ready_at_game_seconds: float

    def to_dict(self) -> dict[str, Any]:
        return {
            "building_id": self.building_id,
            "ready_at_game_seconds": self.ready_at_game_seconds,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> BuildJob:
        return cls(
            building_id=str(data["building_id"]),
            ready_at_game_seconds=float(data["ready_at_game_seconds"]),
        )


@dataclass(slots=True)
class Player:
    """
    Full player save blob for one User ID.
    City builder edition adds:
        owned_land   — list of [x, y] pairs the player owns
        terrain_data — flat row-major list of tile ints (50*50 = 2500 values)
        camera_x/y   — saved camera position
        build_queue  — list of BuildJob items being crafted concurrently
    """

    user_id:      str
    money:        int         = 500
    inventory:    Inventory   = field(default_factory=starter_inventory)
    clock:        GameClock   = field(default_factory=GameClock)
    plots:        list[FarmPlot]       = field(default_factory=list)
    buildings:    list[PlacedBuilding] = field(default_factory=list)
    craft_job:    CraftJob | None      = None   # kept for save compat
    message:      str         = ""
    plot_count:   int         = 9

    # City builder additions
    owned_land:   list[list[int]]   = field(default_factory=list)
    terrain_data: list[int] | None  = None
    camera_x:     float             = 0.0
    camera_y:     float             = 0.0
    build_queue:  list[BuildJob]    = field(default_factory=list)

    def __post_init__(self) -> None:
        """Ensure default 3×3 farm plots and default owned land exist."""
        if not self.plots:
            self.plots = [FarmPlot(index=i) for i in range(self.plot_count)]
        if not self.owned_land:
            self.owned_land = _default_owned_land()

    def owned_set(self) -> set[tuple[int, int]]:
        """Return owned_land as a fast-lookup set of (x, y) tuples."""
        return {(int(xy[0]), int(xy[1])) for xy in self.owned_land}

    def owns(self, x: int, y: int) -> bool:
        """Check if a tile coordinate is owned."""
        return any(int(xy[0]) == x and int(xy[1]) == y for xy in self.owned_land)

    def buy_land_chunk(self, cx: int, cy: int, chunk_size: int = 5) -> list[list[int]]:
        """
        Unlock a chunk_size x chunk_size block of tiles around (cx, cy).
        Returns the list of newly added [x, y] pairs.
        """
        half = chunk_size // 2
        existing = self.owned_set()
        new_tiles: list[list[int]] = []
        for y in range(cy - half, cy - half + chunk_size):
            for x in range(cx - half, cx - half + chunk_size):
                if (x, y) not in existing:
                    self.owned_land.append([x, y])
                    new_tiles.append([x, y])
        return new_tiles

    def to_dict(self) -> dict[str, Any]:
        """Serialize entire player state for JSON save."""
        return {
            "user_id":      self.user_id,
            "money":        self.money,
            "inventory":    self.inventory.to_dict(),
            "clock":        self.clock.to_dict(),
            "plots":        [p.to_dict() for p in self.plots],
            "buildings":    [b.to_dict() for b in self.buildings],
            "craft_job":    self.craft_job.to_dict() if self.craft_job else None,
            "plot_count":   self.plot_count,
            # City builder fields
            "owned_land":   self.owned_land,
            "terrain_data": self.terrain_data,
            "camera_x":     self.camera_x,
            "camera_y":     self.camera_y,
            "build_queue":  [bj.to_dict() for bj in self.build_queue],
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Player:
        """
        Restore player from save dict.

        Args:
            data: Raw JSON object.

        Returns:
            Player instance.
        """
        plot_count  = int(data.get("plot_count", 9))
        plots_raw   = data.get("plots") or []
        plots       = [FarmPlot.from_dict(p) for p in plots_raw]
        while len(plots) < plot_count:
            plots.append(FarmPlot(index=len(plots)))

        craft_raw = data.get("craft_job")

        # Migrate old build_queue stored as craft_job only
        build_queue_raw = data.get("build_queue") or []
        build_queue = [BuildJob.from_dict(bj) for bj in build_queue_raw]

        # Owned land: default to 10×10 centre if missing (old saves)
        owned_land = data.get("owned_land") or _default_owned_land()

        return cls(
            user_id      = str(data.get("user_id", "unknown")),
            money        = int(data.get("money", 500)),
            inventory    = Inventory.from_dict(data.get("inventory")),
            clock        = GameClock.from_dict(data.get("clock")),
            plots        = plots,
            buildings    = [PlacedBuilding.from_dict(b) for b in data.get("buildings") or []],
            craft_job    = CraftJob.from_dict(craft_raw) if craft_raw else None,
            plot_count   = plot_count,
            owned_land   = owned_land,
            terrain_data = data.get("terrain_data"),
            camera_x     = float(data.get("camera_x", 0.0)),
            camera_y     = float(data.get("camera_y", 0.0)),
            build_queue  = build_queue,
        )

    @classmethod
    def new(cls, user_id: str) -> Player:
        """
        Create a fresh player.

        Args:
            user_id: Authenticated user id.

        Returns:
            New Player with empty inventory and default owned land.
        """
        return cls(user_id=user_id, inventory=starter_inventory())
