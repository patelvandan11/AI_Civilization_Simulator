"""
Drag-and-drop session state for inventory and hotbar slots.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional

import pygame

from ui.theme import Theme


@dataclass(slots=True)
class DragPayload:
    """
    Metadata representation of an item stack in mid-drag.
    """
    item_id: str
    count: int
    source_index: int
    source_panel: str  # "inventory" or "hotbar" to identify origins
    icon: Optional[pygame.Surface] = None


class DragDropController:
    """
    Manages active drag-and-drop sessions across inventory grids and hotbars.
    Only one stack can be dragged at a time.
    """

    def __init__(self) -> None:
        self.payload: Optional[DragPayload] = None
        self.cursor_pos: tuple[int, int] = (0, 0)
        self.split_mode: bool = False

    @property
    def active(self) -> bool:
        """True if an item stack is currently held on the cursor."""
        return self.payload is not None

    def begin(
        self,
        item_id: str,
        count: int,
        source_index: int,
        source_panel: str,
        pos: tuple[int, int],
        *,
        split: bool = False,
        icon: pygame.Surface | None = None,
    ) -> None:
        """
        Initiate a drag session.

        Args:
            item_id: ID of the dragged item.
            count: Quantity of the dragged stack.
            source_index: Index of the source slot.
            source_panel: Origin indicator ("inventory" or "hotbar").
            pos: Current screen coordinates of the cursor.
            split: True if only half of the stack is dragged.
            icon: Surface representing the item icon.
        """
        # If splitting, take half (minimum 1), leaving the rest in the source slot.
        drag_count = max(1, count // 2) if split and count > 1 else count
        self.split_mode = split
        self.payload = DragPayload(
            item_id=item_id,
            count=drag_count,
            source_index=source_index,
            source_panel=source_panel,
            icon=icon,
        )
        self.cursor_pos = pos

    def update_pos(self, pos: tuple[int, int]) -> None:
        """
        Update the current cursor position.

        Args:
            pos: Screen-space coordinates.
        """
        self.cursor_pos = pos

    def clear(self) -> None:
        """
        Reset and clear the current drag session.
        """
        self.payload = None
        self.split_mode = False

    def draw_ghost(self, surface: pygame.Surface, scale: float = 1.0, theme: Optional[Theme] = None) -> None:
        """
        Draw a premium ghost representation of the dragged item under the cursor.

        Args:
            surface: Target pygame surface.
            scale: UI scale factor.
            theme: Theme provider.
        """
        if self.payload is None:
            return

        t = theme or Theme.default()
        size = max(24, int(40 * scale))
        x, y = self.cursor_pos

        # Define bounds centered on the cursor
        rect = pygame.Rect(x - size // 2, y - size // 2, size, size)

        # 1. Draw Drop Shadow
        shadow_offset = max(2, int(3 * scale))
        shadow_rect = rect.move(shadow_offset, shadow_offset)
        shadow_surface = pygame.Surface(shadow_rect.size, pygame.SRCALPHA)
        pygame.draw.rect(
            shadow_surface,
            (0, 0, 0, 100),
            shadow_surface.get_rect(),
            border_radius=max(2, int(4 * scale))
        )
        surface.blit(shadow_surface, shadow_rect.topleft)

        # 2. Draw Main Ghost Box (Semi-transparent background)
        ghost_surface = pygame.Surface(rect.size, pygame.SRCALPHA)
        bg_color = (*t.colors.panel_bg_dark, 180)  # semi-transparent dark wood
        border_color = (*t.colors.border_gold, 220)  # semi-transparent gold
        border_width = max(1, int(2.5 * scale))
        radius = max(2, int(4 * scale))

        pygame.draw.rect(ghost_surface, bg_color, ghost_surface.get_rect(), border_radius=radius)
        pygame.draw.rect(ghost_surface, border_color, ghost_surface.get_rect(), width=border_width, border_radius=radius)

        # 3. Draw Icon
        if self.payload.icon is not None:
            icon_padding = max(2, int(4 * scale))
            icon_size = size - icon_padding * 2
            try:
                scaled_icon = pygame.transform.smoothscale(self.payload.icon, (icon_size, icon_size))
            except pygame.error:
                scaled_icon = pygame.transform.scale(self.payload.icon, (icon_size, icon_size))
            
            # Ensure transparency is preserved
            ghost_surface.blit(scaled_icon, (icon_padding, icon_padding))
        else:
            # Fallback text abbreviation
            font_size = max(10, int(12 * scale))
            font = pygame.font.SysFont("consolas", font_size, bold=True)
            text_surf = font.render(self.payload.item_id[:2].upper(), True, t.colors.text_primary)
            text_rect = text_surf.get_rect(center=ghost_surface.get_rect().center)
            ghost_surface.blit(text_surf, text_rect)

        # Blit the accumulated ghost elements to screen
        surface.blit(ghost_surface, rect.topleft)

        # 4. Draw Stack Count (Overlayed above the ghost container)
        if self.payload.count > 1:
            cnt_font_size = max(8, int(11 * scale))
            cnt_font = pygame.font.SysFont("consolas", cnt_font_size, bold=True)
            cnt_str = str(self.payload.count)
            
            # Draw tiny shadow behind stack count text
            cnt_shadow = cnt_font.render(cnt_str, True, (0, 0, 0))
            cnt_text = cnt_font.render(cnt_str, True, t.colors.border_gold)
            
            cx = rect.right - cnt_text.get_width() - max(2, int(3 * scale))
            cy = rect.bottom - cnt_text.get_height() - max(1, int(2 * scale))
            
            surface.blit(cnt_shadow, (cx + 1, cy + 1))
            surface.blit(cnt_text, (cx, cy))
