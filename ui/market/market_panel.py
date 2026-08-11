"""
Settlement Market UI for buying crop seeds and selling harvested crops/artisan products.
"""

from __future__ import annotations

import math
from typing import Any, Callable, Optional, Sequence

import pygame

from game.core.player import Player
from ui.inventory.inventory_slot import load_item_icon
from ui.styles import DEFAULT_STYLES
from ui.theme import Theme
from ui.widgets.button import Button
from ui.widgets.panel import Panel
from ui.widgets.scrollbar import Scrollbar


class MarketPanel(Panel):
    """
    Settlement Market interface containing a multi-tab view:
    - SELL Tab: sell raw crops and crafted products for profit.
    - BUY Tab: buy seeds for all crop types using cash.
    - Right sidebar details card with transactions confirmer.
    """

    def __init__(
        self,
        player: Player,
        item_catalog: dict[str, Any],
        crops_catalog: dict[str, Any],
        *,
        x: float = 0.0,
        y: float = 0.0,
        theme: Theme | None = None,
        on_sell: Optional[Callable[[str, int], None]] = None,
        on_buy: Optional[Callable[[str, int, int], None]] = None,
        on_close: Optional[Callable[[], None]] = None,
    ) -> None:
        self.t = theme or DEFAULT_STYLES.theme
        width = 940.0
        height = 540.0

        super().__init__(
            x=x,
            y=y,
            width=width,
            height=height,
            title="Settlement Market",
            theme=self.t,
            name="MarketPanel",
        )
        self.player = player
        self.catalog = item_catalog
        self.crops_catalog = crops_catalog
        
        self.on_sell_cb = on_sell
        self.on_buy_cb = on_buy
        self.on_close_cb = on_close

        # Tabs state: "SELL" or "BUY"
        self.current_tab = "SELL"
        self.selected_item_id: Optional[str] = None
        self.transaction_qty = 1

        # Scroll states
        self.sell_scroll = 0.0
        self.buy_scroll = 0.0
        self.hovered_row_idx: Optional[int] = None

        # Build Sub-widgets
        # 1. Tab buttons
        self.sell_tab_btn = Button(
            text="SELL PRODUCTS",
            width=160.0,
            height=32.0,
            theme=self.t,
            callback=lambda: self.switch_tab("SELL"),
            name="market_sell_tab",
        )
        self.add_child(self.sell_tab_btn)

        self.buy_tab_btn = Button(
            text="BUY SEEDS",
            width=160.0,
            height=32.0,
            theme=self.t,
            callback=lambda: self.switch_tab("BUY"),
            name="market_buy_tab",
        )
        self.add_child(self.buy_tab_btn)

        # 2. Scrollbar for list
        self.list_scrollbar = Scrollbar(
            height=height - 120.0,
            theme=self.t,
            name="market_list_scrollbar",
        )
        self.add_child(self.list_scrollbar)

        # 3. Transaction confirmation controls (Quantity selection)
        from dataclasses import replace
        small_btn_style = replace(
            DEFAULT_STYLES.button,
            min_width=0,
            padding_x=4,
            corner_radius=4,
        )
        self.qty_sub_btn = Button(
            text="-",
            width=28.0,
            height=26.0,
            theme=self.t,
            style=small_btn_style,
            callback=self._sub_qty,
            name="market_qty_sub",
        )
        self.qty_add_btn = Button(
            text="+",
            width=28.0,
            height=26.0,
            theme=self.t,
            style=small_btn_style,
            callback=self._add_qty,
            name="market_qty_add",
        )
        self.qty_max_btn = Button(
            text="MAX",
            width=48.0,
            height=26.0,
            theme=self.t,
            style=small_btn_style,
            callback=self._max_qty,
            name="market_qty_max",
        )
        
        self.add_child(self.qty_sub_btn)
        self.add_child(self.qty_add_btn)
        self.add_child(self.qty_max_btn)

        # 4. Confirm transaction button
        self.confirm_btn = Button(
            text="CONFIRM SALE",
            width=240.0,
            height=32.0,
            theme=self.t,
            callback=self._confirm_transaction,
            name="market_confirm",
        )
        self.add_child(self.confirm_btn)

        # 5. Back Button
        btn_style = DEFAULT_STYLES.with_button(
            normal=(90, 70, 45),
            hover=(120, 95, 55),
            pressed=(70, 50, 30),
            border_color=(40, 24, 14),
        ).button
        self.back_btn = Button(
            text="← Back to Hub",
            width=140.0,
            height=30.0,
            style=btn_style,
            theme=self.t,
            callback=self._close_clicked,
            name="market_back",
        )
        self.add_child(self.back_btn)

        self._refresh_tab_data()
        self._layout_children()

    def switch_tab(self, tab: str) -> None:
        """Switch active list tab."""
        if tab in ("SELL", "BUY") and tab != self.current_tab:
            self.current_tab = tab
            self.selected_item_id = None
            self.transaction_qty = 1
            self.list_scrollbar.scroll = 0.0
            
            # Sound feedback
            if hasattr(self.parent, "audio") and self.parent.audio:
                self.parent.audio.play("ui_click")
                
            self._refresh_tab_data()
            self._layout_children()

    def _refresh_tab_data(self) -> None:
        """Fetch buyable/sellable rosters."""
        if self.current_tab == "SELL":
            # Anything in player's inventory that is a crop, veggie, product, or resource (except tools)
            self._list_items = [
                (item_id, count)
                for item_id, count in self.player.inventory.items()
                if item_id in self.catalog and count > 0 and self.catalog[item_id].get("max_stack", 99) > 1
            ]
        else:
            # Seeds available to purchase
            seed_ids = [
                "apple_seed", "wheat_seed", "banana_seed", "cherry_seed", "grape_seed",
                "orange_seed", "strawberry_seed", "watermelon_seed", "avacado_seed",
                "peach_seed", "blue_berry_seed", "carrot_seed", "pumpkin_seed",
                "mushroom_seed", "corn_seed", "cucumber_seed", "brokeli_seed",
                "cabbige_seed", "chilly_seed", "reddies_seed"
            ]
            self._list_items = [
                (seed_id, self.player.inventory.get(seed_id))
                for seed_id in seed_ids
                if seed_id in self.catalog
            ]

        # Reset selection if invalid
        if self.selected_item_id:
            found = any(iid == self.selected_item_id for iid, _ in self._list_items)
            if not found:
                self.selected_item_id = None
                self.transaction_qty = 1
        
        # Select first item by default if none selected
        if not self.selected_item_id and self._list_items:
            self.selected_item_id = self._list_items[0][0]
            self.transaction_qty = 1

    def _close_clicked(self) -> None:
        if self.on_close_cb:
            self.on_close_cb()

    # --- Quantity Adjustments ---

    def _sub_qty(self) -> None:
        self.transaction_qty = max(1, self.transaction_qty - 1)

    def _add_qty(self) -> None:
        max_limit = self._get_max_transaction_qty()
        self.transaction_qty = min(max_limit, self.transaction_qty + 1)

    def _max_qty(self) -> None:
        self.transaction_qty = self._get_max_transaction_qty()

    def _get_max_transaction_qty(self) -> int:
        """Find max possible buy/sell amount based on money/inventory limits."""
        if not self.selected_item_id:
            return 1
        
        meta = self.catalog.get(self.selected_item_id, {})
        
        if self.current_tab == "SELL":
            # Max owned in inventory
            return max(1, self.player.inventory.get(self.selected_item_id))
        else:
            # Max affordable based on player money
            cost = int(meta.get("value", 5))
            if cost <= 0:
                return 99
            return max(1, self.player.money // cost)

    def _confirm_transaction(self) -> None:
        """Execute selected sale/purchase transaction."""
        if not self.selected_item_id:
            return

        item_id = self.selected_item_id
        qty = self.transaction_qty

        if self.current_tab == "SELL":
            # Process Sell callback
            if self.on_sell_cb:
                self.on_sell_cb(item_id, qty)
        else:
            # Process Buy callback
            meta = self.catalog.get(item_id, {})
            cost = int(meta.get("value", 5)) * qty
            if self.on_buy_cb:
                self.on_buy_cb(item_id, cost, qty)

        # Re-sync lists and limits
        self._refresh_tab_data()
        self.transaction_qty = 1
        self._layout_children()

    # --- Sizing & Positioning ---

    def set_position(self, x: float, y: float) -> None:
        """Move menu."""
        super().set_position(x, y)
        self._layout_children()

    def set_size(self, width: float, height: float) -> None:
        """Resize menu."""
        super().set_size(width, height)
        self._layout_children()

    def _layout_children(self) -> None:
        """Layout buttons, tabs, scrollbars, confirmation widgets."""
        pad = 16.0
        gap = 12.0
        top_y = 52.0
        list_y = top_y + 30.0 + gap

        px, py = self.x, self.y

        # 1. Tabs Top
        self.sell_tab_btn.set_position(px + pad, py + top_y)
        self.sell_tab_btn.set_size(140.0, 30.0)
        self.buy_tab_btn.set_position(px + pad + 140.0 + gap, py + top_y)
        self.buy_tab_btn.set_size(140.0, 30.0)

        # 2. Main List area starting below tabs (left)
        list_h = 390.0
        list_w = self.width - pad * 2 - 260.0 - gap * 2 - 16.0  # 16.0 scrollbar width

        # List Scrollbar
        self.list_scrollbar.set_position(px + pad + list_w + gap, py + list_y)
        self.list_scrollbar.set_size(16.0, list_h)

        # 3. Details Panel Right
        details_w = 260.0
        details_x = self.width - pad - details_w
        details_h = list_h + 30.0 + gap  # matches tabs + gap + list

        # Position of confirm button at the bottom of the details panel
        confirm_h = 36.0
        confirm_y = top_y + details_h - confirm_h - 20.0
        self.confirm_btn.set_position(px + details_x + 12.0, py + confirm_y)
        self.confirm_btn.set_size(details_w - 24.0, confirm_h)

        # Quantity Selector buttons layout (above Confirm button)
        qty_h = 28.0
        qty_y = confirm_y - qty_h - 14.0
        self.qty_sub_btn.set_position(px + details_x + 16.0, py + qty_y)
        self.qty_add_btn.set_position(px + details_x + 16.0 + 28.0 + 8.0, py + qty_y)
        self.qty_max_btn.set_position(px + details_x + details_w - 54.0 - 16.0, py + qty_y)

        self.qty_sub_btn.set_size(28.0, qty_h)
        self.qty_add_btn.set_size(28.0, qty_h)
        self.qty_max_btn.set_size(54.0, qty_h)

        # Back Button Bottom Left
        self.back_btn.set_position(px + pad, py + self.height - pad - 30.0)
        self.back_btn.set_size(140.0, 30.0)

    def _handle_event(self, event: pygame.event.Event) -> bool:
        """Handle list row hover and click selections."""
        pad = 16.0
        gap = 12.0
        top_y = 52.0
        list_y = top_y + 30.0 + gap

        list_h = 390.0
        list_w = self.width - pad * 2 - 260.0 - gap * 2 - 16.0

        c = self.screen_rect
        s = self._scale

        # Screen coordinates boundaries of list panel
        list_screen_rect = pygame.Rect(
            c.x + self.t.scaled(pad, s),
            c.y + self.t.scaled(list_y, s),
            self.t.scaled(list_w, s),
            self.t.scaled(list_h, s)
        )

        if event.type == pygame.MOUSEMOTION:
            if list_screen_rect.collidepoint(event.pos):
                ly = (event.pos[1] - list_screen_rect.y) / s
                row_h = 38.0
                idx = int(ly // row_h)

                # Retrieve row index with scroll offset
                scroll_offset = int(self.list_scrollbar.scroll * max(0, len(self._list_items) - 8))
                row_idx = idx + scroll_offset

                if 0 <= row_idx < len(self._list_items):
                    self.hovered_row_idx = row_idx
                else:
                    self.hovered_row_idx = None
            else:
                self.hovered_row_idx = None

        if event.type == pygame.MOUSEBUTTONDOWN:
            if event.button == 1 and list_screen_rect.collidepoint(event.pos):
                ly = (event.pos[1] - list_screen_rect.y) / s
                row_h = 38.0
                idx = int(ly // row_h)

                scroll_offset = int(self.list_scrollbar.scroll * max(0, len(self._list_items) - 8))
                row_idx = idx + scroll_offset

                if 0 <= row_idx < len(self._list_items):
                    self.selected_item_id = self._list_items[row_idx][0]
                    self.transaction_qty = 1

                    if hasattr(self.parent, "audio") and self.parent.audio:
                        self.parent.audio.play("ui_click")
                    self._layout_children()
                    return True

            # Intercept mouse wheel scrolling over list bounds
            if event.type == pygame.MOUSEWHEEL and list_screen_rect.collidepoint(pygame.mouse.get_pos()):
                self.list_scrollbar.scroll = max(
                    0.0,
                    min(1.0, self.list_scrollbar.scroll - event.y * 0.1),
                )
                self._layout_children()
                return True

        return False

    def _update(self, dt: float) -> None:
        """Maintain lists and scroll constraints."""
        self._refresh_tab_data()

        # Update button text label dynamically
        if self.current_tab == "SELL":
            self.confirm_btn.text = "CONFIRM SALE"
        else:
            self.confirm_btn.text = "CONFIRM PURCHASE"

        # Manage confirmation buttons enabled states
        max_qty = self._get_max_transaction_qty()
        if self.transaction_qty > max_qty:
            self.transaction_qty = max(1, max_qty)

        has_selection = self.selected_item_id is not None
        self.qty_sub_btn.enabled = has_selection and self.transaction_qty > 1
        self.qty_add_btn.enabled = has_selection and self.transaction_qty < max_qty
        self.qty_max_btn.enabled = has_selection and self.transaction_qty < max_qty

        if self.current_tab == "BUY":
            cost = int(self.catalog.get(self.selected_item_id, {}).get("value", 5)) * self.transaction_qty if has_selection else 0
            self.confirm_btn.enabled = has_selection and self.player.money >= cost and cost > 0
        else:
            self.confirm_btn.enabled = has_selection and self.player.inventory.has(self.selected_item_id, self.transaction_qty)

    def _draw_coin(self, surface: pygame.Surface, x: int, y: int, radius: int) -> None:
        """Draw gold coin icon."""
        pygame.draw.circle(surface, self.t.colors.border_gold, (x, y), radius)
        pygame.draw.circle(surface, (245, 210, 60), (x, y), radius - 1)
        pygame.draw.circle(surface, self.t.colors.border_dark, (x, y), radius, width=1)

    def _draw(self, surface: pygame.Surface) -> None:
        """Render multi-tab lists, pricing, totals, sidebar cards, icons."""
        super()._draw(surface)

        pad = 16.0
        gap = 12.0
        top_y = 52.0
        list_y = top_y + 30.0 + gap

        c = self.screen_rect
        s = self._scale

        list_h = 390.0
        list_w = self.width - pad * 2 - 260.0 - gap * 2 - 16.0

        details_w = 260.0
        details_x = self.width - pad - details_w
        details_h = list_h + 30.0 + gap

        # 1. Right Details panel outline
        details_w_scaled = self.t.scaled(details_w, s)
        details_h_scaled = self.t.scaled(details_h, s)
        details_rect = pygame.Rect(
            c.x + self.t.scaled(details_x, s),
            c.y + self.t.scaled(top_y, s),
            details_w_scaled,
            details_h_scaled
        )

        pygame.draw.rect(surface, self.t.colors.panel_bg_dark, details_rect, border_radius=max(2, int(6 * s)))
        pygame.draw.rect(surface, self.t.colors.border_dark, details_rect, width=max(1, int(2 * s)), border_radius=max(2, int(6 * s)))

        # Fonts
        font_header_size = max(11, self.t.scaled(14, s))
        font_body_size = max(9, self.t.scaled(11, s))
        font_stat_size = max(8, self.t.scaled(10.5, s))

        font_header = pygame.font.SysFont("consolas", font_header_size, bold=True)
        font_body = pygame.font.SysFont("consolas", font_body_size)
        font_stat = pygame.font.SysFont("consolas", font_stat_size)

        # 2. Draw active tab indicators
        # Draw Money indicator at top right
        money_str = f"${self.player.money:,}"
        money_surf = font_header.render(money_str, True, (245, 210, 60))
        mx = details_rect.right - money_surf.get_width() - max(4, int(12 * s))
        my = details_rect.y - max(4, int(22 * s))

        coin_radius = max(3, self.t.scaled(5.5, s))
        self._draw_coin(surface, mx - coin_radius - max(2, int(4 * s)), my + money_surf.get_height() // 2, coin_radius)
        surface.blit(money_surf, (mx, my))

        # 3. Draw Left List Container
        list_rect = pygame.Rect(
            c.x + self.t.scaled(pad, s),
            c.y + self.t.scaled(list_y, s),
            self.t.scaled(list_w, s),
            self.t.scaled(list_h, s)
        )
        pygame.draw.rect(surface, self.t.colors.panel_inset, list_rect, border_radius=max(2, int(4 * s)))
        pygame.draw.rect(surface, self.t.colors.border_dark, list_rect, width=max(1, int(2 * s)), border_radius=max(2, int(4 * s)))

        # Update scrollbar parameters
        visible_rows = 8
        total_rows = len(self._list_items)
        self.list_scrollbar.content_ratio = min(1.0, visible_rows / max(1, total_rows))
        scroll_offset = int(self.list_scrollbar.scroll * max(0, total_rows - visible_rows))

        # Render rows
        row_h = self.t.scaled(38, s)
        row_pad = self.t.scaled(6, s)

        for i in range(min(visible_rows, total_rows - scroll_offset)):
            item_idx = i + scroll_offset
            item_id, count = self._list_items[item_idx]
            meta = self.catalog.get(item_id, {})

            row_rect = pygame.Rect(
                list_rect.x + max(2, int(4 * s)),
                list_rect.y + max(2, int(4 * s)) + i * row_h,
                list_rect.width - max(4, int(8 * s)),
                row_h - max(1, int(2 * s)),
            )

            is_selected = item_id == self.selected_item_id
            is_hovered = item_idx == self.hovered_row_idx

            # Draw row background
            if is_selected or is_hovered:
                bg_color = (*self.t.colors.wood_mid, 180) if is_selected else (*self.t.colors.wood_light, 60)
                border_color = self.t.colors.border_gold if is_selected else (*self.t.colors.border_gold, 120)
                border_w = max(1, self.t.scaled(2 if is_selected else 1, s))

                row_bg = pygame.Surface(row_rect.size, pygame.SRCALPHA)
                pygame.draw.rect(row_bg, bg_color, row_bg.get_rect(), border_radius=max(1, int(3 * s)))
                pygame.draw.rect(row_bg, border_color, row_bg.get_rect(), width=border_w, border_radius=max(1, int(3 * s)))
                surface.blit(row_bg, row_rect.topleft)

            # Draw small icon
            icon_size = max(12, int(22 * s))
            icon = load_item_icon(item_id, icon_size)
            ix = row_rect.x + max(4, int(8 * s))
            iy = row_rect.centery - icon_size // 2

            if icon:
                surface.blit(icon, (ix, iy))
            else:
                pygame.draw.circle(surface, self.t.colors.border_gold, (ix + icon_size // 2, iy + icon_size // 2), icon_size // 2)

            # Name Label
            name_str = str(meta.get("name", item_id))
            name_surf = font_body.render(name_str, True, self.t.colors.text_primary)
            surface.blit(name_surf, (ix + icon_size + max(4, int(8 * s)), row_rect.centery - name_surf.get_height() // 2))

            # Prices & Inventory Quantities (Right aligned)
            value = int(meta.get("value", 5))
            price_str = f"+${value}" if self.current_tab == "SELL" else f"${value}"
            price_surf = font_body.render(price_str, True, (245, 210, 60) if self.current_tab == "SELL" else self.t.colors.text_danger)

            qty_str = f"({count} owned)" if self.current_tab == "SELL" else f"({self.player.inventory.get(item_id)} owned)"
            qty_surf = font_stat.render(qty_str, True, self.t.colors.text_disabled)

            px = row_rect.right - price_surf.get_width() - max(4, int(8 * s))
            surface.blit(price_surf, (px, row_rect.centery - price_surf.get_height() - 1))
            surface.blit(qty_surf, (row_rect.right - qty_surf.get_width() - max(4, int(8 * s)), row_rect.centery + 1))

        # 4. Draw Right Details Card Content
        if not self.selected_item_id:
            placeholder = font_body.render("Select item to trade", True, self.t.colors.text_disabled)
            surface.blit(placeholder, placeholder.get_rect(center=details_rect.center))
            return

        # Selected metadata
        selected_meta = self.catalog.get(self.selected_item_id, {})
        selected_name = str(selected_meta.get("name", self.selected_item_id))

        # Name
        name_surf = font_header.render(selected_name, True, self.t.colors.text_title)
        surface.blit(name_surf, name_surf.get_rect(midtop=(details_rect.centerx, details_rect.y + row_pad + max(2, int(4 * s)))))

        # Large 64x64 Preview Frame
        icon_box_size = self.t.scaled(52, s)
        ib_x = details_rect.centerx - icon_box_size // 2
        ib_y = details_rect.y + row_pad + font_header_size + max(4, int(10 * s))
        icon_box_rect = pygame.Rect(ib_x, ib_y, icon_box_size, icon_box_size)

        pygame.draw.rect(surface, self.t.colors.panel_inset, icon_box_rect, border_radius=max(1, int(3 * s)))
        pygame.draw.rect(surface, self.t.colors.border_gold, icon_box_rect, width=max(1, int(1.5 * s)), border_radius=max(1, int(3 * s)))

        large_icon = load_item_icon(self.selected_item_id, icon_box_size - max(2, int(6 * s)))
        if large_icon:
            surface.blit(large_icon, large_icon.get_rect(center=icon_box_rect.center).topleft)
        else:
            abbr_surf = font_header.render(self.selected_item_id[:2].upper(), True, self.t.colors.text_primary)
            surface.blit(abbr_surf, abbr_surf.get_rect(center=icon_box_rect.center).topleft)

        # Description
        desc_str = str(selected_meta.get("description", ""))
        desc_y = icon_box_rect.bottom + max(2, int(8 * s))

        # Wrapping description lines
        chars_per_line = 20
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

        # Render description lines
        dy = desc_y
        for line in lines[:3]:
            line_surf = font_body.render(line, True, self.t.colors.text_secondary)
            surface.blit(line_surf, line_surf.get_rect(centerx=details_rect.centerx, y=dy))
            dy += line_surf.get_height() + 2

        # Pricing calculations
        unit_val = int(selected_meta.get("value", 5))
        total_val = unit_val * self.transaction_qty

        # Transaction statistics
        stats = [
            ("Unit Price", f"${unit_val}"),
            ("Quantity", f"{self.transaction_qty}"),
            ("Total Value", f"${total_val}"),
        ]

        stats_top_y = dy + max(2, int(8 * s))
        line_spacing = max(2, self.t.scaled(13, s))

        for j, (label, val) in enumerate(stats):
            sy = stats_top_y + j * line_spacing

            # Label
            label_surf = font_stat.render(label, True, self.t.colors.text_disabled)
            surface.blit(label_surf, (details_rect.x + row_pad + max(2, int(4 * s)), sy))

            # Value
            val_surf = font_stat.render(
                val,
                True,
                (245, 210, 60) if label == "Total Value" or (label == "Unit Price" and self.current_tab == "SELL") else self.t.colors.text_primary
            )
            vx = details_rect.right - val_surf.get_width() - row_pad - max(2, int(4 * s))
            surface.blit(val_surf, (vx, sy))

        # Quantity indicator value text (placed above Confirm and Add/Sub buttons)
        confirm_h = 36.0
        qty_h = 28.0
        confirm_y = top_y + details_h - confirm_h - 20.0
        qty_y = confirm_y - qty_h - 14.0
        qty_ind_y = c.y + self.t.scaled(qty_y, s) - max(4, int(15 * s))
        qty_text = f"Trade Count: {self.transaction_qty}"
        qty_text_surf = font_body.render(qty_text, True, self.t.colors.text_title)
        surface.blit(qty_text_surf, qty_text_surf.get_rect(centerx=details_rect.centerx, y=qty_ind_y))
