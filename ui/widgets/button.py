"""
Reusable Button widget with states, hover glow, scale animations, and sounds.

States: Normal, Hover, Pressed, Disabled, Focused.
"""

from __future__ import annotations

from enum import Enum, auto
from typing import Callable, Optional

import pygame

from ui.styles import ButtonStyle, DEFAULT_STYLES
from ui.theme import Theme
from ui.widgets.base import Widget


class ButtonState(Enum):
    """Visual / interaction state of a Button."""

    NORMAL = auto()
    HOVER = auto()
    PRESSED = auto()
    DISABLED = auto()
    FOCUSED = auto()


class Button(Widget):
    """
    Pixel-art styled button with animated hover / press feedback.

    Layout size is driven by ButtonStyle (min_width, height, padding).
    Never hardcode positions — place via Grid or parent layout.
    """

    def __init__(
        self,
        text: str = "",
        *,
        x: float = 0.0,
        y: float = 0.0,
        width: float | None = None,
        height: float | None = None,
        style: ButtonStyle | None = None,
        theme: Theme | None = None,
        icon: pygame.Surface | None = None,
        callback: Callable[[], None] | None = None,
        name: str = "",
        visible: bool = True,
        enabled: bool = True,
    ) -> None:
        """
        Create a Button.

        Args:
            text: Label drawn centered on the button.
            x: Logical left (usually set by layout).
            y: Logical top (usually set by layout).
            width: Override width; None uses style.min_width + text.
            height: Override height; None uses style.height.
            style: ButtonStyle; defaults from DEFAULT_STYLES.
            theme: Optional Theme injection.
            icon: Optional icon surface drawn left of text.
            callback: Invoked on successful click (press + release inside).
            name: Debug / lookup name.
            visible: Initial visibility.
            enabled: Initial enabled state.
        """
        self.style: ButtonStyle = style or DEFAULT_STYLES.button
        self._text: str = text
        self._icon: Optional[pygame.Surface] = icon
        self._callback: Optional[Callable[[], None]] = callback
        self._state: ButtonState = ButtonState.NORMAL if enabled else ButtonState.DISABLED

        # Animation blend 0→1 for hover glow / scale
        self._hover_t: float = 0.0
        self._press_t: float = 0.0
        self._was_pressed_inside: bool = False

        # Font cache (lazy)
        self._font: Optional[pygame.font.Font] = None
        self._text_surf: Optional[pygame.Surface] = None
        self._text_dirty: bool = True

        # Resolve initial size from style before super().__init__
        resolved_h = float(height if height is not None else self.style.height)
        resolved_w = float(width if width is not None else self.style.min_width)

        t = theme or DEFAULT_STYLES.theme
        super().__init__(
            x,
            y,
            resolved_w,
            resolved_h,
            theme=t,
            visible=visible,
            enabled=enabled,
            name=name or f"Button({text})",
            layer=t.layers.buttons,
        )
        self._min_size = (float(self.style.min_width), float(self.style.height))
        self._preferred_size = (resolved_w, resolved_h)
        self._measure_from_content()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    @property
    def text(self) -> str:
        """Button label text."""
        return self._text

    @text.setter
    def text(self, value: str) -> None:
        """Update label and invalidate cached text surface."""
        if value != self._text:
            self._text = value
            self._text_dirty = True
            self._measure_from_content()

    @property
    def state(self) -> ButtonState:
        """Current interaction state."""
        return self._state

    @property
    def icon(self) -> Optional[pygame.Surface]:
        """Optional icon surface."""
        return self._icon

    @icon.setter
    def icon(self, value: Optional[pygame.Surface]) -> None:
        """Replace icon and remeasure."""
        self._icon = value
        self._measure_from_content()

    def set_callback(self, callback: Callable[[], None] | None) -> None:
        """
        Assign or clear the click callback.

        Args:
            callback: Zero-arg callable, or None.
        """
        self._callback = callback

    def set_enabled(self, enabled: bool) -> None:
        """
        Enable or disable the button.

        Args:
            enabled: New enabled flag.
        """
        self.enabled = enabled
        if not enabled:
            self._state = ButtonState.DISABLED
            self._hover_t = 0.0
            self._press_t = 0.0
        elif self._state == ButtonState.DISABLED:
            self._state = ButtonState.FOCUSED if self._focused else ButtonState.NORMAL

    # ------------------------------------------------------------------
    # Measurement
    # ------------------------------------------------------------------

    def _ensure_font(self) -> pygame.font.Font:
        """Lazily create the button font at logical size."""
        if self._font is None:
            # SysFont fallback until Kenney pixel fonts are installed.
            size = max(8, int(self.style.font_size))
            self._font = pygame.font.SysFont("consolas", size)
        return self._font

    def _measure_from_content(self) -> None:
        """
        Compute preferred width from text + icon + padding.

        Height stays at style.height unless explicitly overridden later.
        """
        font = self._ensure_font()
        text_w, _ = font.size(self._text) if self._text else (0, 0)
        icon_w = 0
        if self._icon is not None:
            icon_w = self.style.icon_size + (self.style.icon_gap if self._text else 0)
        content_w = icon_w + text_w
        total_w = max(
            self.style.min_width,
            content_w + self.style.padding_x * 2,
        )
        self._preferred_size = (float(total_w), float(self.style.height))
        # Only grow if current width is still at default min (layout may set size).
        if self.width < total_w:
            self.width = float(total_w)
        self.height = float(self.style.height)
        self._text_dirty = True

    def _get_text_surface(self) -> pygame.Surface:
        """Render (and cache) the label surface for the current state."""
        if self._text_surf is None or self._text_dirty:
            font = self._ensure_font()
            color = (
                self.style.text_disabled
                if self._state == ButtonState.DISABLED
                else self.style.text_color
            )
            self._text_surf = font.render(self._text, True, color)
            self._text_dirty = False
        return self._text_surf

    # ------------------------------------------------------------------
    # State / animation
    # ------------------------------------------------------------------

    def _sync_state_from_input(self) -> None:
        """Derive ButtonState from enabled / hover / press / focus flags."""
        if not self.enabled:
            self._state = ButtonState.DISABLED
            return
        if self._was_pressed_inside and self._hover:
            self._state = ButtonState.PRESSED
        elif self._hover:
            self._state = ButtonState.HOVER
        elif self._focused:
            self._state = ButtonState.FOCUSED
        else:
            self._state = ButtonState.NORMAL

    def _fill_color(self) -> tuple[int, int, int]:
        """Resolve fill color for the current state."""
        mapping = {
            ButtonState.NORMAL: self.style.normal,
            ButtonState.HOVER: self.style.hover,
            ButtonState.PRESSED: self.style.pressed,
            ButtonState.DISABLED: self.style.disabled,
            ButtonState.FOCUSED: self.style.focused,
        }
        return mapping[self._state]

    def _border_color(self) -> tuple[int, int, int]:
        """Resolve border color for the current state."""
        if self._state == ButtonState.DISABLED:
            return self.style.border_color
        if self._state in (ButtonState.HOVER, ButtonState.PRESSED):
            return self.style.border_hover
        if self._state == ButtonState.FOCUSED:
            return self.style.border_focused
        return self.style.border_color

    def _current_scale_factor(self) -> float:
        """
        Visual scale multiplier from hover / press animation.

        Hover grows toward hover_scale; press shrinks toward press_scale.
        """
        base = 1.0
        hover_extra = (self.style.hover_scale - 1.0) * self._hover_t
        press_extra = (1.0 - self.style.press_scale) * self._press_t
        return base + hover_extra - press_extra

    # ------------------------------------------------------------------
    # Lifecycle overrides
    # ------------------------------------------------------------------

    def _update(self, dt: float) -> None:
        """
        Smoothly animate hover glow and press scale.

        Args:
            dt: Delta time in seconds.
        """
        self._sync_state_from_input()

        hover_target = 1.0 if self._state in (ButtonState.HOVER, ButtonState.PRESSED, ButtonState.FOCUSED) else 0.0
        press_target = 1.0 if self._state == ButtonState.PRESSED else 0.0

        hover_speed = 1.0 / max(0.001, self.style.hover_duration)
        press_speed = 1.0 / max(0.001, self.style.press_duration)

        self._hover_t = _approach(self._hover_t, hover_target, hover_speed * dt)
        self._press_t = _approach(self._press_t, press_target, press_speed * dt)

    def _handle_event(self, event: pygame.event.Event) -> bool:
        """
        Handle mouse hover / press / click and focus keys.

        Args:
            event: Pygame event.

        Returns:
            True if the event was consumed.
        """
        if not self.enabled:
            # Still track hover exit for cleanliness, but ignore clicks.
            if event.type == pygame.MOUSEMOTION:
                inside = self.contains_screen_point(event.pos)
                if self._hover and not inside:
                    self._hover = False
                    if self.on_hover_exit:
                        self.on_hover_exit(self)
            return False

        if event.type == pygame.MOUSEMOTION:
            inside = self.contains_screen_point(event.pos)
            if inside and not self._hover:
                self._hover = True
                if self.on_hover_enter:
                    self.on_hover_enter(self)
                self._play_sound(self.style.sound_hover)
            elif not inside and self._hover:
                self._hover = False
                if self.on_hover_exit:
                    self.on_hover_exit(self)
            return False  # motion rarely consumed

        if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
            if self.contains_screen_point(event.pos):
                self._was_pressed_inside = True
                self._focused = True
                return True

        if event.type == pygame.MOUSEBUTTONUP and event.button == 1:
            if self._was_pressed_inside and self.contains_screen_point(event.pos):
                self._was_pressed_inside = False
                self._fire_click()
                return True
            self._was_pressed_inside = False
            return False

        if event.type == pygame.KEYDOWN and self._focused:
            if event.key in (pygame.K_RETURN, pygame.K_SPACE):
                self._was_pressed_inside = True
                return True

        if event.type == pygame.KEYUP and self._focused:
            if event.key in (pygame.K_RETURN, pygame.K_SPACE) and self._was_pressed_inside:
                self._was_pressed_inside = False
                self._fire_click()
                return True

        return False

    def _fire_click(self) -> None:
        """Invoke callbacks and play click sound."""
        self._play_sound(self.style.sound_click)
        if self._callback:
            self._callback()
        if self.on_click:
            self.on_click(self)

    def _play_sound(self, key: Optional[str]) -> None:
        """
        Play a UI sound by logical key.

        Sound wiring is deferred to the audio system; this is a safe no-op
        until a SoundBus is injected on Theme / UIManager.

        Args:
            key: Logical sound id, or None to skip.
        """
        if key is None:
            return
        # Hook point: UIManager / AudioBus will resolve keys → Sound.
        return

    def _draw(self, surface: pygame.Surface) -> None:
        """
        Draw button body, glow, icon, and label at current scale.

        Args:
            surface: Target surface.
        """
        sr = self.screen_rect
        scale_factor = self._current_scale_factor()

        # Apply visual scale about center for hover / press feedback.
        if abs(scale_factor - 1.0) > 0.001:
            cx, cy = sr.center
            w = max(1, int(sr.width * scale_factor))
            h = max(1, int(sr.height * scale_factor))
            draw_rect = pygame.Rect(0, 0, w, h)
            draw_rect.center = (cx, cy)
        else:
            draw_rect = sr

        radius = max(1, self.theme.scaled(self.style.corner_radius, self._scale))
        border_w = max(1, self.theme.scaled(self.style.border_width, self._scale))

        # Hover glow behind the button
        if self._hover_t > 0.01 and self.enabled:
            glow = pygame.Surface((draw_rect.width + 8, draw_rect.height + 8), pygame.SRCALPHA)
            ga = int(self.style.hover_glow[3] * self._hover_t)
            glow_color = (*self.style.hover_glow[:3], ga)
            pygame.draw.rect(
                glow,
                glow_color,
                glow.get_rect(),
                border_radius=radius + 2,
            )
            surface.blit(glow, (draw_rect.x - 4, draw_rect.y - 4))

        # Body
        body = pygame.Surface(draw_rect.size, pygame.SRCALPHA)
        fill = (*self._fill_color(), self._alpha)
        pygame.draw.rect(body, fill, body.get_rect(), border_radius=radius)

        # Top highlight stripe (pixel-art wooden / glossy feel)
        if self.enabled and self._state != ButtonState.PRESSED:
            highlight = pygame.Surface((draw_rect.width, max(2, draw_rect.height // 4)), pygame.SRCALPHA)
            highlight.fill((255, 255, 255, 35))
            body.blit(highlight, (0, 0))

        # Border
        pygame.draw.rect(
            body,
            (*self._border_color(), self._alpha),
            body.get_rect(),
            width=border_w,
            border_radius=radius,
        )
        surface.blit(body, draw_rect.topleft)

        # Content: icon + text centered
        self._draw_content(surface, draw_rect)

    def _draw_content(self, surface: pygame.Surface, draw_rect: pygame.Rect) -> None:
        """
        Draw icon and text centered within the button rect.

        Args:
            surface: Target surface.
            draw_rect: Already-scaled (and possibly visually scaled) rect.
        """
        s = self._scale
        gap = self.theme.scaled(self.style.icon_gap, s)
        icon_size = self.theme.scaled(self.style.icon_size, s)

        icon_surf: Optional[pygame.Surface] = None
        text_surf: Optional[pygame.Surface] = None
        shadow_surf: Optional[pygame.Surface] = None

        if self._icon is not None:
            icon_surf = pygame.transform.scale(self._icon, (icon_size, icon_size))

        if self._text:
            font = pygame.font.SysFont(
                "consolas",
                max(8, self.theme.scaled(self.style.font_size, s)),
            )
            color = (
                self.style.text_disabled
                if not self.enabled
                else self.style.text_color
            )
            shadow_surf = font.render(self._text, True, self.style.text_shadow)
            text_surf = font.render(self._text, True, color)

        total_w = 0
        if icon_surf is not None:
            total_w += icon_surf.get_width()
        if text_surf is not None:
            if icon_surf is not None:
                total_w += gap
            total_w += text_surf.get_width()

        cursor_x = draw_rect.centerx - total_w // 2
        center_y = draw_rect.centery

        if icon_surf is not None:
            ir = icon_surf.get_rect()
            ir.midleft = (cursor_x, center_y)
            surface.blit(icon_surf, ir)
            cursor_x = ir.right + (gap if text_surf is not None else 0)

        if text_surf is not None and shadow_surf is not None:
            tr = text_surf.get_rect()
            tr.midleft = (cursor_x, center_y)
            offset = self.theme.scaled(1, s)
            surface.blit(shadow_surf, tr.move(offset, offset))
            surface.blit(text_surf, tr)

def _approach(current: float, target: float, max_delta: float) -> float:
    """
    Move ``current`` toward ``target`` by at most ``max_delta``.

    Args:
        current: Current value.
        target: Desired value.
        max_delta: Maximum absolute change this frame.

    Returns:
        Updated value.
    """
    if current < target:
        return min(current + max_delta, target)
    return max(current - max_delta, target)
