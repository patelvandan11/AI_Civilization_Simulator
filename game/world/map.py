"""
Top-down world map: empty sandbox + camera + minimap-friendly render.
City builder edition: 50x50 grass map, terrain painting, road auto-tiling,
owned-land dark overlay, zoom support.
"""

from __future__ import annotations

from typing import Any, Iterable, Set, Tuple

import pygame


# ---------------------------------------------------------------------------
# Tile type IDs
# ---------------------------------------------------------------------------
TILE_WATER    = 0   # legacy alias kept for save compat (river now = TILE_RIVER)
TILE_SIDEWALK = 1
TILE_GRASS    = 2
TILE_FOREST   = 3
TILE_STONE    = 4   # legacy stone ground (not mountain)
TILE_FARM     = 5
TILE_ROAD     = 6
TILE_EMPTY    = 7   # bare dirt / empty land
TILE_RIVER    = 8   # paintable river (replaces TILE_WATER for new maps)
TILE_MOUNTAIN = 9   # impassable terrain
TILE_SAND     = 10
TILE_CONCRETE = 11

TILE_COLORS: dict[int, tuple[int, int, int]] = {
    TILE_WATER:    (70,  110, 160),
    TILE_SIDEWALK: (200, 200, 205),
    TILE_GRASS:    (106, 168,  88),
    TILE_FOREST:   (35,   85,  40),
    TILE_STONE:    (110, 110, 115),
    TILE_FARM:     (120,  95,  50),
    TILE_ROAD:     (60,   60,  65),
    TILE_EMPTY:    (140, 118,  90),
    TILE_RIVER:    (60,  120, 190),
    TILE_MOUNTAIN: (130, 120, 115),
    TILE_SAND:     (210, 190, 130),
    TILE_CONCRETE: (165, 165, 168),
}


class WorldMap:
    """
    Grid of tile IDs.  City builder edition: starts as a 50x50 blank grass field.
    Tiles can be painted by the player at runtime.
    """

    def __init__(
        self,
        width: int = 50,
        height: int = 50,
        seed: int = 42,
        tiles: list[list[int]] | None = None,
    ) -> None:
        self.width  = width
        self.height = height
        self.seed   = seed
        if tiles is not None:
            self.tiles = tiles
        else:
            self.generate()

    def generate(self) -> None:
        """Empty-sandbox generation: 50x50 pure grass. Player paints everything."""
        self.tiles = [[TILE_GRASS] * self.width for _ in range(self.height)]

    def get(self, x: int, y: int) -> int:
        """Tile at coordinates, or TILE_RIVER (water) if OOB."""
        if not (0 <= x < self.width and 0 <= y < self.height):
            return TILE_RIVER
        return self.tiles[y][x]

    def set(self, x: int, y: int, tile: int) -> None:
        """Set tile if in bounds."""
        if 0 <= x < self.width and 0 <= y < self.height:
            self.tiles[y][x] = tile

    def to_flat(self) -> list[int]:
        """Serialize to flat row-major list for save file."""
        out: list[int] = []
        for row in self.tiles:
            out.extend(row)
        return out

    @classmethod
    def from_flat(cls, flat: list[int], width: int, height: int, seed: int = 42) -> "WorldMap":
        """Restore from flat list."""
        tiles = []
        for y in range(height):
            tiles.append(list(flat[y * width: (y + 1) * width]))
        return cls(width=width, height=height, seed=seed, tiles=tiles)


