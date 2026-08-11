"""
Simple single-line text input widget for login forms.
"""

from __future__ import annotations

from typing import Optional

import pygame

from ui.styles import DEFAULT_STYLES
from ui.theme import Theme
from ui.widgets.base import Widget


class TextBox(Widget):
    """
    Keyboard-focused text field with optional password masking.
    """

    def __init__(
        self,
        *,
        x: float = 0.0,
        y: float = 0.0,
        width: float = 220.0,
        height: float = 32.0,
        placeholder: str = "",
        password: bool = False,
        max_length: int = 32,
        theme: Theme | None = None,
        name: str = "TextBox",
    ) -> None:
        """
        Create a text box.

        Args:
            x: Logical left.
            y: Logical top.
            width: Logical width.
            height: Logical height.
            placeholder: Hint when empty and unfocused.
            password: Mask characters when True.
            max_length: Maximum characters.
            theme: Theme injection.
            name: Debug name.
        """
        t = theme or DEFAULT_STYLES.theme
        super().__init__(
            x,
            y,
            width,
            height,
            theme=t,
            name=name,
            layer=t.layers.buttons,
        )
        self.placeholder = placeholder
        self.password = password
        self.max_length = max_length
        self._text: str = ""
        self._cursor_blink: float = 0.0
        self._show_cursor: bool = True
        self._preferred_size = (width, height)
        self._min_size = (80.0, 24.0)

    @property
    def text(self) -> str:
        """Current field value."""
        return self._text

    @text.setter
    def text(self, value: str) -> None:
        """Replace field value (truncated to max_length)."""
        self._text = value[: self.max_length]

    def clear(self) -> None:
        """Empty the field."""
        self._text = ""

    def set_focused(self, focused: bool) -> None:
        """
        Toggle focus and pygame text-input mode for IME/keyboard.

        Args:
            focused: Whether this field is active.
        """
        super().set_focused(focused)
        if focused:
            pygame.key.start_text_input()
            sr = self.screen_rect
            if sr.width > 0 and sr.height > 0:
                pygame.key.set_text_input_rect(sr)
        else:
            pygame.key.stop_text_input()

    def _update(self, dt: float) -> None:
        """
        Blink caret when focused.

        Args:
            dt: Delta seconds.
        """
        if not self._focused:
            self._show_cursor = False
            return
        self._cursor_blink += dt
        if self._cursor_blink >= 0.5:
            self._cursor_blink = 0.0
            self._show_cursor = not self._show_cursor

    def _handle_event(self, event: pygame.event.Event) -> bool:
        """
        Focus on click; accept key input when focused.

        Args:
            event: Pygame event.

        Returns:
            True if consumed.
        """
        if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
            inside = self.contains_screen_point(event.pos)
            if inside:
                self.set_focused(True)
            else:
                self.set_focused(False)
            return inside

        if not self._focused or not self.enabled:
            return False

        if event.type == pygame.TEXTINPUT:
            for ch in event.text:
                if ch.isprintable() and len(self._text) < self.max_length:
                    self._text += ch
            return True

        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_BACKSPACE:
                self._text = self._text[:-1]
                return True
            if event.key == pygame.K_RETURN:
                return True
            if event.key == pygame.K_TAB:
                return False
            # Fallback for platforms that still deliver unicode on KEYDOWN
            if event.type == pygame.TEXTINPUT:
                for ch in event.text:
                    if ch.isprintable() and len(self._text) < self.max_length:
                        self._text += ch
                return True
        return False

    def _draw(self, surface: pygame.Surface) -> None:
        """
        Draw field background, border, and text/placeholder.

        Args:
            surface: Target surface.
        """
        sr = self.screen_rect
        s = self._scale
        radius = max(1, self.theme.scaled(self.theme.sizes.corner_radius_sm, s))
        border_w = max(1, self.theme.scaled(self.theme.sizes.border_width, s))
        pad = self.theme.scaled(self.theme.spacing.md, s)

        body = pygame.Surface(sr.size, pygame.SRCALPHA)
        pygame.draw.rect(
            body,
            (*self.theme.colors.panel_inset, self._alpha),
            body.get_rect(),
            border_radius=radius,
        )
        border = (
            self.theme.colors.border_gold
            if self._focused
            else self.theme.colors.slot_border
        )
        pygame.draw.rect(
            body,
            (*border, self._alpha),
            body.get_rect(),
            width=border_w,
            border_radius=radius,
        )
        surface.blit(body, sr.topleft)

        font = pygame.font.SysFont(
            "consolas",
            max(8, self.theme.scaled(self.theme.fonts.size_body, s)),
        )
        if self._text:
            display = ("*" * len(self._text)) if self.password else self._text
            color = self.theme.colors.text_primary
        else:
            display = self.placeholder if not self._focused else ""
            color = self.theme.colors.text_disabled

        if display:
            text_surf = font.render(display, True, color)
            surface.blit(text_surf, (sr.x + pad, sr.centery - text_surf.get_height() // 2))

        if self._focused and self._show_cursor:
            text_w = font.size(
                ("*" * len(self._text)) if self.password else self._text
            )[0]
            cx = sr.x + pad + text_w + 1
            pygame.draw.line(
                surface,
                self.theme.colors.text_title,
                (cx, sr.y + pad // 2),
                (cx, sr.bottom - pad // 2),
                max(1, self.theme.scaled(1, s)),
            )
