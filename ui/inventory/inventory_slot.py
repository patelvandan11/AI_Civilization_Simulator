"""
Single inventory / hotbar slot with hover animation, rarity borders, durability, and favorite stars.
"""

from __future__ import annotations

import os
from typing import Any, Callable, Optional

import pygame

from ui.inventory.dragdrop import DragDropController
from ui.styles import DEFAULT_STYLES, SlotStyle
from ui.theme import Theme
from ui.widgets.base import Widget

# Global icon cache to avoid loading images from disk every frame
_ICON_CACHE: dict[str, pygame.Surface] = {}


def load_item_icon(item_id: str, size: int) -> Optional[pygame.Surface]:
    """
    Search and load item icon from asset directories, caching results.
    """
    cache_key = f"{item_id}_{size}"
    if cache_key in _ICON_CACHE:
        return _ICON_CACHE[cache_key]

    # Search paths for assets (supports both .jpg and .png extensions)
    search_paths = []
    folders = [
        os.path.join("assets", "ui", "kenney", "buttons"),
        os.path.join("assets", "ui", "kenney", "buttons", "Fruits"),
        os.path.join("assets", "ui", "kenney", "buttons", "product"),
        os.path.join("assets", "ui", "kenney", "buttons", "veggies"),
        os.path.join("assets", "ui", "kenney", "buttons", "png"),
    ]
    for folder in folders:
        search_paths.append(os.path.join(folder, f"{item_id}.jpg"))
        search_paths.append(os.path.join(folder, f"{item_id}.png"))

    # Additional manual mappings for common gameplay items to Kenney assets
    mappings = {
        "wood": os.path.join("assets", "ui", "kenney", "buttons", "home.jpg"),
        "stone": os.path.join("assets", "ui", "kenney", "buttons", "map_location.jpg"),
        "fiber": os.path.join("assets", "ui", "kenney", "buttons", "tea.jpg"),
        "apple_seed": os.path.join("assets", "ui", "kenney", "buttons", "png", "apple_seed.png"),
        "wheat_seed": os.path.join("assets", "ui", "kenney", "buttons", "png", "wheat_seed.png"),
        "corn": os.path.join("assets", "ui", "kenney", "buttons", "corn.jpg"),
        "water": os.path.join("assets", "ui", "kenney", "buttons", "water_bottle.jpg"),
        "wheat": os.path.join("assets", "ui", "kenney", "buttons", "png", "wheat.png"),
        "watermelon": os.path.join("assets", "ui", "kenney", "buttons", "Fruits", "water_mealon.jpg"),
        "bread": os.path.join("assets", "ui", "kenney", "buttons", "bread.jpg"),
        "wooden_axe": os.path.join("assets", "ui", "kenney", "buttons", "swatter.jpg"),
        "wool": os.path.join("assets", "ui", "kenney", "buttons", "wool.jpg"),
        "swatter": os.path.join("assets", "ui", "kenney", "buttons", "swatter.jpg"),
    }

    path = None
    # 1. Check mapping
    if item_id in mappings:
        path = mappings[item_id]
    else:
        # 2. Check search paths
        for p in search_paths:
            if os.path.isfile(p):
                path = p
                break

    if path and os.path.isfile(path):
        try:
            surf = pygame.image.load(path).convert_alpha()
            # Convert dark black pixels/backgrounds or make it rounded/clean
            surf = pygame.transform.smoothscale(surf, (size, size))
            _ICON_CACHE[cache_key] = surf
            return surf
        except pygame.error:
            pass

    # If the item is a seed and we don't have a direct image for it, build a custom Seed Packet icon!
    if item_id.endswith("_seed"):
        crop_id = item_id.replace("_seed", "")
        # Try to get the crop icon (half size of slot)
        crop_icon = load_item_icon(crop_id, size // 2)
        
        # Create a packet surface
        surf = pygame.Surface((size, size), pygame.SRCALPHA)
        
        # Draw paper bag background
        bag_color = (205, 170, 125) # tan paper color
        border_color = (139, 105, 75)
        
        margin = max(2, size // 10)
        bag_rect = pygame.Rect(margin, margin, size - margin * 2, size - margin * 2)
        pygame.draw.rect(surf, bag_color, bag_rect, border_radius=max(1, size // 12))
        pygame.draw.rect(surf, border_color, bag_rect, width=max(1, size // 20), border_radius=max(1, size // 12))
        
        # Draw top packet flap folding lines
        pygame.draw.line(surf, border_color, (margin, margin + size // 5), (size - margin, margin + size // 5))
        
        # Blit the crop icon inside
        if crop_icon:
            surf.blit(crop_icon, crop_icon.get_rect(center=(size // 2, size // 2 + size // 12)).topleft)
            
        _ICON_CACHE[cache_key] = surf
        return surf

    return None


class InventorySlot(Widget):
    """
    High-fidelity inventory slot supporting:
    - Smooth scaling & border width hover transitions.
    - Dynamic rarity border coloring.
    - Durability bar display for tools.
    - Favorite star indicator.
    - Full drag-drop integration.
    """

    def __init__(
        self,
        index: int,
        *,
        x: float = 0.0,
        y: float = 0.0,
        style: SlotStyle | None = None,
        theme: Theme | None = None,
        drag: DragDropController | None = None,
        on_change: Callable[[], None] | None = None,
        on_hover_item: Callable[[dict[str, Any] | None, tuple[int, int]], None] | None = None,
        on_right_click: Callable[[int], None] | None = None,
        name: str = "",
    ) -> None:
        self.style = style or DEFAULT_STYLES.slot
        t = theme or DEFAULT_STYLES.theme
        size = float(self.style.size)

        super().__init__(
            x,
            y,
            size,
            size,
            theme=t,
            name=name or f"Slot[{index}]",
            layer=t.layers.icons,
        )
        self.index = index
        self.item_id: str | None = None
        self.count: int = 0
        self.item_meta: dict[str, Any] = {}
        self.selected = False
        self.is_favorite = False
        self.is_hotbar = False

        self.drag = drag if drag is not None else DragDropController()
        self.on_change = on_change
        self.on_hover_item = on_hover_item
        self.on_right_click = on_right_click

        self._preferred_size = (size, size)
        self._min_size = (size, size)

        # Hover animation timing
        self._hover_t = 0.0  # 0.0 -> 1.0

    def set_stack(self, item_id: str | None, count: int, meta: dict[str, Any] | None = None) -> None:
        """
        Assign item contents to this slot.
        """
        self.item_id = item_id if count > 0 else None
        self.count = count if item_id else 0
        self.item_meta = meta or {}

    def get_rarity(self) -> str:
        """
        Determine item rarity from value or metadata.
        """
        if not self.item_id:
            return "Common"
        if "rarity" in self.item_meta:
            return str(self.item_meta["rarity"])
        
        value = int(self.item_meta.get("value", 1))
        # Hardcoded semantic rules for default catalog values
        if self.item_id in ("wooden_axe", "stone_pick"):
            return "Epic"
        if value >= 25:
            return "Epic"
        elif value >= 10:
            return "Rare"
        return "Common"

    def get_rarity_color(self) -> tuple[int, int, int]:
        """
        Get the border color associated with the item's rarity.
        """
        rarity = self.get_rarity()
        if rarity == "Legendary":
            return (240, 160, 30)  # Orange/Gold
        elif rarity == "Epic":
            return (150, 80, 200)  # Purple
        elif rarity == "Rare":
            return (55, 130, 210)  # Blue
        return self.style.border  # Common (Default)

    def get_durability(self) -> Optional[float]:
        """
        Return item durability ratio (0.0 to 1.0) if applicable.
        """
        if not self.item_id:
            return None
        
        # Tools have durability
        is_tool = self.item_meta.get("max_stack", 99) == 1
        if is_tool or self.item_id in ("wooden_axe", "stone_pick", "torch"):
            raw_dur = self.item_meta.get("durability", "-")
            if isinstance(raw_dur, (int, float)):
                return float(raw_dur)
            # Render a default nice durability ratio for visual completeness
            # based on item ID hash to look realistic
            val = (hash(self.item_id) % 40 + 60) / 100.0
            return val
        return None

    def _handle_event(self, event: pygame.event.Event) -> bool:
        """Mouse movement, clicking, and dragging."""
        if event.type == pygame.MOUSEMOTION:
            inside = self.contains_screen_point(event.pos)
            if inside and not self._hover:
                self._hover = True
                if self.on_hover_enter:
                    self.on_hover_enter(self)
            elif not inside and self._hover:
                self._hover = False
                if self.on_hover_exit:
                    self.on_hover_exit(self)

            if self.drag.active:
                self.drag.update_pos(event.pos)

            # Fire tooltip hover callbacks
            if inside and self.on_hover_item:
                if self.item_id:
                    data = {
                        "name": self.item_meta.get("name", self.item_id),
                        "description": self.item_meta.get("description", ""),
                        "weight": self.item_meta.get("weight", "-"),
                        "value": self.item_meta.get("value", "-"),
                        "durability": self.get_durability(),
                        "stack": self.count,
                        "item_id": self.item_id,
                        "category": self.item_meta.get("category", "General"),
                        "rarity": self.get_rarity(),
                        "is_favorite": self.is_favorite,
                    }
                    self.on_hover_item(data, event.pos)
                else:
                    self.on_hover_item(None, event.pos)
            return False

        if event.type == pygame.MOUSEBUTTONDOWN:
            if not self.contains_screen_point(event.pos):
                return False

            if event.button == 3:  # Right-click
                if self.on_right_click:
                    self.on_right_click(self.index)
                return True

            if event.button == 1:  # Left-click
                mods = pygame.key.get_mods()
                split = bool(mods & pygame.KMOD_SHIFT) or bool(mods & pygame.KMOD_CTRL)
                
                # If dragging an item, try to drop it here
                if self.drag.active:
                    self._accept_drop()
                    return True
                
                # Else pick up item
                if self.item_id and self.count > 0:
                    icon_surf = load_item_icon(self.item_id, self.theme.scaled(self.style.icon_size, self._scale))
                    self.drag.begin(
                        item_id=self.item_id,
                        count=self.count,
                        source_index=self.index,
                        source_panel="hotbar" if self.is_hotbar else "inventory",
                        pos=event.pos,
                        split=split,
                        icon=icon_surf,
                    )
                    return True
                return True

        if event.type == pygame.MOUSEBUTTONUP and event.button == 1:
            if self.drag.active and self.contains_screen_point(event.pos):
                # Only drop if dropped from a different slot
                if self.drag.payload and (self.drag.payload.source_index != self.index or self.drag.payload.source_panel != ("hotbar" if self.is_hotbar else "inventory")):
                    self._accept_drop()
                    return True

        return False

    def _accept_drop(self) -> None:
        """Inform slot manager that a drop occurred."""
        if self.on_change:
            self.on_change()

    def _update(self, dt: float) -> None:
        """Animate hover scale state."""
        speed = 10.0
        if self._hover:
            self._hover_t = min(1.0, self._hover_t + speed * dt)
        else:
            self._hover_t = max(0.0, self._hover_t - speed * dt)

    def _draw_star(self, surface: pygame.Surface, center: tuple[int, int], radius: int, color: tuple[int, int, int]) -> None:
        """Draw a beautiful vector gold star in top corner."""
        import math
        points = []
        for i in range(10):
            r = radius if i % 2 == 0 else radius // 2
            angle = i * math.pi / 5 - math.pi / 2
            x = center[0] + r * math.cos(angle)
            y = center[1] + r * math.sin(angle)
            points.append((x, y))
        pygame.draw.polygon(surface, color, points)
        pygame.draw.polygon(surface, self.theme.colors.border_dark, points, width=1)

    def _draw(self, surface: pygame.Surface) -> None:
        """Draw slot frame, borders, item icons, durability bars, count numbers."""
        sr = self.screen_rect
        s = self._scale

        # Compute dynamic scale factor from hover animation (1.0 to 1.06)
        anim_scale = 1.0 + self._hover_t * 0.06
        width_scaled = int(sr.width * anim_scale)
        height_scaled = int(sr.height * anim_scale)
        
        # Center the hovered slot rect to maintain grid alignment
        dx = (width_scaled - sr.width) // 2
        dy = (height_scaled - sr.height) // 2
        draw_rect = pygame.Rect(sr.x - dx, sr.y - dy, width_scaled, height_scaled)

        radius = max(2, self.theme.scaled(self.style.corner_radius, s))
        border_w = max(1, self.theme.scaled(self.style.border_width, s))

        # Background surface
        bg = self.style.empty if not self.item_id else self.style.background
        slot_surf = pygame.Surface(draw_rect.size, pygame.SRCALPHA)
        pygame.draw.rect(slot_surf, (*bg, self._alpha), slot_surf.get_rect(), border_radius=radius)

        # Border color selection (Selected > Hover > Rarity Border)
        border = self.get_rarity_color()
        if self.selected:
            border = self.style.selected
        elif self._hover:
            border = self.style.hover
        
        # Grow border width on hover
        border_thickness = border_w
        if self.selected or self._hover:
            border_thickness += max(1, int(1 * s))

        pygame.draw.rect(
            slot_surf,
            (*border, self._alpha),
            slot_surf.get_rect(),
            width=border_thickness,
            border_radius=radius,
        )

        # Render Item Contents
        if self.item_id:
            icon_size = self.theme.scaled(self.style.icon_size, s)
            icon_surf = load_item_icon(self.item_id, icon_size)

            if icon_surf:
                # Hover zoom icon slightly
                if self._hover_t > 0:
                    zoom_size = int(icon_size * (1.0 + self._hover_t * 0.1))
                    try:
                        icon_render = pygame.transform.smoothscale(icon_surf, (zoom_size, zoom_size))
                    except pygame.error:
                        icon_render = pygame.transform.scale(icon_surf, (zoom_size, zoom_size))
                else:
                    icon_render = icon_surf

                icon_rect = icon_render.get_rect(center=slot_surf.get_rect().center)
                slot_surf.blit(icon_render, icon_rect.topleft)
            else:
                # Text fallback on gradient category colors
                font_size = max(8, self.theme.scaled(self.theme.fonts.size_small, s))
                font = pygame.font.SysFont("consolas", font_size, bold=True)
                letter = font.render(self.item_id[:2].upper(), True, self.theme.colors.text_primary)
                letter_rect = letter.get_rect(center=slot_surf.get_rect().center)
                slot_surf.blit(letter, letter_rect.topleft)

            # Rarity corner tag / icon decoration
            rarity = self.get_rarity()
            if rarity in ("Epic", "Legendary"):
                # Draw small colored dot in top-left corner
                dot_radius = max(2, int(3 * s))
                pygame.draw.circle(slot_surf, border, (dot_radius + 4, dot_radius + 4), dot_radius)

            # Durability bar
            dur_ratio = self.get_durability()
            if dur_ratio is not None:
                # Draw small progress bar at the bottom of the slot
                bar_h = max(2, int(3.5 * s))
                bar_w = slot_surf.get_width() - border_thickness * 2 - 4
                bar_x = border_thickness + 2
                bar_y = slot_surf.get_height() - border_thickness - bar_h - 2
                
                # Color based on health: Green -> Yellow -> Red
                if dur_ratio > 0.5:
                    dur_color = (120, 200, 100)
                elif dur_ratio > 0.2:
                    dur_color = (230, 200, 50)
                else:
                    dur_color = (220, 80, 70)
                
                # Draw background track
                pygame.draw.rect(slot_surf, (30, 15, 10), (bar_x, bar_y, bar_w, bar_h))
                # Draw filled bar
                pygame.draw.rect(slot_surf, dur_color, (bar_x, bar_y, int(bar_w * dur_ratio), bar_h))

        surface.blit(slot_surf, draw_rect.topleft)

        # Draw Stack Count (above slot surface for layering overlay)
        if self.item_id and self.count > 1:
            cnt_font_size = max(8, self.theme.scaled(self.style.stack_font_size, s))
            cnt_font = pygame.font.SysFont("consolas", cnt_font_size, bold=True)
            cnt_str = str(self.count)
            
            # Stack count shadow
            cnt_shadow = cnt_font.render(cnt_str, True, (20, 12, 8))
            cnt = cnt_font.render(cnt_str, True, self.style.stack_color)
            
            cx = draw_rect.right - cnt.get_width() - max(2, int(4 * s))
            cy = draw_rect.bottom - cnt.get_height() - max(2, int(3 * s))
            
            surface.blit(cnt_shadow, (cx + 1, cy + 1))
            surface.blit(cnt, (cx, cy))

        # Draw Favorite Star in top right corner if favorited
        if self.item_id and self.is_favorite:
            star_radius = max(3, int(4.5 * s))
            star_x = draw_rect.right - star_radius - max(2, int(4 * s))
            star_y = draw_rect.y + star_radius + max(2, int(4 * s))
            self._draw_star(surface, (star_x, star_y), star_radius, (245, 210, 60))
