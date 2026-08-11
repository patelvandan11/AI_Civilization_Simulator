"""
Right-side static item details panel with statistics and actions.
"""

from __future__ import annotations

from typing import Any, Callable, Optional

import pygame

from ui.styles import DEFAULT_STYLES
from ui.theme import Theme
from ui.widgets.base import Widget
from ui.widgets.button import Button
from ui.inventory.inventory_slot import load_item_icon


class InventoryDetails(Widget):
    """
    Fixed item details panel displaying stats and action buttons for the selected item.
    """

    def __init__(
        self,
        *,
        x: float = 0.0,
        y: float = 0.0,
        width: float = 240.0,
        height: float = 360.0,
        theme: Theme | None = None,
        is_usable_fn: Optional[Callable[[str], bool]] = None,
        on_use: Optional[Callable[[str], None]] = None,
        on_sell: Optional[Callable[[str], None]] = None,
        on_drop: Optional[Callable[[str], None]] = None,
        on_split: Optional[Callable[[str], None]] = None,
        on_favorite: Optional[Callable[[str], None]] = None,
    ) -> None:
        self.t = theme or DEFAULT_STYLES.theme
        super().__init__(
            x,
            y,
            width,
            height,
            theme=self.t,
            name="InventoryDetails",
            layer=self.t.layers.panels,
        )
        self.is_usable_fn = is_usable_fn or (lambda item_id: False)
        self.on_use_cb = on_use
        self.on_sell_cb = on_sell
        self.on_drop_cb = on_drop
        self.on_split_cb = on_split
        self.on_favorite_cb = on_favorite

        # Current state
        self.item_data: Optional[dict[str, Any]] = None

        # Build sub buttons (initially hidden/disabled)
        btn_w = (width - 24) / 2
        btn_h = 26.0
        
        self.use_btn = Button(text="Use", width=btn_w, height=btn_h, theme=self.t, callback=self._use_item)
        self.fav_btn = Button(text="Favorite", width=btn_w, height=btn_h, theme=self.t, callback=self._fav_item)
        self.sell_btn = Button(text="Sell", width=btn_w, height=btn_h, theme=self.t, callback=self._sell_item)
        self.split_btn = Button(text="Split", width=btn_w, height=btn_h, theme=self.t, callback=self._split_item)
        
        # Red warning style for Drop
        drop_style = DEFAULT_STYLES.with_button(
            normal=(160, 60, 50),
            hover=(190, 80, 65),
            pressed=(120, 40, 35),
            border_color=(80, 25, 20),
        ).button
        self.drop_btn = Button(text="Drop", width=width - 16, height=btn_h, style=drop_style, theme=self.t, callback=self._drop_item)

        # Register children
        self.add_child(self.use_btn)
        self.add_child(self.fav_btn)
        self.add_child(self.sell_btn)
        self.add_child(self.split_btn)
        self.add_child(self.drop_btn)

        self._layout_buttons()
        self._sync_buttons()

    def set_item(self, item_data: Optional[dict[str, Any]]) -> None:
        """
        Update the displayed item details and button states.

        Args:
            item_data: Dict with keys: name, description, weight, value, durability, stack, item_id, category, rarity, is_favorite.
        """
        self.item_data = item_data
        self._sync_buttons()

    def set_position(self, x: float, y: float) -> None:
        """Move widget and reposition buttons."""
        super().set_position(x, y)
        self._layout_buttons()

    def set_size(self, width: float, height: float) -> None:
        """Resize widget and reposition buttons."""
        super().set_size(width, height)
        self._layout_buttons()

    def _layout_buttons(self) -> None:
        """Lay out action buttons at the bottom of the details card."""
        btn_w = (self.width - 24) / 2
        btn_h = 26.0

        self.use_btn.set_size(btn_w, btn_h)
        self.fav_btn.set_size(btn_w, btn_h)
        self.sell_btn.set_size(btn_w, btn_h)
        self.split_btn.set_size(btn_w, btn_h)
        self.drop_btn.set_size(self.width - 16, btn_h)

        # Anchor buttons to the bottom of the card
        bottom_y = self.y + self.height - 8
        
        self.drop_btn.set_position(self.x + 8, bottom_y - btn_h)
        self.sell_btn.set_position(self.x + 8, bottom_y - btn_h * 2 - 6)
        self.split_btn.set_position(self.x + 8 + btn_w + 8, bottom_y - btn_h * 2 - 6)
        self.use_btn.set_position(self.x + 8, bottom_y - btn_h * 3 - 12)
        self.fav_btn.set_position(self.x + 8 + btn_w + 8, bottom_y - btn_h * 3 - 12)

    def _sync_buttons(self) -> None:
        """Enable or disable buttons based on item properties."""
        if not self.item_data:
            # No item selected: disable and hide everything
            for btn in (self.use_btn, self.fav_btn, self.sell_btn, self.split_btn, self.drop_btn):
                btn.enabled = False
                btn.visible = False
            return

        item_id = str(self.item_data.get("item_id", ""))
        stack = int(self.item_data.get("stack", 1))
        is_fav = bool(self.item_data.get("is_favorite", False))

        # 1. Use Button (only enabled for edible food or usable items)
        self.use_btn.enabled = self.is_usable_fn(item_id)
        self.use_btn.visible = True

        # 2. Favorite button (toggles label)
        self.fav_btn.enabled = True
        self.fav_btn.visible = True
        self.fav_btn.text = "Unfavorite" if is_fav else "Favorite"

        # 3. Sell button (enabled if value > 0)
        value = self.item_data.get("value", 0)
        self.sell_btn.enabled = isinstance(value, int) and value > 0
        self.sell_btn.visible = True

        # 4. Split button (only if stack size > 1)
        self.split_btn.enabled = stack > 1
        self.split_btn.visible = True

        # 5. Drop button (always visible and enabled for items)
        self.drop_btn.enabled = True
        self.drop_btn.visible = True

    # --- Button actions ---

    def _use_item(self) -> None:
        if self.item_data and self.on_use_cb:
            self.on_use_cb(self.item_data["item_id"])

    def _fav_item(self) -> None:
        if self.item_data and self.on_favorite_cb:
            self.on_favorite_cb(self.item_data["item_id"])

    def _sell_item(self) -> None:
        if self.item_data and self.on_sell_cb:
            self.on_sell_cb(self.item_data["item_id"])

    def _split_item(self) -> None:
        if self.item_data and self.on_split_cb:
            self.on_split_cb(self.item_data["item_id"])

    def _drop_item(self) -> None:
        if self.item_data and self.on_drop_cb:
            self.on_drop_cb(self.item_data["item_id"])

    def _draw(self, surface: pygame.Surface) -> None:
        """Render details panel outline, header, large icon frame, descriptions, and stat labels."""
        sr = self.screen_rect
        s = self._scale

        # Main details banner background
        pygame.draw.rect(
            surface,
            self.t.colors.panel_bg,
            sr,
            border_radius=max(2, self.t.scaled(6, s)),
        )
        pygame.draw.rect(
            surface,
            self.t.colors.border_dark,
            sr,
            width=max(1, self.t.scaled(2, s)),
            border_radius=max(2, self.t.scaled(6, s)),
        )

        font_title_size = max(11, self.t.scaled(14, s))
        font_body_size = max(9, self.t.scaled(11, s))
        font_stat_size = max(8, self.t.scaled(10.5, s))

        font_title = pygame.font.SysFont("consolas", font_title_size, bold=True)
        font_body = pygame.font.SysFont("consolas", font_body_size)
        font_stat = pygame.font.SysFont("consolas", font_stat_size)

        pad = self.t.scaled(10, s)

        if not self.item_data:
            # Placeholder drawing when empty
            no_item_surf = font_body.render("Select an item to view", True, self.t.colors.text_disabled)
            no_item_rect = no_item_surf.get_rect(center=sr.center)
            surface.blit(no_item_surf, no_item_rect.topleft)
            return

        # Rarity border highlight
        rarity = self.item_data.get("rarity", "Common")
        rarity_color = self.t.colors.border_gold
        if rarity == "Legendary":
            rarity_color = (240, 160, 30)
        elif rarity == "Epic":
            rarity_color = (150, 80, 200)
        elif rarity == "Rare":
            rarity_color = (55, 130, 210)
        else:
            rarity_color = self.t.colors.wood_light

        # 1. Render Item Name
        name_str = str(self.item_data.get("name", "Item"))
        name_surf = font_title.render(name_str, True, self.t.colors.text_title)
        name_rect = name_surf.get_rect(midtop=(sr.centerx, sr.y + pad))
        surface.blit(name_surf, name_rect.topleft)

        # 2. Render Large Icon Frame (Center top)
        icon_box_size = self.t.scaled(60, s)
        ib_x = sr.centerx - icon_box_size // 2
        ib_y = name_rect.bottom + max(2, int(6 * s))
        icon_box_rect = pygame.Rect(ib_x, ib_y, icon_box_size, icon_box_size)
        
        # Frame background
        pygame.draw.rect(surface, self.t.colors.panel_inset, icon_box_rect, border_radius=max(1, int(4 * s)))
        pygame.draw.rect(surface, rarity_color, icon_box_rect, width=max(1, int(2 * s)), border_radius=max(1, int(4 * s)))

        # Load and blit large icon image
        item_id = self.item_data["item_id"]
        icon_img = load_item_icon(item_id, icon_box_size - max(2, int(8 * s)))
        if icon_img:
            icon_rect = icon_img.get_rect(center=icon_box_rect.center)
            surface.blit(icon_img, icon_rect.topleft)
        else:
            # Text abbreviation fallback
            abbr_surf = font_title.render(item_id[:2].upper(), True, self.t.colors.text_primary)
            abbr_rect = abbr_surf.get_rect(center=icon_box_rect.center)
            surface.blit(abbr_surf, abbr_rect.topleft)

        # 3. Render Item Description (Word Wrapped)
        desc_str = str(self.item_data.get("description", ""))
        desc_y = icon_box_rect.bottom + max(2, int(6 * s))
        
        # Wrap description lines
        chars_per_line = max(18, int(self.width // 10))
        words = desc_str.split(" ")
        lines = []
        current_line = ""
        for w in words:
            if len(current_line) + len(w) + 1 <= chars_per_line:
                current_line += (w + " ")
            else:
                lines.append(current_line.strip())
                current_line = w + " "
        if current_line:
            lines.append(current_line.strip())

        # Render wrapping lines
        dy = desc_y
        for line in lines[:4]:  # limit lines to avoid overflowing buttons
            line_surf = font_body.render(line, True, self.t.colors.text_secondary)
            line_rect = line_surf.get_rect(centerx=sr.centerx)
            surface.blit(line_surf, (line_rect.x, dy))
            dy += line_surf.get_height() + 2

        # 4. Render Stat Details (Vertical list above action buttons)
        stats_top_y = dy + max(2, int(6 * s))
        
        stats = [
            ("Category", str(self.item_data.get("category", "General"))),
            ("Rarity", rarity),
            ("Weight", f"{self.item_data.get('weight', 0.0)} kg"),
            ("Value", f"${self.item_data.get('value', 0)}"),
            ("Stack", f"{self.item_data.get('stack', 1)}"),
        ]

        # Add durability to display if it exists
        dur = self.item_data.get("durability")
        if isinstance(dur, float):
            stats.append(("Durability", f"{int(dur * 100)}%"))

        line_spacing = max(2, self.t.scaled(13, s))
        for j, (label, val) in enumerate(stats):
            sy = stats_top_y + j * line_spacing
            
            # Don't overlap with buttons
            first_btn_y = self.screen_rect.y + self.t.scaled(self.use_btn.y - self.y, s)
            if sy + line_spacing > first_btn_y:
                break
                
            # Draw label (left aligned)
            label_surf = font_stat.render(label, True, self.t.colors.text_disabled)
            surface.blit(label_surf, (sr.x + pad + max(2, int(4 * s)), sy))
            
            # Draw value (right aligned)
            val_surf = font_stat.render(val, True, self.t.colors.text_primary if label != "Rarity" else rarity_color)
            vx = sr.right - val_surf.get_width() - pad - max(2, int(4 * s))
            surface.blit(val_surf, (vx, sy))