class WorldRenderer:
    """
    Renders a WorldMap with a floating camera into a destination rect.
    Supports zoom (tile_size), road auto-tiling, and owned-land overlay.
    """

    ROAD_TILES = {TILE_ROAD, TILE_SIDEWALK}

    def __init__(self, world: WorldMap, tile_size: int = 20) -> None:
        self.world = world
        self._tile_size = tile_size
        self.camera_x = float(world.width  * tile_size // 2 - 200)
        self.camera_y = float(world.height * tile_size // 2 - 150)
        self._tile_cache: dict[int, pygame.Surface] = {}
        self._struct_cache: dict[str, pygame.Surface | None] = {}
        # Semi-transparent overlay for locked land
        self._lock_overlay: pygame.Surface | None = None

    # ------------------------------------------------------------------
    # tile_size property — invalidates cache on change
    # ------------------------------------------------------------------
    @property
    def tile_size(self) -> int:
        return self._tile_size

    @tile_size.setter
    def tile_size(self, value: int) -> None:
        value = max(8, min(48, value))
        if value != self._tile_size:
            self._tile_size = value
            self._tile_cache.clear()
            self._struct_cache.clear()
            self._lock_overlay = None

    # ------------------------------------------------------------------
    # Tile surface generation
    # ------------------------------------------------------------------
    def _tile_surf(self, tile: int, road_mask: int = 0) -> pygame.Surface:
        """Cached coloured tile.  road_mask is N|E|S|W bitmask for roads."""
        cache_key = tile * 100 + road_mask if tile == TILE_ROAD else tile
        if cache_key in self._tile_cache:
            return self._tile_cache[cache_key]

        ts = self._tile_size
        surf = pygame.Surface((ts, ts))
        base = TILE_COLORS.get(tile, (80, 80, 80))
        surf.fill(base)

        import random
        rng = random.Random(tile * 97 + road_mask)
        for _ in range(ts // 2):
            px = rng.randint(0, ts - 1)
            py = rng.randint(0, ts - 1)
            shade = rng.randint(-12, 12)
            c = tuple(max(0, min(255, ch + shade)) for ch in base)
            surf.set_at((px, py), c)

        # --- Decorations per tile type ---
        if tile == TILE_GRASS:
            g = (90, 148, 72)
            pygame.draw.line(surf, g, (3, 3), (3, 1))
            pygame.draw.line(surf, g, (3, 3), (5, 1))
            pygame.draw.line(surf, g, (ts - 4, ts - 4), (ts - 4, ts - 6))

        elif tile == TILE_SIDEWALK:
            pygame.draw.rect(surf, (180, 180, 185), (0, 0, ts, ts), 1)

        elif tile in (TILE_WATER, TILE_RIVER):
            wc = (90, 150, 210)
            pygame.draw.line(surf, wc, (2, ts // 3),     (6, ts // 3))
            pygame.draw.line(surf, wc, (ts // 2, ts * 2 // 3), (ts // 2 + 5, ts * 2 // 3))

        elif tile == TILE_FOREST:
            tc = (25, 75, 30)
            cx, cy2 = ts // 2, ts // 2
            pygame.draw.polygon(surf, tc, [(cx, 2), (2, ts - 3), (ts - 2, ts - 3)])

        elif tile == TILE_MOUNTAIN:
            mc = (100, 95, 90)
            hc = (220, 220, 225)
            cx2 = ts // 2
            pygame.draw.polygon(surf, mc, [(cx2, 2), (2, ts - 2), (ts - 2, ts - 2)])
            pygame.draw.polygon(surf, hc, [(cx2, 2), (cx2 - 3, 8), (cx2 + 3, 8)])

        elif tile == TILE_SAND:
            sc = (195, 175, 115)
            for i in range(3):
                pygame.draw.circle(surf, sc, (4 + i * 4, 4 + i * 3), 1)

        elif tile == TILE_CONCRETE:
            pygame.draw.rect(surf, (150, 150, 153), (0, 0, ts, ts), 1)
            pygame.draw.line(surf, (155, 155, 158), (ts // 2, 0), (ts // 2, ts), 1)
            pygame.draw.line(surf, (155, 155, 158), (0, ts // 2), (ts, ts // 2), 1)

        elif tile == TILE_ROAD:
            # Road surface already filled; draw lane markings based on connections
            #   mask bit 0 = North, bit 1 = East, bit 2 = South, bit 3 = West
            n = bool(road_mask & 1)
            e = bool(road_mask & 2)
            s = bool(road_mask & 4)
            w = bool(road_mask & 8)
            lc = (235, 215, 80)   # lane marking yellow
            half = ts // 2

            # Cross or straight: draw centre dashes
            if (n or s) and not (e or w):
                # Vertical road
                for yy in range(2, ts - 2, 6):
                    pygame.draw.line(surf, lc, (half, yy), (half, min(yy + 3, ts - 2)), 1)
            elif (e or w) and not (n or s):
                # Horizontal road
                for xx in range(2, ts - 2, 6):
                    pygame.draw.line(surf, lc, (xx, half), (min(xx + 3, ts - 2), half), 1)
            else:
                # Intersection — small centre dot
                pygame.draw.rect(surf, lc, (half - 1, half - 1, 3, 3))

        self._tile_cache[cache_key] = surf
        return surf

    def _road_mask(self, tx: int, ty: int) -> int:
        """Bitmask: N=1, E=2, S=4, W=8 — neighbour is road-like."""
        mask = 0
        if self.world.get(tx, ty - 1) == TILE_ROAD: mask |= 1
        if self.world.get(tx + 1, ty) == TILE_ROAD: mask |= 2
        if self.world.get(tx, ty + 1) == TILE_ROAD: mask |= 4
        if self.world.get(tx - 1, ty) == TILE_ROAD: mask |= 8
        return mask

    # ------------------------------------------------------------------
    # Camera
    # ------------------------------------------------------------------
    def move_camera(self, dx: float, dy: float) -> None:
        """Pan camera in pixel space."""
        self.camera_x += dx
        self.camera_y += dy

    def clamp_camera(self, viewport_w: int, viewport_h: int) -> None:
        """Keep camera within world bounds."""
        ts = self._tile_size
        max_cx = self.world.width  * ts - viewport_w
        max_cy = self.world.height * ts - viewport_h
        self.camera_x = max(0.0, min(self.camera_x, max(0.0, float(max_cx))))
        self.camera_y = max(0.0, min(self.camera_y, max(0.0, float(max_cy))))

    # ------------------------------------------------------------------
    # Structure drawing
    # ------------------------------------------------------------------
    def _load_structure_image(self, bid: str) -> pygame.Surface | None:
        if bid in self._struct_cache:
            return self._struct_cache[bid]
        import os
        paths = [
            os.path.join("assets", "structures", f"{bid}.png"),
            os.path.join("assets", "ui", "kenney", "buttons", "png", f"{bid}.png"),
        ]
        ts = self._tile_size
        for path in paths:
            if os.path.exists(path):
                try:
                    img = pygame.image.load(path).convert_alpha()
                    scaled = pygame.transform.scale(img, (ts, ts))
                    self._struct_cache[bid] = scaled
                    return scaled
                except Exception:
                    pass
        self._struct_cache[bid] = None
        return None

    def _draw_placed_building(
        self, surface: pygame.Surface, sx: int, sy: int, bid: str, under_construction: bool
    ) -> None:
        ts = self._tile_size
        if under_construction:
            pygame.draw.rect(surface, (133, 88, 48), (sx + 1, sy + 1, ts - 2, ts - 2), 1)
            pygame.draw.line(surface, (133, 88, 48), (sx + 1, sy + 1), (sx + ts - 2, sy + ts - 2), 1)
            pygame.draw.line(surface, (133, 88, 48), (sx + ts - 2, sy + 1), (sx + 1, sy + ts - 2), 1)
            if ts >= 14:
                font = pygame.font.SysFont("consolas", max(6, ts // 2), bold=True)
                text = font.render("...", True, (212, 168, 62))
                surface.blit(text, text.get_rect(center=(sx + ts // 2, sy + ts // 2)))
            return

        img = self._load_structure_image(bid)
        if img:
            surface.blit(img, (sx, sy))
            return

        # --- Procedural pixel-art buildings ---
        b = BUILDING_ART.get(bid)
        if b:
            b(surface, sx, sy, ts)
        else:
            # Fallback coloured square
            col = _building_color(bid)
            pygame.draw.rect(surface, col, (sx + 2, sy + 2, ts - 4, ts - 4))
            pygame.draw.rect(surface, (30, 20, 10), (sx + 2, sy + 2, ts - 4, ts - 4), 1)

    # ------------------------------------------------------------------
    # Main draw
    # ------------------------------------------------------------------
    def draw(
        self,
        surface: pygame.Surface,
        dest: pygame.Rect,
        player: Any | None = None,
        owned_land: set[tuple[int, int]] | None = None,
        ghost_bid: str | None = None,
        ghost_valid: bool = True,
        ghost_reason: str = "",
    ) -> None:
        """
        Draw visible tiles into ``dest``.

        Args:
            surface:      Target surface.
            dest:         Viewport rectangle.
            player:       Active player for placed buildings.
            owned_land:   Set of (x,y) owned tiles.  Unowned tiles darkened.
            ghost_bid:    Building id for placement ghost (follows mouse).
            ghost_valid:  Whether ghost placement is currently valid.
            ghost_reason: Reason string shown in tooltip if invalid.
        """
        ts = self._tile_size
        start_tx = max(0, int(self.camera_x // ts))
        start_ty = max(0, int(self.camera_y // ts))
        end_tx   = min(self.world.width,  start_tx + dest.width  // ts + 2)
        end_ty   = min(self.world.height, start_ty + dest.height // ts + 2)

        # Lazy-init lock overlay
        if self._lock_overlay is None or self._lock_overlay.get_size() != (ts, ts):
            self._lock_overlay = pygame.Surface((ts, ts), pygame.SRCALPHA)
            self._lock_overlay.fill((0, 0, 0, 110))

        prev_clip = surface.get_clip()
        surface.set_clip(dest)

        try:
            for ty in range(start_ty, end_ty):
                for tx in range(start_tx, end_tx):
                    sx = int(tx * ts - self.camera_x) + dest.x
                    sy = int(ty * ts - self.camera_y) + dest.y

                    tile_type = self.world.get(tx, ty)
                    mask = self._road_mask(tx, ty) if tile_type == TILE_ROAD else 0
                    surface.blit(self._tile_surf(tile_type, mask), (sx, sy))

                    # Owned-land overlay
                    if owned_land is not None and (tx, ty) not in owned_land:
                        surface.blit(self._lock_overlay, (sx, sy))

                    # Placed buildings
                    if player:
                        for b in player.buildings:
                            if b.x == tx and b.y == ty:
                                self._draw_placed_building(
                                    surface, sx, sy, b.building_id,
                                    b.ready_at_game_seconds is not None
                                )
                                break

            # Ghost preview
            if ghost_bid:
                mx, my = pygame.mouse.get_pos()
                if dest.collidepoint((mx, my)):
                    tx = int((mx - dest.x + self.camera_x) // ts)
                    ty = int((my - dest.y + self.camera_y) // ts)
                    if 0 <= tx < self.world.width and 0 <= ty < self.world.height:
                        sx = int(tx * ts - self.camera_x) + dest.x
                        sy = int(ty * ts - self.camera_y) + dest.y
                        border_col = (80, 230, 80) if ghost_valid else (230, 80, 80)
                        pygame.draw.rect(surface, border_col, (sx, sy, ts, ts), 2)
                        ghost = pygame.Surface((ts, ts), pygame.SRCALPHA)
                        self._draw_placed_building(ghost, 0, 0, ghost_bid, False)
                        ghost.set_alpha(170)
                        surface.blit(ghost, (sx, sy))

        finally:
            surface.set_clip(prev_clip)

    # ------------------------------------------------------------------
    # Minimap
    # ------------------------------------------------------------------
    def draw_minimap(
        self,
        surface: pygame.Surface,
        dest: pygame.Rect,
        owned_land: set[tuple[int, int]] | None = None,
        viewport_rect: pygame.Rect | None = None,
    ) -> None:
        """
        Compact overview of the whole map.

        Args:
            surface:       Target surface.
            dest:          Minimap rectangle.
            owned_land:    Owned tiles highlighted brighter.
            viewport_rect: Current map viewport in pixel space, for camera indicator.
        """
        mini = pygame.Surface((self.world.width, self.world.height))
        for y in range(self.world.height):
            for x in range(self.world.width):
                tile = self.world.get(x, y)
                col = TILE_COLORS.get(tile, (0, 0, 0))
                # Darken unowned
                if owned_land is not None and (x, y) not in owned_land:
                    col = tuple(int(c * 0.45) for c in col)  # type: ignore
                mini.set_at((x, y), col)

        scaled = pygame.transform.scale(mini, dest.size)
        surface.blit(scaled, dest.topleft)

        # Camera viewport indicator
        if viewport_rect and dest.width > 0 and dest.height > 0:
            ts = self._tile_size
            scale_x = dest.width  / max(1, self.world.width)
            scale_y = dest.height / max(1, self.world.height)
            vx = int(self.camera_x / ts * scale_x)
            vy = int(self.camera_y / ts * scale_y)
            vw = int(viewport_rect.width  / ts * scale_x)
            vh = int(viewport_rect.height / ts * scale_y)
            vr = pygame.Rect(dest.x + vx, dest.y + vy, vw, vh)
            pygame.draw.rect(surface, (255, 255, 255), vr, 1)

        pygame.draw.rect(surface, (212, 168, 62), dest, 2)

    # ------------------------------------------------------------------
    # Screen → tile coord helper
    # ------------------------------------------------------------------
    def screen_to_tile(self, sx: int, sy: int, dest: pygame.Rect) -> tuple[int, int]:
        """Convert screen pixel position to tile coordinates."""
        ts = self._tile_size
        tx = int((sx - dest.x + self.camera_x) // ts)
        ty = int((sy - dest.y + self.camera_y) // ts)
        return tx, ty

    def minimap_to_camera(self, mx: int, my: int, mini_dest: pygame.Rect, viewport_w: int, viewport_h: int) -> None:
        """Click minimap → reposition camera to centre on that tile."""
        if mini_dest.width <= 0 or mini_dest.height <= 0:
            return
        ts = self._tile_size
        frac_x = (mx - mini_dest.x) / mini_dest.width
        frac_y = (my - mini_dest.y) / mini_dest.height
        tile_x  = frac_x * self.world.width
        tile_y  = frac_y * self.world.height
        self.camera_x = tile_x  * ts - viewport_w  / 2
        self.camera_y = tile_y  * ts - viewport_h  / 2
        self.clamp_camera(viewport_w, viewport_h)


# ---------------------------------------------------------------------------
# Procedural pixel-art building renderers
# ---------------------------------------------------------------------------
def _building_color(bid: str) -> tuple[int, int, int]:
    colours = {
        "house":        (170, 90, 70),
        "apartment":    (100, 130, 180),
        "villa":        (180, 160, 100),
        "shop":         (80,  150, 120),
        "food_cart":    (230, 110,  20),
        "campfire":     (200,  80,  30),
        "street_lamp":  (220, 220, 100),
        "fence":        (160, 120,  70),
        "car":          (60,  140, 200),
        "bus":          (240, 180,  30),
        "bridge":       (160, 130,  80),
        "hospital":     (240, 240, 240),
        "police":       (50,   80, 160),
        "fire_station": (200,  50,  40),
        "school":       (220, 180,  60),
        "warehouse":    (140, 100,  60),
        "farm":         (120, 160,  60),
        "windmill":     (180, 180, 200),
        "park":         (80,  170,  80),
        "statue":       (190, 180, 170),
        "power_plant":  (80,   80,  90),
        "workshop":     (130, 100,  70),
        "road":         (60,   60,  65),
        "sidewalk":     (200, 200, 205),
    }
    return colours.get(bid, (100, 100, 100))


def _draw_house(surf: pygame.Surface, sx: int, sy: int, ts: int) -> None:
    pygame.draw.rect(surf, (170, 70, 50), (sx + 2, sy + 6, ts - 4, ts - 8))
    pygame.draw.polygon(surf, (140, 50, 40), [(sx + 1, sy + 7), (sx + ts // 2, sy + 1), (sx + ts - 1, sy + 7)])
    if ts >= 16:
        pygame.draw.rect(surf, (150, 210, 255), (sx + 3, sy + 9, 4, 4))
        pygame.draw.rect(surf, (30, 20, 10),    (sx + 3, sy + 9, 4, 4), 1)


def _draw_apartment(surf: pygame.Surface, sx: int, sy: int, ts: int) -> None:
    pygame.draw.rect(surf, (100, 130, 180), (sx + 2, sy + 3, ts - 4, ts - 5))
    if ts >= 16:
        for row in range(2):
            for col2 in range(2):
                wx = sx + 3 + col2 * (ts // 3)
                wy = sy + 4 + row * 5
                pygame.draw.rect(surf, (200, 230, 255), (wx, wy, 3, 3))


def _draw_shop(surf: pygame.Surface, sx: int, sy: int, ts: int) -> None:
    pygame.draw.rect(surf, (80, 150, 120), (sx + 1, sy + 5, ts - 2, ts - 6))
    pygame.draw.rect(surf, (160, 220, 255), (sx + 2, sy + 7, ts - 4, 5))
    for ax in range(1, ts - 1, 3):
        col = (50, 140, 60) if (ax // 3) % 2 == 0 else (240, 240, 240)
        pygame.draw.rect(surf, col, (sx + ax, sy + 2, 3, 4))


def _draw_food_cart(surf: pygame.Surface, sx: int, sy: int, ts: int) -> None:
    pygame.draw.rect(surf, (230, 110, 20), (sx + 3, sy + ts - 7, ts - 6, 5))
    pygame.draw.circle(surf, (20, 20, 20), (sx + 5, sy + ts - 2), 2)
    pygame.draw.circle(surf, (20, 20, 20), (sx + ts - 5, sy + ts - 2), 2)
    pygame.draw.line(surf, (120, 120, 120), (sx + ts // 2, sy + 2), (sx + ts // 2, sy + ts - 7), 1)
    pygame.draw.polygon(surf, (190, 40, 40), [(sx + ts // 2, sy), (sx + 1, sy + 4), (sx + ts - 2, sy + 4)])


def _draw_campfire(surf: pygame.Surface, sx: int, sy: int, ts: int) -> None:
    pygame.draw.circle(surf, (60, 40, 20),  (sx + ts // 2, sy + ts - 3), ts // 4)
    pygame.draw.polygon(surf, (240, 80, 20),  [(sx + ts // 2, sy + 2), (sx + ts // 2 - 3, sy + ts - 5), (sx + ts // 2 + 3, sy + ts - 5)])
    pygame.draw.polygon(surf, (255, 160, 30), [(sx + ts // 2, sy + 5), (sx + ts // 2 - 2, sy + ts - 5), (sx + ts // 2 + 2, sy + ts - 5)])


def _draw_street_lamp(surf: pygame.Surface, sx: int, sy: int, ts: int) -> None:
    pygame.draw.line(surf, (120, 120, 125), (sx + ts // 2, sy + ts - 1), (sx + ts // 2, sy + 3), 2)
    pygame.draw.line(surf, (120, 120, 125), (sx + ts // 2, sy + 3), (sx + ts - 3, sy + 3), 2)
    pygame.draw.circle(surf, (255, 235, 120), (sx + ts - 3, sy + 3), 2)
    light = pygame.Surface((ts, ts), pygame.SRCALPHA)
    pygame.draw.polygon(light, (255, 255, 100, 45), [(ts - 3, 3), (0, ts), (ts, ts)])
    surf.blit(light, (sx, sy))


def _draw_fence(surf: pygame.Surface, sx: int, sy: int, ts: int) -> None:
    pygame.draw.rect(surf, (160, 120, 70), (sx + 1, sy + ts // 2 - 1, ts - 2, 3))
    for px in range(2, ts - 1, 4):
        pygame.draw.rect(surf, (140, 100, 55), (sx + px, sy + 4, 2, ts - 8))


def _draw_car(surf: pygame.Surface, sx: int, sy: int, ts: int) -> None:
    for ox, oy in [(1, 2), (ts - 3, 2), (1, ts - 4), (ts - 3, ts - 4)]:
        pygame.draw.rect(surf, (10, 10, 10), (sx + ox, sy + oy, 2, 2))
    col = (60, 140, 200)
    pygame.draw.rect(surf, col, (sx + 2, sy + 1, ts - 4, ts - 2), border_radius=2)
    pygame.draw.rect(surf, (20, 20, 20), (sx + 4, sy + 3, ts - 8, ts - 8), border_radius=1)


def _draw_bus(surf: pygame.Surface, sx: int, sy: int, ts: int) -> None:
    pygame.draw.rect(surf, (240, 180, 30), (sx + 1, sy + 2, ts - 2, ts - 4), border_radius=2)
    if ts >= 16:
        for col3 in range(2):
            pygame.draw.rect(surf, (180, 220, 255), (sx + 3 + col3 * 5, sy + 4, 4, 5))
    for ox in [(1, ts - 3), (ts - 3, ts - 3)]:
        pygame.draw.rect(surf, (10, 10, 10), (sx + ox[0], sy + ox[1], 2, 2))


def _draw_bridge(surf: pygame.Surface, sx: int, sy: int, ts: int) -> None:
    pygame.draw.rect(surf, (180, 150, 90), (sx + 1, sy + ts // 2 - 2, ts - 2, 5))
    pygame.draw.line(surf, (140, 110, 60), (sx + 1, sy + ts // 2 - 2), (sx + 1, sy + ts // 2 + 2), 2)
    pygame.draw.line(surf, (140, 110, 60), (sx + ts - 2, sy + ts // 2 - 2), (sx + ts - 2, sy + ts // 2 + 2), 2)


def _draw_hospital(surf: pygame.Surface, sx: int, sy: int, ts: int) -> None:
    pygame.draw.rect(surf, (230, 230, 235), (sx + 2, sy + 3, ts - 4, ts - 5))
    red = (200, 40, 40)
    cx2, cy2 = sx + ts // 2, sy + ts // 2
    pygame.draw.rect(surf, red, (cx2 - 1, cy2 - 4, 3, 8))
    pygame.draw.rect(surf, red, (cx2 - 4, cy2 - 1, 8, 3))


def _draw_police(surf: pygame.Surface, sx: int, sy: int, ts: int) -> None:
    pygame.draw.rect(surf, (50, 80, 160), (sx + 2, sy + 3, ts - 4, ts - 5))
    if ts >= 16:
        pygame.draw.rect(surf, (200, 230, 255), (sx + 3, sy + 5, 4, 4))
        pygame.draw.rect(surf, (200, 230, 255), (sx + ts - 7, sy + 5, 4, 4))


def _draw_fire_station(surf: pygame.Surface, sx: int, sy: int, ts: int) -> None:
    pygame.draw.rect(surf, (200, 50, 40), (sx + 1, sy + 2, ts - 2, ts - 3))
    if ts >= 16:
        pygame.draw.rect(surf, (255, 200, 50), (sx + 3, sy + ts - 7, ts - 6, 5))


def _draw_school(surf: pygame.Surface, sx: int, sy: int, ts: int) -> None:
    pygame.draw.rect(surf, (220, 180, 60), (sx + 2, sy + 4, ts - 4, ts - 6))
    pygame.draw.polygon(surf, (190, 140, 40), [(sx + 1, sy + 5), (sx + ts // 2, sy + 1), (sx + ts - 1, sy + 5)])


def _draw_warehouse(surf: pygame.Surface, sx: int, sy: int, ts: int) -> None:
    pygame.draw.rect(surf, (140, 100, 60), (sx + 1, sy + 4, ts - 2, ts - 5))
    pygame.draw.rect(surf, (160, 120, 80), (sx + 1, sy + 2, ts - 2, 4))
    if ts >= 16:
        pygame.draw.rect(surf, (100, 70, 40), (sx + 4, sy + ts - 7, ts - 8, 6))


def _draw_farm(surf: pygame.Surface, sx: int, sy: int, ts: int) -> None:
    pygame.draw.rect(surf, (90, 140, 60), (sx + 1, sy + 1, ts - 2, ts - 2))
    soil = (120, 90, 50)
    for row in range(3):
        pygame.draw.line(surf, soil, (sx + 2, sy + 3 + row * (ts // 4)), (sx + ts - 2, sy + 3 + row * (ts // 4)), 1)


def _draw_windmill(surf: pygame.Surface, sx: int, sy: int, ts: int) -> None:
    cx2, cy2 = sx + ts // 2, sy + ts // 2
    pygame.draw.rect(surf, (180, 180, 200), (cx2 - 1, cy2, 2, ts // 2))
    pygame.draw.line(surf, (140, 140, 160), (cx2, cy2), (cx2, sy + 2), 2)
    pygame.draw.line(surf, (140, 140, 160), (cx2, cy2), (sx + 2, cy2), 2)
    pygame.draw.line(surf, (140, 140, 160), (cx2, cy2), (sx + ts - 2, cy2), 2)


def _draw_park(surf: pygame.Surface, sx: int, sy: int, ts: int) -> None:
    pygame.draw.rect(surf, (80, 170, 80), (sx + 1, sy + 1, ts - 2, ts - 2))
    pygame.draw.circle(surf, (50, 140, 50), (sx + ts // 2, sy + ts // 2), ts // 3)
    pygame.draw.circle(surf, (70, 160, 70), (sx + ts // 4, sy + ts // 4), ts // 5)


def _draw_statue(surf: pygame.Surface, sx: int, sy: int, ts: int) -> None:
    cx2, cy2 = sx + ts // 2, sy + ts // 2
    pygame.draw.rect(surf, (170, 160, 150), (cx2 - 2, cy2, 4, ts // 3))
    pygame.draw.circle(surf, (190, 180, 170), (cx2, cy2 - 2), ts // 5)


def _draw_power_plant(surf: pygame.Surface, sx: int, sy: int, ts: int) -> None:
    pygame.draw.rect(surf, (80, 80, 90), (sx + 1, sy + ts // 3, ts - 2, ts - ts // 3 - 1))
    # Chimney
    pygame.draw.rect(surf, (100, 100, 110), (sx + ts // 4, sy + 2, ts // 5, ts // 3))
    pygame.draw.rect(surf, (100, 100, 110), (sx + ts // 2, sy + 2, ts // 5, ts // 3))


def _draw_workshop(surf: pygame.Surface, sx: int, sy: int, ts: int) -> None:
    pygame.draw.rect(surf, (130, 100, 70), (sx + 2, sy + 4, ts - 4, ts - 6))
    pygame.draw.polygon(surf, (100, 75, 50), [(sx + 1, sy + 5), (sx + ts // 2, sy + 1), (sx + ts - 1, sy + 5)])
    if ts >= 16:
        pygame.draw.rect(surf, (60, 50, 40), (sx + 4, sy + ts - 7, ts - 8, 6))


BUILDING_ART = {
    "house":        _draw_house,
    "apartment":    _draw_apartment,
    "villa":        _draw_house,          # reuse house shape tinted differently
    "shop":         _draw_shop,
    "food_cart":    _draw_food_cart,
    "campfire":     _draw_campfire,
    "street_lamp":  _draw_street_lamp,
    "fence":        _draw_fence,
    "car":          _draw_car,
    "bus":          _draw_bus,
    "bridge":       _draw_bridge,
    "hospital":     _draw_hospital,
    "police":       _draw_police,
    "fire_station": _draw_fire_station,
    "school":       _draw_school,
    "warehouse":    _draw_warehouse,
    "farm":         _draw_farm,
    "windmill":     _draw_windmill,
    "park":         _draw_park,
    "statue":       _draw_statue,
    "power_plant":  _draw_power_plant,
    "workshop":     _draw_workshop,
}
