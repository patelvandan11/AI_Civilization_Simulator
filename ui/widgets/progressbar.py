"""
Smooth-fill progress bar for HUD and crafting.
"""

from __future__ import annotations

import pygame

from ui.styles import DEFAULT_STYLES, ProgressBarStyle
from ui.theme import Theme
from ui.widgets.base import Widget


class ProgressBar(Widget):
    """
    Progress bar with smoothly interpolated fill value (0.0–1.0).
    """

    def __init__(
        self,
        *,
        x: float = 0.0,
        y: float = 0.0,
        width: float = 140.0,
        height: float | None = None,
        value: float = 1.0,
        style: ProgressBarStyle | None = None,
        theme: Theme | None = None,
        label: str = "",
        name: str = "ProgressBar",
    ) -> None:
        """
        Create a progress bar.

        Args:
            x: Logical left.
            y: Logical top.
            width: Logical width.
            height: Logical height; defaults to style.height.
            value: Initial fill 0–1.
            style: ProgressBarStyle (health/energy/etc.).
            theme: Theme injection.
            label: Optional caption drawn inside the bar.
            name: Debug name.
        """
        self.style = style or ProgressBarStyle.health()
        h = float(height if height is not None else self.style.height)
        t = theme or DEFAULT_STYLES.theme
        super().__init__(
            x,
            y,
            width,
            h,
            theme=t,
            enabled=False,
            name=name,
            layer=t.layers.icons,
        )
        self._target = max(0.0, min(1.0, value))
        self._display = self._target
        self.label = label
        self._preferred_size = (width, h)

    @property
    def value(self) -> float:
        """Target fill amount 0–1."""
        return self._target

    @value.setter
    def value(self, v: float) -> None:
        """Set target fill; display eases toward it."""
        self._target = max(0.0, min(1.0, float(v)))

    def _update(self, dt: float) -> None:
        """Ease displayed fill toward target."""
        speed = 1.0 / max(0.001, self.style.smooth_duration)
        if self._display < self._target:
            self._display = min(self._target, self._display + speed * dt)
        elif self._display > self._target:
            self._display = max(self._target, self._display - speed * dt)

    def _draw(self, surface: pygame.Surface) -> None:
        """Draw background, fill, border, optional text."""
        sr = self.screen_rect
        s = self._scale
        radius = max(1, self.theme.scaled(self.style.corner_radius, s))
        border = max(1, self.theme.scaled(self.style.border_width, s))

        body = pygame.Surface(sr.size, pygame.SRCALPHA)
        pygame.draw.rect(
            body,
            (*self.style.background, self._alpha),
            body.get_rect(),
            border_radius=radius,
        )
        fill_w = max(0, int(sr.width * self._display))
        if fill_w > 0:
            fill_rect = pygame.Rect(0, 0, fill_w, sr.height)
            pygame.draw.rect(
                body,
                (*self.style.fill, self._alpha),
                fill_rect,
                border_radius=radius,
            )
        pygame.draw.rect(
            body,
            (*self.style.border_color, self._alpha),
            body.get_rect(),
            width=border,
            border_radius=radius,
        )
        surface.blit(body, sr.topleft)

        if self.style.show_text:
            font = pygame.font.SysFont(
                "consolas",
                max(8, self.theme.scaled(self.style.font_size, s)),
            )
            text = self.label or f"{int(self._display * 100)}%"
            surf = font.render(text, True, self.style.text_color)
            surface.blit(surf, surf.get_rect(center=sr.center))
