"""
Abstract base widget for the AI Civilization UI system.

All interactive and visual UI elements inherit from Widget. Layout managers
(Grid) and containers (Panel, Window) operate on this common interface.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from enum import Enum, auto
from typing import Callable, Optional, Sequence

import pygame

from ui.theme import DEFAULT_THEME, Theme


class Anchor(Enum):
    """Normalized anchor points for positioning relative to a parent."""

    TOP_LEFT = auto()
    TOP_CENTER = auto()
    TOP_RIGHT = auto()
    CENTER_LEFT = auto()
    CENTER = auto()
    CENTER_RIGHT = auto()
    BOTTOM_LEFT = auto()
    BOTTOM_CENTER = auto()
    BOTTOM_RIGHT = auto()


class Widget(ABC):
    """
    Base class for every UI component.

    Responsibilities:
        - Own a rect in *logical* (design-resolution) coordinates.
        - Accept scale from the UI manager for responsive rendering.
        - Manage visibility, enabled state, and child widgets.
        - Forward update / event / draw through a consistent lifecycle.
    """

    def __init__(
        self,
        x: float = 0.0,
        y: float = 0.0,
        width: float = 0.0,
        height: float = 0.0,
        *,
        theme: Theme | None = None,
        visible: bool = True,
        enabled: bool = True,
        name: str = "",
        layer: int | None = None,
    ) -> None:
        """
        Initialize a widget with logical position and size.

        Args:
            x: Logical left coordinate.
            y: Logical top coordinate.
            width: Logical width.
            height: Logical height.
            theme: Theme injection; defaults to DEFAULT_THEME.
            visible: Whether the widget is drawn.
            enabled: Whether the widget accepts input.
            name: Optional debug / lookup name.
            layer: Render layer override; None uses subclass default.
        """
        self.theme: Theme = theme or DEFAULT_THEME
        self.name: str = name
        self.visible: bool = visible
        self.enabled: bool = enabled
        self._layer: int = layer if layer is not None else self.theme.layers.panels

        # Logical (unscaled) rectangle — layout works in this space.
        self._rect = pygame.Rect(float(x), float(y), float(width), float(height))
        self._preferred_size: tuple[float, float] = (float(width), float(height))
        self._min_size: tuple[float, float] = (0.0, 0.0)
        self._max_size: tuple[float, float] = (float("inf"), float("inf"))

        self._parent: Optional[Widget] = None
        self._children: list[Widget] = []
        self._scale: float = 1.0
        self._alpha: int = 255
        self._hover: bool = False
        self._focused: bool = False
        self._dirty: bool = True

        # Optional callbacks
        self.on_click: Optional[Callable[["Widget"], None]] = None
        self.on_hover_enter: Optional[Callable[["Widget"], None]] = None
        self.on_hover_exit: Optional[Callable[["Widget"], None]] = None

    # ------------------------------------------------------------------
    # Geometry
    # ------------------------------------------------------------------

    @property
    def rect(self) -> pygame.Rect:
        """Logical rectangle (design-resolution space)."""
        return self._rect

    @rect.setter
    def rect(self, value: pygame.Rect) -> None:
        """Replace the logical rectangle and mark dirty."""
        self._rect = pygame.Rect(value)
        self._dirty = True

    @property
    def x(self) -> float:
        """Logical left edge."""
        return float(self._rect.x)

    @x.setter
    def x(self, value: float) -> None:
        self._rect.x = int(value)
        self._dirty = True

    @property
    def y(self) -> float:
        """Logical top edge."""
        return float(self._rect.y)

    @y.setter
    def y(self, value: float) -> None:
        self._rect.y = int(value)
        self._dirty = True

    @property
    def width(self) -> float:
        """Logical width."""
        return float(self._rect.width)

    @width.setter
    def width(self, value: float) -> None:
        self._rect.width = max(0, int(value))
        self._dirty = True

    @property
    def height(self) -> float:
        """Logical height."""
        return float(self._rect.height)

    @height.setter
    def height(self, value: float) -> None:
        self._rect.height = max(0, int(value))
        self._dirty = True

    @property
    def position(self) -> tuple[float, float]:
        """Logical (x, y) position."""
        return (self.x, self.y)

    @position.setter
    def position(self, value: tuple[float, float]) -> None:
        self.x, self.y = value

    @property
    def size(self) -> tuple[float, float]:
        """Logical (width, height)."""
        return (self.width, self.height)

    @size.setter
    def size(self, value: tuple[float, float]) -> None:
        self.width, self.height = value

    @property
    def preferred_size(self) -> tuple[float, float]:
        """Preferred size used by layout managers."""
        return self._preferred_size

    @preferred_size.setter
    def preferred_size(self, value: tuple[float, float]) -> None:
        self._preferred_size = value

    @property
    def min_size(self) -> tuple[float, float]:
        """Minimum size constraint for layout."""
        return self._min_size

    @min_size.setter
    def min_size(self, value: tuple[float, float]) -> None:
        self._min_size = value

    @property
    def screen_rect(self) -> pygame.Rect:
        """
        Rectangle in screen (scaled) pixels.

        Used for hit-testing against mouse coordinates.
        """
        s = self._scale
        return pygame.Rect(
            int(round(self._rect.x * s)),
            int(round(self._rect.y * s)),
            max(1, int(round(self._rect.width * s))),
            max(1, int(round(self._rect.height * s))),
        )

    @property
    def scale(self) -> float:
        """Current UI scale factor."""
        return self._scale

    @property
    def layer(self) -> int:
        """Render layer (z-order)."""
        return self._layer

    @layer.setter
    def layer(self, value: int) -> None:
        self._layer = value

    @property
    def alpha(self) -> int:
        """Draw opacity 0–255."""
        return self._alpha

    @alpha.setter
    def alpha(self, value: int) -> None:
        self._alpha = max(0, min(255, int(value)))

    @property
    def parent(self) -> Optional[Widget]:
        """Parent widget, if any."""
        return self._parent

    @property
    def children(self) -> Sequence[Widget]:
        """Read-only view of child widgets."""
        return tuple(self._children)

    @property
    def is_hovered(self) -> bool:
        """True while the pointer is over this widget."""
        return self._hover

    @property
    def is_focused(self) -> bool:
        """True when this widget has keyboard focus."""
        return self._focused

    # ------------------------------------------------------------------
    # Hierarchy
    # ------------------------------------------------------------------

    def add_child(self, child: Widget) -> Widget:
        """
        Attach a child widget.

        Args:
            child: Widget to add.

        Returns:
            The child (for fluent chaining).
        """
        if child._parent is not None:
            child._parent.remove_child(child)
        child._parent = self
        child.set_scale(self._scale)
        self._children.append(child)
        self._dirty = True
        return child

    def remove_child(self, child: Widget) -> None:
        """
        Detach a child widget if present.

        Args:
            child: Widget to remove.
        """
        if child in self._children:
            self._children.remove(child)
            child._parent = None
            self._dirty = True

    def clear_children(self) -> None:
        """Remove all children."""
        for child in list(self._children):
            child._parent = None
        self._children.clear()
        self._dirty = True

    def set_scale(self, scale: float) -> None:
        """
        Propagate UI scale to this widget and all descendants.

        Args:
            scale: Scale factor from Theme.compute_scale.
        """
        self._scale = scale
        for child in self._children:
            child.set_scale(scale)

    def set_focused(self, focused: bool) -> None:
        """
        Set keyboard focus state.

        Args:
            focused: Whether this widget is focused.
        """
        self._focused = focused

    # ------------------------------------------------------------------
    # Layout helpers
    # ------------------------------------------------------------------

    def set_position(self, x: float, y: float) -> None:
        """
        Set logical position.

        Args:
            x: Logical left.
            y: Logical top.
        """
        self.x = x
        self.y = y

    def set_size(self, width: float, height: float) -> None:
        """
        Set logical size, clamped to min/max.

        Args:
            width: Desired width.
            height: Desired height.
        """
        min_w, min_h = self._min_size
        max_w, max_h = self._max_size
        self.width = max(min_w, min(max_w, width))
        self.height = max(min_h, min(max_h, height))

    def move_by(self, dx: float, dy: float) -> None:
        """
        Translate by a logical delta.

        Args:
            dx: Horizontal delta.
            dy: Vertical delta.
        """
        self.x += dx
        self.y += dy

    def contains_screen_point(self, pos: tuple[int, int]) -> bool:
        """
        Hit-test against a screen-space point.

        Args:
            pos: Mouse position in screen pixels.

        Returns:
            True if the point lies inside the scaled rect.
        """
        return self.screen_rect.collidepoint(pos)

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def update(self, dt: float) -> None:
        """
        Advance animations and child state.

        Args:
            dt: Delta time in seconds.
        """
        if not self.visible:
            return
        self._update(dt)
        for child in self._children:
            child.update(dt)

    def handle_event(self, event: pygame.event.Event) -> bool:
        """
        Process an input event; children receive it first (top-most).

        Args:
            event: Pygame event.

        Returns:
            True if the event was consumed.
        """
        if not self.visible or not self.enabled:
            return False

        # Children in reverse draw order (last drawn = top-most).
        for child in reversed(self._children):
            if child.handle_event(event):
                return True

        return self._handle_event(event)

    def draw(self, surface: pygame.Surface) -> None:
        """
        Render this widget then its children (painter's algorithm).

        Args:
            surface: Target pygame surface (usually the screen).
        """
        if not self.visible or self._alpha <= 0:
            return
        self._draw(surface)
        # Sort children by layer so icons/text draw above panels, etc.
        for child in sorted(self._children, key=lambda w: w.layer):
            child.draw(surface)

    # ------------------------------------------------------------------
    # Subclass hooks
    # ------------------------------------------------------------------

    def _update(self, dt: float) -> None:
        """
        Subclass update hook (animations, smooth values).

        Args:
            dt: Delta time in seconds.
        """
        return

    def _handle_event(self, event: pygame.event.Event) -> bool:
        """
        Subclass event hook.

        Args:
            event: Pygame event.

        Returns:
            True if consumed.
        """
        return False

    @abstractmethod
    def _draw(self, surface: pygame.Surface) -> None:
        """
        Subclass draw hook — render this widget only (not children).

        Args:
            surface: Target surface.
        """
        raise NotImplementedError

    def __repr__(self) -> str:
        """Debug representation."""
        label = self.name or self.__class__.__name__
        return (
            f"<{label} rect={tuple(self._rect)} "
            f"visible={self.visible} enabled={self.enabled}>"
        )
