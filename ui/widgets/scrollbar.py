"""
Vertical scrollbar for scrollable panels.
"""

from __future__ import annotations

import pygame

from ui.styles import DEFAULT_STYLES
from ui.theme import Theme
from ui.widgets.base import Widget


class Scrollbar(Widget):
    """
    Vertical scrollbar that reports a normalized scroll offset 0–1.
    """

    def __init__(
        self,
        *,
        x: float = 0.0,
        y: float = 0.0,
        width: float | None = None,
        height: float = 200.0,
        theme: Theme | None = None,
        name: str = "Scrollbar",
    ) -> None:
        """
        Create a scrollbar.

        Args:
            x: Logical left.
            y: Logical top.
            width: Logical width; defaults to theme scrollbar width.
            height: Track height.
            theme: Theme injection.
            name: Debug name.
        """
        t = theme or DEFAULT_STYLES.theme
        w = float(width if width is not None else t.sizes.scrollbar_width)
        super().__init__(
            x,
            y,
            w,
            height,
            theme=t,
            name=name,
            layer=t.layers.buttons,
        )
        self._scroll = 0.0  # 0–1
        self._dragging = False
        self.content_ratio = 1.0  # visible/content; <1 means scrollable
        self._preferred_size = (w, height)

    @property
    def scroll(self) -> float:
        """Normalized scroll position 0–1."""
        return self._scroll

    @scroll.setter
    def scroll(self, value: float) -> None:
        """Clamp scroll position."""
        self._scroll = max(0.0, min(1.0, float(value)))

    def _thumb_rect(self) -> pygame.Rect:
        """Screen-space thumb rectangle."""
        sr = self.screen_rect
        ratio = max(0.15, min(1.0, self.content_ratio))
        thumb_h = max(12, int(sr.height * ratio))
        travel = max(1, sr.height - thumb_h)
        ty = sr.y + int(travel * self._scroll)
        return pygame.Rect(sr.x, ty, sr.width, thumb_h)

    def _handle_event(self, event: pygame.event.Event) -> bool:
        """Drag thumb or jump track."""
        if self.content_ratio >= 0.999:
            return False
        if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
            if self._thumb_rect().collidepoint(event.pos):
                self._dragging = True
                return True
            if self.contains_screen_point(event.pos):
                sr = self.screen_rect
                self._scroll = (event.pos[1] - sr.y) / max(1, sr.height)
                self._scroll = max(0.0, min(1.0, self._scroll))
                self._dragging = True
                return True
        if event.type == pygame.MOUSEBUTTONUP and event.button == 1:
            if self._dragging:
                self._dragging = False
                return True
        if event.type == pygame.MOUSEMOTION and self._dragging:
            sr = self.screen_rect
            self._scroll = (event.pos[1] - sr.y) / max(1, sr.height)
            self._scroll = max(0.0, min(1.0, self._scroll))
            return True
        if event.type == pygame.MOUSEWHEEL and self.contains_screen_point(pygame.mouse.get_pos()):
            self._scroll = max(0.0, min(1.0, self._scroll - event.y * 0.08))
            return True
        return False

    def _draw(self, surface: pygame.Surface) -> None:
        """Draw track and thumb."""
        if self.content_ratio >= 0.999:
            return
        sr = self.screen_rect
        s = self._scale
        radius = max(1, self.theme.scaled(self.theme.sizes.corner_radius_sm, s))
        pygame.draw.rect(
            surface,
            self.theme.colors.panel_inset,
            sr,
            border_radius=radius,
        )
        pygame.draw.rect(
            surface,
            self.theme.colors.wood_light,
            self._thumb_rect(),
            border_radius=radius,
        )
