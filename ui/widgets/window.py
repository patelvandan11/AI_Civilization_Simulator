"""
Draggable / resizable floating Window with fade and scale animation.
"""

from __future__ import annotations

from typing import Callable, Optional

import pygame

from ui.styles import DEFAULT_STYLES, WindowStyle
from ui.theme import Theme
from ui.widgets.base import Widget
from ui.widgets.button import Button


class Window(Widget):
    """
    Wooden floating window: title bar, close, drag, resize, open animations.
    """

    def __init__(
        self,
        title: str = "Window",
        *,
        x: float = 100.0,
        y: float = 80.0,
        width: float = 360.0,
        height: float = 280.0,
        style: WindowStyle | None = None,
        theme: Theme | None = None,
        on_close: Callable[[], None] | None = None,
        resizable: bool = True,
        name: str = "",
    ) -> None:
        """
        Create a window.

        Args:
            title: Title bar text.
            x: Logical left.
            y: Logical top.
            width: Logical width.
            height: Logical height.
            style: WindowStyle tokens.
            theme: Theme injection.
            on_close: Callback when close is pressed.
            resizable: Allow bottom-right resize grip.
            name: Debug name.
        """
        self.style = style or DEFAULT_STYLES.window
        t = theme or DEFAULT_STYLES.theme
        super().__init__(
            x,
            y,
            max(width, self.style.min_width),
            max(height, self.style.min_height),
            theme=t,
            name=name or f"Window({title})",
            layer=t.layers.windows,
        )
        self.title = title
        self.on_close = on_close
        self.resizable = resizable
        self._dragging = False
        self._resizing = False
        self._drag_offset = (0.0, 0.0)
        self._anim_t = 0.0
        self._opening = True
        self._closing = False
        self._visual_scale = self.style.scale_from
        self._fade = 0.0
        self._min_size = (float(self.style.min_width), float(self.style.min_height))

        self.close_btn = Button(
            text="X",
            width=float(self.style.close_size),
            height=float(self.style.close_size),
            theme=t,
            callback=self.request_close,
            name="close",
        )
        self.add_child(self.close_btn)
        self._place_chrome()

    def request_close(self) -> None:
        """Start close animation then invoke callback."""
        self._closing = True
        self._opening = False

    @property
    def content_rect(self) -> pygame.Rect:
        """Logical content area below the title bar."""
        pad = self.style.padding
        top = self.style.title_height + pad
        return pygame.Rect(
            self.x + pad,
            self.y + top,
            max(0, self.width - pad * 2),
            max(0, self.height - top - pad),
        )

    def _place_chrome(self) -> None:
        """Position the close button in the title bar."""
        self.close_btn.set_position(
            self.x + self.width - self.style.close_size - self.style.padding // 2,
            self.y + (self.style.title_height - self.style.close_size) / 2,
        )
        self.close_btn.set_size(float(self.style.close_size), float(self.style.close_size))

    def _update(self, dt: float) -> None:
        """Advance open/close fade and scale."""
        if self._opening:
            self._anim_t = min(1.0, self._anim_t + dt / max(0.001, self.style.scale_in))
            self._fade = min(1.0, self._fade + dt / max(0.001, self.style.fade_in))
            self._visual_scale = self.style.scale_from + (
                self.style.scale_to - self.style.scale_from
            ) * self._anim_t
            if self._anim_t >= 1.0:
                self._opening = False
        elif self._closing:
            self._fade = max(0.0, self._fade - dt / max(0.001, self.style.fade_out))
            self._visual_scale = max(self.style.scale_from, self._visual_scale - dt)
            self._alpha = int(255 * self._fade)
            if self._fade <= 0.01:
                self.visible = False
                if self.on_close:
                    self.on_close()
                self._closing = False
        else:
            self._fade = 1.0
            self._visual_scale = 1.0
            self._alpha = 255
        self._place_chrome()

    def _handle_event(self, event: pygame.event.Event) -> bool:
        """Drag title bar; resize from corner."""
        s = self._scale
        title = pygame.Rect(
            int(self.x * s),
            int(self.y * s),
            int(self.width * s),
            int(self.style.title_height * s),
        )
        grip = self.style.resize_handle
        resize_zone = pygame.Rect(
            int((self.x + self.width - grip) * s),
            int((self.y + self.height - grip) * s),
            int(grip * s),
            int(grip * s),
        )

        if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
            if resize_zone.collidepoint(event.pos) and self.resizable:
                self._resizing = True
                return True
            if title.collidepoint(event.pos) and not self.close_btn.contains_screen_point(event.pos):
                self._dragging = True
                self._drag_offset = (
                    event.pos[0] / s - self.x,
                    event.pos[1] / s - self.y,
                )
                return True
        if event.type == pygame.MOUSEBUTTONUP and event.button == 1:
            if self._dragging or self._resizing:
                self._dragging = False
                self._resizing = False
                return True
        if event.type == pygame.MOUSEMOTION:
            if self._dragging:
                self.set_position(
                    event.pos[0] / s - self._drag_offset[0],
                    event.pos[1] / s - self._drag_offset[1],
                )
                return True
            if self._resizing:
                new_w = max(self.style.min_width, event.pos[0] / s - self.x)
                new_h = max(self.style.min_height, event.pos[1] / s - self.y)
                self.set_size(new_w, new_h)
                return True
        return False

    def set_position(self, x: float, y: float) -> None:
        """Move window and chrome."""
        super().set_position(x, y)
        self._place_chrome()

    def _draw(self, surface: pygame.Surface) -> None:
        """Draw shadow, body, title, resize grip."""
        sr = self.screen_rect
        s = self._scale
        # Visual scale about center
        if abs(self._visual_scale - 1.0) > 0.001:
            cx, cy = sr.center
            w = max(1, int(sr.width * self._visual_scale))
            h = max(1, int(sr.height * self._visual_scale))
            draw = pygame.Rect(0, 0, w, h)
            draw.center = (cx, cy)
        else:
            draw = sr

        radius = max(1, self.theme.scaled(self.style.corner_radius, s))
        border = max(1, self.theme.scaled(self.style.border_width, s))
        alpha = int(255 * self._fade)

        # Shadow
        off = self.theme.scaled(self.style.shadow_offset, s)
        shadow = pygame.Surface((draw.width + off, draw.height + off), pygame.SRCALPHA)
        pygame.draw.rect(
            shadow,
            (*self.style.shadow_color[:3], int(self.style.shadow_color[3] * self._fade)),
            pygame.Rect(off, off, draw.width, draw.height),
            border_radius=radius,
        )
        surface.blit(shadow, draw.topleft)

        body = pygame.Surface(draw.size, pygame.SRCALPHA)
        pygame.draw.rect(body, (*self.style.background, alpha), body.get_rect(), border_radius=radius)
        header_h = self.theme.scaled(self.style.title_height, s)
        header = pygame.Surface((draw.width, header_h), pygame.SRCALPHA)
        header.fill((*self.style.header_color, alpha))
        body.blit(header, (0, 0))
        pygame.draw.rect(
            body,
            (*self.style.border_color, alpha),
            body.get_rect(),
            width=border,
            border_radius=radius,
        )
        surface.blit(body, draw.topleft)

        font = pygame.font.SysFont(
            "consolas",
            max(8, self.theme.scaled(self.style.title_font_size, s)),
        )
        title = font.render(self.title, True, self.style.title_color)
        title.set_alpha(alpha)
        pad = self.theme.scaled(self.style.padding, s)
        surface.blit(title, (draw.x + pad, draw.y + (header_h - title.get_height()) // 2))

        if self.resizable:
            grip = self.theme.scaled(self.style.resize_handle, s)
            pygame.draw.line(
                surface,
                self.theme.colors.wood_highlight,
                (draw.right - grip, draw.bottom - 2),
                (draw.right - 2, draw.bottom - grip),
                2,
            )
