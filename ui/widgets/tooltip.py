"""
Item tooltip with fade animation.
"""

from __future__ import annotations

from typing import Any, Optional

import pygame

from ui.styles import DEFAULT_STYLES, TooltipStyle
from ui.theme import Theme
from ui.widgets.base import Widget


class Tooltip(Widget):
    """
    Floating tooltip shown near the cursor for hovered items.
    """

    def __init__(
        self,
        *,
        style: TooltipStyle | None = None,
        theme: Theme | None = None,
    ) -> None:
        """
        Create a hidden tooltip.

        Args:
            style: TooltipStyle tokens.
            theme: Theme injection.
        """
        self.style = style or DEFAULT_STYLES.tooltip
        t = theme or DEFAULT_STYLES.theme
        super().__init__(
            0,
            0,
            self.style.max_width,
            80,
            theme=t,
            visible=False,
            enabled=False,
            name="Tooltip",
            layer=t.layers.tooltip,
        )
        self._data: dict[str, Any] = {}
        self._fade = 0.0
        self._want_visible = False

    def show_item(self, data: dict[str, Any], screen_pos: tuple[int, int]) -> None:
        """
        Display item info near a screen position.

        Args:
            data: Keys name, description, weight, value, durability, stack.
            screen_pos: Cursor position in screen pixels.
        """
        self._data = data
        self._want_visible = True
        self.visible = True
        # Convert screen → logical using current scale
        s = max(0.001, self._scale)
        self.set_position(
            screen_pos[0] / s + self.style.offset_x,
            screen_pos[1] / s + self.style.offset_y,
        )

    def hide(self) -> None:
        """Begin fade-out."""
        self._want_visible = False

    def _update(self, dt: float) -> None:
        """Fade alpha toward shown/hidden."""
        target = 1.0 if self._want_visible else 0.0
        speed = 1.0 / max(0.001, self.style.fade_duration)
        if self._fade < target:
            self._fade = min(target, self._fade + speed * dt)
        else:
            self._fade = max(target, self._fade - speed * dt)
        self._alpha = int(self.style.alpha * self._fade)
        if self._fade <= 0.01 and not self._want_visible:
            self.visible = False

    def _draw(self, surface: pygame.Surface) -> None:
        """Draw wooden tooltip card with item meta."""
        if self._fade <= 0.01:
            return
        s = self._scale
        font_title = pygame.font.SysFont(
            "consolas",
            max(8, self.theme.scaled(self.style.title_font_size, s)),
        )
        font_body = pygame.font.SysFont(
            "consolas",
            max(8, self.theme.scaled(self.style.body_font_size, s)),
        )
        name = str(self._data.get("name", "Item"))
        desc = str(self._data.get("description", ""))
        lines = [
            name,
            desc,
            f"Weight: {self._data.get('weight', '-')}  Value: {self._data.get('value', '-')}",
            f"Durability: {self._data.get('durability', '-')}  Stack: {self._data.get('stack', '-')}",
        ]
        pad = self.theme.scaled(self.style.padding, s)
        rendered: list[tuple[pygame.Surface, bool]] = []
        max_w = 0
        for i, line in enumerate(lines):
            if not line:
                continue
            font = font_title if i == 0 else font_body
            color = (
                self.style.title_color
                if i == 0
                else self.style.body_color if i == 1 else self.style.meta_color
            )
            # Word-wrap description
            if i == 1 and len(line) > 36:
                chunks = [line[j : j + 36] for j in range(0, len(line), 36)]
                for chunk in chunks:
                    surf = font.render(chunk, True, color)
                    rendered.append((surf, False))
                    max_w = max(max_w, surf.get_width())
            else:
                surf = font.render(line[:48], True, color)
                rendered.append((surf, i == 0))
                max_w = max(max_w, surf.get_width())

        line_h = sum(r.get_height() + 2 for r, _ in rendered)
        w = max_w + pad * 2
        h = line_h + pad * 2
        self.width = w / s
        self.height = h / s
        sr = self.screen_rect

        # Keep on screen
        sw, sh = surface.get_size()
        x = min(sr.x, sw - sr.width - 4)
        y = min(sr.y, sh - sr.height - 4)
        x = max(4, x)
        y = max(4, y)

        card = pygame.Surface((sr.width, sr.height), pygame.SRCALPHA)
        radius = max(1, self.theme.scaled(self.style.corner_radius, s))
        pygame.draw.rect(
            card,
            (*self.style.background, self._alpha),
            card.get_rect(),
            border_radius=radius,
        )
        pygame.draw.rect(
            card,
            (*self.style.border_color, self._alpha),
            card.get_rect(),
            width=max(1, self.theme.scaled(self.style.border_width, s)),
            border_radius=radius,
        )
        surface.blit(card, (x, y))
        cy = y + pad
        for surf, _ in rendered:
            surf = surf.copy()
            surf.set_alpha(self._alpha)
            surface.blit(surf, (x + pad, cy))
            cy += surf.get_height() + 2
