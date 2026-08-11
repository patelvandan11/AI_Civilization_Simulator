"""
Layered UI manager: owns scale, root widgets, tooltips, drag ghosts, cursor layer.
"""

from __future__ import annotations

from typing import Optional

import pygame

from ui.inventory.dragdrop import DragDropController
from ui.theme import DEFAULT_THEME, Theme
from ui.widgets.base import Widget
from ui.widgets.tooltip import Tooltip


class UIManager:
    """
    Coordinates UI widgets, responsive scale, and overlay layers.
    """

    def __init__(self, theme: Theme | None = None) -> None:
        """
        Create manager.

        Args:
            theme: Shared Theme.
        """
        self.theme = theme or DEFAULT_THEME
        self.scale = 1.0
        self.widgets: list[Widget] = []
        self.drag = DragDropController()
        self.tooltip = Tooltip(theme=self.theme)
        self.tooltip.set_scale(1.0)

    def add(self, widget: Widget) -> Widget:
        """
        Register a root widget.

        Args:
            widget: Widget to manage.

        Returns:
            The same widget.
        """
        widget.set_scale(self.scale)
        self.widgets.append(widget)
        return widget

    def remove(self, widget: Widget) -> None:
        """Unregister a root widget."""
        if widget in self.widgets:
            self.widgets.remove(widget)

    def set_scale_for_screen(self, width: int, height: int) -> float:
        """
        Recompute UI scale and propagate.

        Args:
            width: Screen width.
            height: Screen height.

        Returns:
            New scale factor.
        """
        self.scale = self.theme.compute_scale(width, height)
        for w in self.widgets:
            w.set_scale(self.scale)
        self.tooltip.set_scale(self.scale)
        return self.scale

    def update(self, dt: float) -> None:
        """Update all visible widgets + tooltip."""
        for w in list(self.widgets):
            if w.visible:
                w.update(dt)
        self.tooltip.update(dt)

    def handle_event(self, event: pygame.event.Event) -> bool:
        """
        Dispatch events top-most first (windows above panels).

        Args:
            event: Pygame event.

        Returns:
            True if consumed.
        """
        if event.type == pygame.MOUSEMOTION and self.drag.active:
            self.drag.update_pos(event.pos)

        ordered = sorted(
            [w for w in self.widgets if w.visible],
            key=lambda w: w.layer,
            reverse=True,
        )
        for w in ordered:
            if w.handle_event(event):
                return True
        return False

    def draw(self, surface: pygame.Surface) -> None:
        """
        Layered draw: widgets by layer, then tooltip, then drag ghost.

        Args:
            surface: Screen surface.
        """
        for w in sorted(self.widgets, key=lambda x: x.layer):
            if w.visible:
                w.draw(surface)
        self.tooltip.draw(surface)
        if self.drag.active:
            self.drag.draw_ghost(surface, self.scale)

    def show_tooltip(self, data: dict | None, pos: tuple[int, int]) -> None:
        """Show or hide item tooltip."""
        if data is None:
            self.tooltip.hide()
        else:
            self.tooltip.show_item(data, pos)
