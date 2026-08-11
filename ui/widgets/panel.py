"""
Reusable wooden Panel widget — the visual building block for windows and HUD.

Panels provide background, border, optional header, shadow, and a content
area where children are laid out (typically via Grid).
"""

from __future__ import annotations

from typing import Optional

import pygame

from ui.styles import DEFAULT_STYLES, PanelStyle
from ui.theme import Theme
from ui.widgets.base import Widget


class Panel(Widget):
    """
    Wooden framed panel with optional title header and drop shadow.

    Children are drawn clipped to the content rect (inside padding / header).
    Position and size should be assigned by a layout manager, not hardcoded.
    """

    def __init__(
        self,
        *,
        x: float = 0.0,
        y: float = 0.0,
        width: float = 200.0,
        height: float = 150.0,
        title: str = "",
        style: PanelStyle | None = None,
        theme: Theme | None = None,
        name: str = "",
        visible: bool = True,
        draw_header: bool | None = None,
    ) -> None:
        """
        Create a Panel.

        Args:
            x: Logical left.
            y: Logical top.
            width: Logical width.
            height: Logical height.
            title: Optional header title text.
            style: PanelStyle; defaults from DEFAULT_STYLES.
            theme: Optional Theme injection.
            name: Debug / lookup name.
            visible: Initial visibility.
            draw_header: Force header on/off; None means ``bool(title)``.
        """
        self.style: PanelStyle = style or DEFAULT_STYLES.panel
        self._title: str = title
        self._draw_header: bool = (
            draw_header if draw_header is not None else bool(title)
        )
        self._font: Optional[pygame.font.Font] = None

        t = theme or DEFAULT_STYLES.theme
        super().__init__(
            x,
            y,
            width,
            height,
            theme=t,
            visible=visible,
            enabled=True,
            name=name or (f"Panel({title})" if title else "Panel"),
            layer=t.layers.panels,
        )
        self._min_size = (
            float(t.sizes.panel_min_width),
            float(t.sizes.panel_min_height),
        )
        self._preferred_size = (width, height)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    @property
    def title(self) -> str:
        """Header title string."""
        return self._title

    @title.setter
    def title(self, value: str) -> None:
        """Update title; enables header when non-empty."""
        self._title = value
        if value and not self._draw_header:
            self._draw_header = True

    @property
    def content_rect(self) -> pygame.Rect:
        """
        Logical rectangle available for children (inside padding / header).

        Returns:
            pygame.Rect in logical coordinates relative to the screen origin
            (same space as ``self.rect``), not local to the panel.
        """
        pad = self.style.padding
        top = pad
        if self._draw_header:
            top += self.style.header_height
        return pygame.Rect(
            self.x + pad,
            self.y + top,
            max(0, self.width - pad * 2),
            max(0, self.height - top - pad),
        )

    @property
    def content_size(self) -> tuple[float, float]:
        """Logical (width, height) of the content area."""
        r = self.content_rect
        return (float(r.width), float(r.height))

    def set_draw_header(self, enabled: bool) -> None:
        """
        Toggle the title header strip.

        Args:
            enabled: Whether to draw the header.
        """
        self._draw_header = enabled

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    def _ensure_font(self, size: int) -> pygame.font.Font:
        """
        Create a font at the given logical size (scaled at draw time).

        Args:
            size: Logical font size in pixels.

        Returns:
            pygame Font instance.
        """
        return pygame.font.SysFont("consolas", max(8, size))

    def _draw(self, surface: pygame.Surface) -> None:
        """
        Draw shadow, wooden body, border, optional header, and title.

        Children are drawn by Widget.draw after this method returns.

        Args:
            surface: Target surface.
        """
        sr = self.screen_rect
        s = self._scale
        radius = max(1, self.theme.scaled(self.style.corner_radius, s))
        border_w = max(1, self.theme.scaled(self.style.border_width, s))

        # Drop shadow
        if self.style.draw_shadow:
            offset = self.theme.scaled(self.style.shadow_offset, s)
            shadow = pygame.Surface(
                (sr.width + offset, sr.height + offset),
                pygame.SRCALPHA,
            )
            pygame.draw.rect(
                shadow,
                self.style.shadow_color,
                pygame.Rect(offset, offset, sr.width, sr.height),
                border_radius=radius,
            )
            surface.blit(shadow, sr.topleft)

        # Main body
        body = pygame.Surface(sr.size, pygame.SRCALPHA)
        bg = (*self.style.background, self._alpha)
        pygame.draw.rect(body, bg, body.get_rect(), border_radius=radius)

        # Inner wood gradient strip (top lighter → bottom darker feel)
        band_h = max(2, sr.height // 5)
        band = pygame.Surface((sr.width, band_h), pygame.SRCALPHA)
        band.fill((*self.style.border_highlight, 28))
        body.blit(band, (0, 0))

        # Optional inset well for content
        if self.style.draw_inset:
            pad = self.theme.scaled(self.style.padding, s)
            header_extra = (
                self.theme.scaled(self.style.header_height, s)
                if self._draw_header
                else 0
            )
            inset_rect = pygame.Rect(
                pad,
                pad + header_extra,
                max(1, sr.width - pad * 2),
                max(1, sr.height - pad * 2 - header_extra),
            )
            pygame.draw.rect(
                body,
                (*self.style.inset, self._alpha),
                inset_rect,
                border_radius=max(1, radius - 2),
            )

        # Header strip
        if self._draw_header:
            header_h = self.theme.scaled(self.style.header_height, s)
            # Clip header to rounded top by drawing full then overlay
            header = pygame.Surface((sr.width, header_h), pygame.SRCALPHA)
            header.fill((*self.style.header_color, self._alpha))
            body.blit(header, (0, 0))
            # Gold underline under header
            pygame.draw.line(
                body,
                (*self.theme.colors.border_gold_dim, self._alpha),
                (border_w, header_h - 1),
                (sr.width - border_w, header_h - 1),
                max(1, self.theme.scaled(1, s)),
            )

        # Outer border
        pygame.draw.rect(
            body,
            (*self.style.border_color, self._alpha),
            body.get_rect(),
            width=border_w,
            border_radius=radius,
        )
        # Inner highlight border (lighter wood)
        inner = body.get_rect().inflate(-border_w * 2, -border_w * 2)
        if inner.width > 0 and inner.height > 0:
            pygame.draw.rect(
                body,
                (*self.style.border_highlight, min(80, self._alpha)),
                inner,
                width=max(1, border_w // 2 or 1),
                border_radius=max(1, radius - border_w),
            )

        surface.blit(body, sr.topleft)

        # Title text
        if self._draw_header and self._title:
            self._draw_title(surface, sr)

    def _draw_title(self, surface: pygame.Surface, screen_rect: pygame.Rect) -> None:
        """
        Draw the panel title centered vertically in the header.

        Args:
            surface: Target surface.
            screen_rect: Scaled panel rectangle.
        """
        s = self._scale
        font_size = self.theme.scaled(self.style.title_font_size, s)
        font = self._ensure_font(font_size)
        pad = self.theme.scaled(self.style.padding, s)
        header_h = self.theme.scaled(self.style.header_height, s)

        shadow = font.render(self._title, True, self.theme.colors.text_shadow)
        text = font.render(self._title, True, self.style.title_color)
        text_rect = text.get_rect()
        text_rect.midleft = (
            screen_rect.x + pad,
            screen_rect.y + header_h // 2,
        )
        surface.blit(shadow, text_rect.move(1, 1))
        surface.blit(text, text_rect)

    def draw(self, surface: pygame.Surface) -> None:
        """
        Draw panel then children, clipping children to the content area.

        Args:
            surface: Target surface.
        """
        if not self.visible or self._alpha <= 0:
            return

        self._draw(surface)

        # Clip children to content region so they stay inside the wood frame.
        content = self.content_rect
        s = self._scale
        clip = pygame.Rect(
            int(round(content.x * s)),
            int(round(content.y * s)),
            max(0, int(round(content.width * s))),
            max(0, int(round(content.height * s))),
        )
        if clip.width <= 0 or clip.height <= 0:
            return

        prev_clip = surface.get_clip()
        surface.set_clip(clip.clip(prev_clip) if prev_clip else clip)
        try:
            for child in sorted(self._children, key=lambda w: w.layer):
                child.draw(surface)
        finally:
            surface.set_clip(prev_clip)
