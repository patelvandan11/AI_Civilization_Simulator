"""
Text label widget for the pixel UI.
"""

from __future__ import annotations

from typing import Optional

import pygame

from ui.styles import DEFAULT_STYLES, LabelStyle
from ui.theme import Theme
from ui.widgets.base import Widget


class Label(Widget):
    """
    Single- or multi-line text label. Non-interactive by default.
    """

    def __init__(
        self,
        text: str = "",
        *,
        x: float = 0.0,
        y: float = 0.0,
        width: float = 100.0,
        height: float = 20.0,
        style: LabelStyle | None = None,
        theme: Theme | None = None,
        name: str = "Label",
    ) -> None:
        """
        Create a label.

        Args:
            text: Display text (use ``\\n`` for multiple lines).
            x: Logical left.
            y: Logical top.
            width: Logical width.
            height: Logical height.
            style: LabelStyle tokens.
            theme: Theme injection.
            name: Debug name.
        """
        self.style = style or DEFAULT_STYLES.label
        self._text = text
        t = theme or DEFAULT_STYLES.theme
        super().__init__(
            x,
            y,
            width,
            height,
            theme=t,
            enabled=False,
            name=name,
            layer=t.layers.text,
        )
        self._preferred_size = (width, height)

    @property
    def text(self) -> str:
        """Current label text."""
        return self._text

    @text.setter
    def text(self, value: str) -> None:
        """Replace label text."""
        self._text = value

    def _draw(self, surface: pygame.Surface) -> None:
        """Render text with optional shadow and alignment."""
        sr = self.screen_rect
        s = self._scale
        font = pygame.font.SysFont(
            "consolas",
            max(8, self.theme.scaled(self.style.font_size, s)),
        )
        lines = self._text.split("\n") if self._text else [""]
        line_gap = self.theme.scaled(self.style.line_spacing, s)
        y = sr.y
        for line in lines:
            text_surf = font.render(line, True, self.style.color)
            if self.style.align == "center":
                x = sr.centerx - text_surf.get_width() // 2
            elif self.style.align == "right":
                x = sr.right - text_surf.get_width()
            else:
                x = sr.x
            if self.style.draw_shadow:
                shadow = font.render(line, True, self.style.shadow_color)
                off = self.theme.scaled(self.style.shadow_offset, s)
                surface.blit(shadow, (x + off, y + off))
            surface.blit(text_surf, (x, y))
            y += text_surf.get_height() + line_gap
