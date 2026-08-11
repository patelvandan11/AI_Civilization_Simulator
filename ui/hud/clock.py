"""
HUD clock widget showing day, time, weather, and game-speed.
"""

from __future__ import annotations

import pygame

from game.core.player import Player
from ui.styles import DEFAULT_STYLES
from ui.theme import Theme
from ui.widgets.base import Widget


class ClockHUD(Widget):
    """
    Top-right style clock readout driven by Player.clock.
    """

    def __init__(
        self,
        player: Player,
        *,
        x: float = 0.0,
        y: float = 0.0,
        width: float = 220.0,
        height: float = 48.0,
        theme: Theme | None = None,
    ) -> None:
        """
        Create clock HUD.

        Args:
            player: Player whose clock is displayed.
            x: Logical left.
            y: Logical top.
            width: Logical width.
            height: Logical height.
            theme: Theme injection.
        """
        t = theme or DEFAULT_STYLES.theme
        super().__init__(
            x,
            y,
            width,
            height,
            theme=t,
            name="ClockHUD",
            layer=t.layers.text,
        )
        self.player = player
        self._preferred_size = (width, height)

    def _draw(self, surface: pygame.Surface) -> None:
        """
        Draw wooden chip with clock / weather / speed.

        Args:
            surface: Target surface.
        """
        sr = self.screen_rect
        s = self._scale
        radius = max(1, self.theme.scaled(self.theme.sizes.corner_radius, s))
        body = pygame.Surface(sr.size, pygame.SRCALPHA)
        pygame.draw.rect(
            body,
            (*self.theme.colors.panel_bg_dark, 220),
            body.get_rect(),
            border_radius=radius,
        )
        pygame.draw.rect(
            body,
            (*self.theme.colors.border_dark, 255),
            body.get_rect(),
            width=max(1, self.theme.scaled(2, s)),
            border_radius=radius,
        )
        surface.blit(body, sr.topleft)

        clock = self.player.clock
        font = pygame.font.SysFont(
            "consolas",
            max(8, self.theme.scaled(self.theme.fonts.size_body, s)),
        )
        small = pygame.font.SysFont(
            "consolas",
            max(8, self.theme.scaled(self.theme.fonts.size_small, s)),
        )
        line1 = font.render(clock.format_clock(), True, self.theme.colors.text_title)
        line2 = small.render(
            f"{clock.weather}  |  Speed {clock.speed}x",
            True,
            self.theme.colors.text_secondary,
        )
        pad = self.theme.scaled(self.theme.spacing.md, s)
        surface.blit(line1, (sr.x + pad, sr.y + pad // 2))
        surface.blit(line2, (sr.x + pad, sr.y + pad // 2 + line1.get_height() + 2))
