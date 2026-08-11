"""
10-slot hotbar with selection animations, mouse wheel, and number key bindings.
"""

from __future__ import annotations

from typing import Any, Callable, Optional

import pygame

from ui.inventory.dragdrop import DragDropController
from ui.inventory.inventory_slot import InventorySlot
from ui.styles import DEFAULT_STYLES
from ui.theme import Theme
from ui.widgets.base import Widget


class Hotbar(Widget):
    """
    Bottom hotbar displaying the first 10 slots of player inventory.
    Provides keybind selection, scroll wheel controls, and animated gold glow selection feedback.
    """

    SLOT_COUNT = 10

    def __init__(
        self,
        *,
        x: float = 0.0,
        y: float = 0.0,
        theme: Theme | None = None,
        drag: DragDropController | None = None,
        on_hover_item: Callable[[dict[str, Any] | None, tuple[int, int]], None] | None = None,
        on_select: Callable[[int], None] | None = None,
    ) -> None:
        t = theme or DEFAULT_STYLES.theme
        style = DEFAULT_STYLES.slot
        gap = t.spacing.sm
        
        # Calculate size based on slots
        width = self.SLOT_COUNT * style.size + (self.SLOT_COUNT - 1) * gap + t.spacing.md * 2
        height = style.size + t.spacing.md * 2

        super().__init__(
            x,
            y,
            width,
            height,
            theme=t,
            name="Hotbar",
            layer=t.layers.panels,
        )
        self.drag = drag if drag is not None else DragDropController()
        self.on_select = on_select
        self.selected = 0
        self._select_pulse = 0.0
        self._slots: list[InventorySlot] = []

        for i in range(self.SLOT_COUNT):
            slot = InventorySlot(
                i,
                style=style,
                theme=t,
                drag=self.drag,
                on_hover_item=on_hover_item,
                on_right_click=lambda idx: self.select(idx),
            )
            slot.is_hotbar = True
            self._slots.append(slot)
            self.add_child(slot)

        self._layout_slots()
        self.select(0)

    def _layout_slots(self) -> None:
        """Arrange slot widgets inside the hotbar panel."""
        gap = self.theme.spacing.sm
        size = self.theme.sizes.slot_size
        pad = self.theme.spacing.md
        for i, slot in enumerate(self._slots):
            slot.set_position(self.x + pad + i * (size + gap), self.y + pad)
            slot.selected = (i == self.selected)

    def set_position(self, x: float, y: float) -> None:
        """Update hotbar and children slot positions."""
        super().set_position(x, y)
        self._layout_slots()

    def select(self, index: int) -> None:
        """
        Change hotbar slot selection.

        Args:
            index: 0 to 9.
        """
        self.selected = index % self.SLOT_COUNT
        # Trigger an animated pulse of the selection border
        self._select_pulse = 1.0
        
        for i, slot in enumerate(self._slots):
            slot.selected = (i == self.selected)
            
        if self.on_select:
            self.on_select(self.selected)

    def set_slot(self, index: int, item_id: str | None, count: int, meta: dict | None = None) -> None:
        """Assign item stack contents to a specific hotbar slot."""
        if 0 <= index < self.SLOT_COUNT:
            self._slots[index].set_stack(item_id, count, meta)

    def _update(self, dt: float) -> None:
        """Fade selection pulse over time."""
        self._select_pulse = max(0.0, self._select_pulse - dt * 3.0)

    def _handle_event(self, event: pygame.event.Event) -> bool:
        """Handle mouse scrolling and keyboard shortcuts (1-0)."""
        if event.type == pygame.MOUSEWHEEL:
            if self.contains_screen_point(pygame.mouse.get_pos()):
                # Scroll wheel cycles active selection
                self.select(self.selected - event.y)
                return True
                
        if event.type == pygame.KEYDOWN:
            key_map = {
                pygame.K_1: 0,
                pygame.K_2: 1,
                pygame.K_3: 2,
                pygame.K_4: 3,
                pygame.K_5: 4,
                pygame.K_6: 5,
                pygame.K_7: 6,
                pygame.K_8: 7,
                pygame.K_9: 8,
                pygame.K_0: 9,
            }
            if event.key in key_map:
                self.select(key_map[event.key])
                return True
                
        return False

    def _draw(self, surface: pygame.Surface) -> None:
        """Draw tray panel background and blit selection pulse glows."""
        sr = self.screen_rect
        s = self._scale
        radius = max(2, self.theme.scaled(self.theme.sizes.corner_radius, s))
        
        # Draw tray backplane
        body = pygame.Surface(sr.size, pygame.SRCALPHA)
        pygame.draw.rect(
            body,
            (*self.theme.colors.panel_bg_dark, 230),
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

        # Draw selection glow frame around active slot
        slot = self._slots[self.selected]
        glow_inflate = max(4, int(6 * s))
        glow_rect = slot.screen_rect.inflate(glow_inflate, glow_inflate)
        
        # High fidelity pulse glow
        glow_alpha = int(140 * self._select_pulse) + 60
        glow_surf = pygame.Surface(glow_rect.size, pygame.SRCALPHA)
        
        # Glowing border frame
        pygame.draw.rect(
            glow_surf,
            (*self.theme.colors.border_gold, glow_alpha),
            glow_surf.get_rect(),
            width=max(2, int(3 * s)),
            border_radius=radius,
        )
        surface.blit(glow_surf, glow_rect.topleft)
