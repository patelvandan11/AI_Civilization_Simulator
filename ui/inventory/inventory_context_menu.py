"""
Right-click context menu for inventory and hotbar slots.
"""

from __future__ import annotations

from typing import Callable, Optional, Sequence

import pygame

from ui.styles import DEFAULT_STYLES
from ui.theme import Theme
from ui.widgets.base import Widget


class InventoryContextMenu(Widget):
    """
    Pop-up menu for slots. Handles option hovering, execution, and click-outside dismissal.
    """

    def __init__(
        self,
        options: Sequence[tuple[str, Callable[[], None]]],
        *,
        x: float,
        y: float,
        theme: Theme | None = None,
        on_close: Callable[[], None] | None = None,
    ) -> None:
        """
        Create a context menu.

        Args:
            options: List of (label, callback) tuples.
            x: Logical x coordinate.
            y: Logical y coordinate.
            theme: Theme injection.
            on_close: Callback when the menu is closed/dismissed.
        """
        self.t = theme or DEFAULT_STYLES.theme
        self.options = options
        self.on_close = on_close

        # Compute sizing based on options
        self.item_height = 24.0
        self.padding = 6.0
        width = 120.0
        height = len(options) * self.item_height + self.padding * 2

        super().__init__(
            x,
            y,
            width,
            height,
            theme=self.t,
            name="InventoryContextMenu",
            layer=self.t.layers.windows + 50,  # Ensure it renders above normal windows/panels
        )
        self.selected_index: Optional[int] = None
        self._preferred_size = (width, height)

    def _handle_event(self, event: pygame.event.Event) -> bool:
        """Handle clicks, hovering, and close actions."""
        # 1. Close on click outside
        if event.type == pygame.MOUSEBUTTONDOWN:
            if not self.contains_screen_point(event.pos):
                self._dismiss()
                return False  # Let the click propagate to click targets outside

            # Click inside: compute which item was clicked
            s = self._scale
            local_y = (event.pos[1] - self.screen_rect.y) / s - self.padding
            idx = int(local_y // self.item_height)
            if 0 <= idx < len(self.options) and event.button == 1:
                # Trigger action
                label, cb = self.options[idx]
                cb()
                self._dismiss()
                return True

        # 2. Hover logic
        if event.type == pygame.MOUSEMOTION:
            if self.contains_screen_point(event.pos):
                s = self._scale
                local_y = (event.pos[1] - self.screen_rect.y) / s - self.padding
                idx = int(local_y // self.item_height)
                if 0 <= idx < len(self.options):
                    self.selected_index = idx
                else:
                    self.selected_index = None
                return True
            else:
                self.selected_index = None

        return False

    def _dismiss(self) -> None:
        """Dismiss the context menu and notify parent."""
        self.visible = False
        if self._parent:
            self._parent.remove_child(self)
        if self.on_close:
            self.on_close()

    def _draw(self, surface: pygame.Surface) -> None:
        """Draw menu background and vertical items."""
        sr = self.screen_rect
        s = self._scale
        radius = max(2, self.t.scaled(4, s))
        border_w = max(1, self.t.scaled(2, s))

        # Main background card
        bg_surf = pygame.Surface(sr.size, pygame.SRCALPHA)
        pygame.draw.rect(
            bg_surf,
            (*self.t.colors.panel_bg_dark, 245),
            bg_surf.get_rect(),
            border_radius=radius,
        )
        pygame.draw.rect(
            bg_surf,
            (*self.t.colors.border_gold, 255),
            bg_surf.get_rect(),
            width=border_w,
            border_radius=radius,
        )
        surface.blit(bg_surf, sr.topleft)

        # Draw option rows
        font_size = max(10, self.t.scaled(11, s))
        font = pygame.font.SysFont("consolas", font_size, bold=True)

        scaled_padding = self.t.scaled(self.padding, s)
        scaled_item_h = self.t.scaled(self.item_height, s)

        for i, (label, _) in enumerate(self.options):
            item_rect = pygame.Rect(
                sr.x + border_w,
                sr.y + scaled_padding + i * scaled_item_h,
                sr.width - border_w * 2,
                scaled_item_h,
            )

            # Hover highlight
            if i == self.selected_index:
                highlight_surf = pygame.Surface(item_rect.size, pygame.SRCALPHA)
                highlight_surf.fill((*self.t.colors.wood_light, 120))
                surface.blit(highlight_surf, item_rect.topleft)

            # Text render
            text_color = self.t.colors.text_title if i == self.selected_index else self.t.colors.text_primary
            text_surf = font.render(label, True, text_color)
            text_rect = text_surf.get_rect(
                midleft=(item_rect.x + max(4, self.t.scaled(8, s)), item_rect.centery)
            )
            surface.blit(text_surf, text_rect.topleft)
