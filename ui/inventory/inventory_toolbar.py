"""
Top toolbar for inventory system containing search, sort, indicators and close buttons.
"""

from __future__ import annotations

from typing import Callable, Optional

import pygame

from ui.styles import DEFAULT_STYLES
from ui.theme import Theme
from ui.widgets.base import Widget
from ui.widgets.button import Button
from ui.widgets.textbox import TextBox


class InventoryToolbar(Widget):
    """
    Top toolbar container for the responsive inventory system.
    """

    SORT_MODES = ("Newest", "Name", "Quantity", "Value", "Weight")

    def __init__(
        self,
        *,
        x: float = 0.0,
        y: float = 0.0,
        width: float = 800.0,
        height: float = 42.0,
        theme: Theme | None = None,
        on_search: Optional[Callable[[str], None]] = None,
        on_sort: Optional[Callable[[str], None]] = None,
        on_close: Optional[Callable[[], None]] = None,
    ) -> None:
        self.t = theme or DEFAULT_STYLES.theme
        super().__init__(
            x,
            y,
            width,
            height,
            theme=self.t,
            name="InventoryToolbar",
            layer=self.t.layers.panels,
        )
        self.on_search = on_search
        self.on_sort = on_sort
        self.on_close = on_close

        self.current_sort_idx = 0
        self.player_money = 100
        self.current_weight = 0.0
        self.max_weight = 100.0

        # Children
        self.search_box = TextBox(
            width=180.0,
            height=28.0,
            placeholder="Search items...",
            theme=self.t,
            name="toolbar_search",
        )
        self.add_child(self.search_box)

        self.sort_btn = Button(
            text=f"Sort: {self.SORT_MODES[self.current_sort_idx]} ▼",
            width=120.0,
            height=28.0,
            theme=self.t,
            callback=self._cycle_sort,
            name="toolbar_sort",
        )
        self.add_child(self.sort_btn)

        # Style override for red Close button
        close_style = DEFAULT_STYLES.with_button(
            normal=(160, 60, 50),
            hover=(190, 80, 65),
            pressed=(120, 40, 35),
            border_color=(80, 25, 20),
            border_hover=self.t.colors.border_gold,
        ).button

        self.close_btn = Button(
            text="Close X",
            width=80.0,
            height=28.0,
            style=close_style,
            theme=self.t,
            callback=self._close_clicked,
            name="toolbar_close",
        )
        self.add_child(self.close_btn)

        self._last_search_text = ""
        self._layout_children()

    def set_stats(self, money: int, weight: float, max_weight: float) -> None:
        """Update money and weight readings in real time."""
        self.player_money = money
        self.current_weight = weight
        self.max_weight = max_weight

    def _cycle_sort(self) -> None:
        """Cycle current sort criterion and fire callback."""
        self.current_sort_idx = (self.current_sort_idx + 1) % len(self.SORT_MODES)
        mode = self.SORT_MODES[self.current_sort_idx]
        self.sort_btn.text = f"Sort: {mode} ▼"
        if self.on_sort:
            self.on_sort(mode.lower())

    def _close_clicked(self) -> None:
        """Trigger inventory close action."""
        if self.on_close:
            self.on_close()

    def set_position(self, x: float, y: float) -> None:
        """Move container and children."""
        super().set_position(x, y)
        self._layout_children()

    def set_size(self, width: float, height: float) -> None:
        """Resize container and layout children."""
        super().set_size(width, height)
        self._layout_children()

    def _layout_children(self) -> None:
        """Arrange toolbar widgets responsively."""
        # Top padding and margins
        pad_y = (self.height - 28) / 2
        
        # Left side: Search box & Sort Button
        self.search_box.set_position(self.x + 8, self.y + pad_y)
        self.sort_btn.set_position(self.x + 8 + 180 + 8, self.y + pad_y)

        # Right side: Close button
        self.close_btn.set_position(self.x + self.width - 80 - 8, self.y + pad_y)

    def _update(self, dt: float) -> None:
        """Check for search input change events."""
        text = self.search_box.text.strip()
        if text != self._last_search_text:
            self._last_search_text = text
            if self.on_search:
                self.on_search(text)
        self._layout_children()

    def _draw_coin(self, surface: pygame.Surface, x: int, y: int, radius: int) -> None:
        """Draw gold coin icon."""
        pygame.draw.circle(surface, self.t.colors.border_gold, (x, y), radius)
        pygame.draw.circle(surface, (245, 210, 60), (x, y), radius - 1)
        pygame.draw.circle(surface, self.t.colors.border_dark, (x, y), radius, width=1)
        
        # Inner ridges for pixel style coin
        pygame.draw.circle(surface, self.t.colors.border_gold, (x, y), max(1, radius // 2), width=1)

    def _draw(self, surface: pygame.Surface) -> None:
        """Render wood banner background, Money text, Weight bar, and labels."""
        sr = self.screen_rect
        s = self._scale

        # Wood toolbar strip background
        pygame.draw.rect(
            surface,
            self.t.colors.wood_dark,
            sr,
            border_radius=max(1, self.t.scaled(4, s)),
        )
        pygame.draw.rect(
            surface,
            self.t.colors.border_dark,
            sr,
            width=max(1, self.t.scaled(2, s)),
            border_radius=max(1, self.t.scaled(4, s)),
        )

        font_size = max(10, self.t.scaled(12, s))
        font = pygame.font.SysFont("consolas", font_size, bold=True)

        # Left / Center coordinate mapping
        # 1. Money display
        money_str = f"${self.player_money:,}"
        money_surf = font.render(money_str, True, (245, 210, 60))
        
        # Money starts at offset from right (before close button)
        close_x = self.x + self.width - 80 - 8
        mx = self.t.scaled(close_x - 130, s)
        my = sr.centery
        
        coin_radius = max(3, self.t.scaled(6, s))
        self._draw_coin(surface, mx - coin_radius - max(2, int(4 * s)), my, coin_radius)
        surface.blit(money_surf, money_surf.get_rect(midleft=(mx, my)))

        # 2. Weight bar display (centered between left buttons and money)
        left_buttons_end = self.x + 8 + 180 + 8 + 120 + 16
        right_starts = close_x - 160
        
        center_x = (left_buttons_end + right_starts) / 2
        wx = self.t.scaled(center_x - 60, s)
        wy = sr.centery - self.t.scaled(10, s)

        # Draw weight text
        weight_str = f"Weight: {self.current_weight:.1f} / {self.max_weight:.1f} kg"
        weight_surf = font.render(weight_str, True, self.t.colors.text_secondary)
        surface.blit(weight_surf, (wx, wy))

        # Weight visual bar
        bar_w = self.t.scaled(120, s)
        bar_h = max(2, self.t.scaled(5, s))
        by = sr.centery + self.t.scaled(4, s)
        
        # Determine filling ratio
        ratio = min(1.0, max(0.0, self.current_weight / max(0.1, self.max_weight)))
        bar_color = self.t.colors.text_success if ratio < 0.75 else (230, 130, 40) if ratio < 0.9 else self.t.colors.text_danger

        pygame.draw.rect(surface, self.t.colors.panel_inset, (wx, by, bar_w, bar_h), border_radius=max(1, bar_h // 2))
        pygame.draw.rect(surface, bar_color, (wx, by, int(bar_w * ratio), bar_h), border_radius=max(1, bar_h // 2))
