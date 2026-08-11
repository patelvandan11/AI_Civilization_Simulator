"""
Vertical category selector sidebar for inventory panel.
"""

from __future__ import annotations

from typing import Callable, Optional, Sequence

import pygame

from ui.styles import DEFAULT_STYLES
from ui.theme import Theme
from ui.widgets.base import Widget


class InventoryCategories(Widget):
    """
    Vertical sidebar containing category filters: All, Food, Material, Tools, Building, Farming, Rare, Favorite.
    """

    CATEGORIES = ("All", "Food", "Material", "Tools", "Building", "Farming", "Rare", "Favorite")

    def __init__(
        self,
        *,
        x: float = 0.0,
        y: float = 0.0,
        width: float = 120.0,
        height: float = 360.0,
        theme: Theme | None = None,
        on_select_category: Optional[Callable[[str], None]] = None,
    ) -> None:
        """
        Create sidebar selector.

        Args:
            x: Logical left.
            y: Logical top.
            width: Logical width.
            height: Logical height.
            theme: Theme injection.
            on_select_category: Triggered when category changes.
        """
        self.t = theme or DEFAULT_STYLES.theme
        super().__init__(
            x,
            y,
            width,
            height,
            theme=self.t,
            name="InventoryCategories",
            layer=self.t.layers.panels,
        )
        self.on_select_category = on_select_category
        self.active_category = "All"
        self._preferred_size = (width, height)
        self._min_size = (80.0, 160.0)

        # Hover state per category item
        self.hovered_category: Optional[str] = None
        # Blend timers for hover states
        self._hover_fade: dict[str, float] = {cat: 0.0 for cat in self.CATEGORIES}

    def select(self, category: str) -> None:
        """Set active category filter."""
        if category in self.CATEGORIES and category != self.active_category:
            self.active_category = category
            if self.on_select_category:
                self.on_select_category(category)

    def _handle_event(self, event: pygame.event.Event) -> bool:
        """Hover and selection checks."""
        if event.type == pygame.MOUSEMOTION:
            if self.contains_screen_point(event.pos):
                s = self._scale
                local_y = (event.pos[1] - self.screen_rect.y) / s
                
                # Check item layout position
                item_h = self.height / len(self.CATEGORIES)
                idx = int(local_y // item_h)
                if 0 <= idx < len(self.CATEGORIES):
                    self.hovered_category = self.CATEGORIES[idx]
                else:
                    self.hovered_category = None
                return True
            else:
                self.hovered_category = None

        if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
            if self.contains_screen_point(event.pos):
                s = self._scale
                local_y = (event.pos[1] - self.screen_rect.y) / s
                item_h = self.height / len(self.CATEGORIES)
                idx = int(local_y // item_h)
                if 0 <= idx < len(self.CATEGORIES):
                    self.select(self.CATEGORIES[idx])
                    return True

        return False

    def _update(self, dt: float) -> None:
        """Animate category hover transitions."""
        speed = 8.0
        for cat in self.CATEGORIES:
            target = 1.0 if cat == self.hovered_category else 0.0
            val = self._hover_fade[cat]
            if val < target:
                self._hover_fade[cat] = min(target, val + speed * dt)
            else:
                self._hover_fade[cat] = max(target, val - speed * dt)

    def _draw(self, surface: pygame.Surface) -> None:
        """Draw category list sidebar."""
        sr = self.screen_rect
        s = self._scale

        # Sidebar background inset
        bg_surf = pygame.Surface(sr.size, pygame.SRCALPHA)
        radius = max(2, self.t.scaled(4, s))
        pygame.draw.rect(
            bg_surf,
            (*self.t.colors.panel_inset, 150),
            bg_surf.get_rect(),
            border_radius=radius,
        )
        surface.blit(bg_surf, sr.topleft)

        # Draw category list items
        item_h = sr.height / len(self.CATEGORIES)
        font_size = max(10, self.t.scaled(12, s))
        font = pygame.font.SysFont("consolas", font_size, bold=True)

        for i, cat in enumerate(self.CATEGORIES):
            rect = pygame.Rect(
                sr.x + max(2, int(2 * s)),
                sr.y + int(i * item_h) + max(2, int(2 * s)),
                sr.width - max(4, int(4 * s)),
                int(item_h) - max(4, int(4 * s)),
            )

            # Draw background highlight for active or hovered items
            is_active = cat == self.active_category
            hover_t = self._hover_fade[cat]

            if is_active or hover_t > 0:
                highlight_surf = pygame.Surface(rect.size, pygame.SRCALPHA)
                
                # Active is a full golden-tint frame, hover is a lighter wood-tint
                if is_active:
                    bg_color = (*self.t.colors.wood_mid, 220)
                    border_color = self.t.colors.border_gold
                    border_w = max(1, self.t.scaled(2, s))
                else:
                    bg_color = (*self.t.colors.wood_light, int(80 * hover_t))
                    border_color = (*self.t.colors.border_gold, int(150 * hover_t))
                    border_w = max(1, self.t.scaled(1, s))

                pygame.draw.rect(
                    highlight_surf,
                    bg_color,
                    highlight_surf.get_rect(),
                    border_radius=max(1, radius - 1),
                )
                pygame.draw.rect(
                    highlight_surf,
                    border_color,
                    highlight_surf.get_rect(),
                    width=border_w,
                    border_radius=max(1, radius - 1),
                )
                surface.blit(highlight_surf, rect.topleft)

            # Label text
            text_color = self.t.colors.text_title if is_active else self.t.colors.text_primary
            text_surf = font.render(cat, True, text_color)
            
            # Pad text depending on active state
            pad_left = max(6, self.t.scaled(10 + (2 if is_active else 0), s))
            text_rect = text_surf.get_rect(midleft=(rect.x + pad_left, rect.centery))
            surface.blit(text_surf, text_rect.topleft)
