"""
Graphical Farm UI featuring a seed selector sidebar and visual interactive plot cards.
"""

from __future__ import annotations

import math
from typing import Any, Callable, Optional

import pygame

from game.core.player import FarmPlot, Player
from game.systems.farming import FarmingSystem
from ui.inventory.inventory_slot import load_item_icon
from ui.styles import DEFAULT_STYLES
from ui.theme import Theme
from ui.widgets.button import Button
from ui.widgets.panel import Panel
from ui.widgets.scrollbar import Scrollbar


class FarmPlotCard(Panel):
    """
    Interactive plot card representing a single farm plot.
    Shows growth stage, progress bars, and countdown timers.
    """

    def __init__(
        self,
        plot_index: int,
        plot: FarmPlot,
        farming: FarmingSystem,
        catalog: dict[str, Any],
        *,
        theme: Theme | None = None,
        on_click_callback: Optional[Callable[[int], None]] = None,
    ) -> None:
        self.t = theme or DEFAULT_STYLES.theme
        
        # Inset style for plot bed
        style = DEFAULT_STYLES.panel
        
        super().__init__(
            width=120.0,
            height=120.0,
            style=style,
            theme=self.t,
            name=f"PlotCard[{plot_index}]",
        )
        self.plot_index = plot_index
        self.plot = plot
        self.farming = farming
        self.catalog = catalog
        self.on_click_callback = on_click_callback
        
        self.set_draw_header(False)
        self._hover = False
        self._pulse_t = 0.0

    def _handle_event(self, event: pygame.event.Event) -> bool:
        """Handle clicks and hovering."""
        if event.type == pygame.MOUSEMOTION:
            self._hover = self.contains_screen_point(event.pos)
            return False
            
        if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
            if self.contains_screen_point(event.pos):
                if self.on_click_callback:
                    self.on_click_callback(self.plot_index)
                return True
                
        return False

    def _update(self, dt: float) -> None:
        """Animate ready pulses."""
        self._pulse_t = (self._pulse_t + dt * 4) % (math.pi * 2)

    def _get_crop_color(self, crop_id: str) -> tuple[int, int, int]:
        cid = crop_id.lower()
        if "apple" in cid:
            return (220, 40, 30)      # Red apple
        elif "wheat" in cid:
            return (235, 195, 80)     # Golden wheat
        elif "banana" in cid:
            return (240, 220, 60)     # Yellow banana
        elif "cherry" in cid:
            return (200, 20, 40)      # Cherry red
        elif "grape" in cid:
            return (130, 50, 160)     # Purple grape
        elif "orange" in cid:
            return (240, 120, 20)     # Orange
        elif "strawberry" in cid:
            return (230, 50, 60)      # Strawberry red
        elif "watermelon" in cid:
            return (60, 150, 40)      # Green watermelon
        elif "avacado" in cid:
            return (110, 150, 60)     # Avocado green
        elif "peach" in cid:
            return (245, 160, 130)    # Peach orange-pink
        elif "blueberry" in cid or "blue_berry" in cid:
            return (40, 80, 180)      # Blueberry blue
        elif "carrot" in cid:
            return (240, 110, 20)     # Carrot orange
        elif "pumpkin" in cid:
            return (230, 100, 20)     # Pumpkin orange
        elif "mushroom" in cid:
            return (180, 140, 110)    # Mushroom grey-brown
        elif "corn" in cid:
            return (240, 210, 50)     # Corn yellow
        elif "cucumber" in cid:
            return (40, 140, 60)      # Cucumber green
        elif "brokeli" in cid or "broccoli" in cid:
            return (45, 110, 35)      # Broccoli dark green
        elif "cabbige" in cid or "cabbage" in cid:
            return (130, 190, 110)    # Cabbage light green
        elif "chilly" in cid or "chili" in cid:
            return (220, 30, 20)      # Chili red
        elif "reddies" in cid or "radish" in cid:
            return (220, 60, 100)     # Radish pink-red
        return (200, 180, 40)         # Default golden sprout

    def _draw(self, surface: pygame.Surface) -> None:
        """Draw crop graphics, progress bar, and glow animations."""
        # Draw background and base frame using super class
        super()._draw(surface)
        
        sr = self.screen_rect
        s = self._scale
        pad = self.t.scaled(6, s)
        
        # Calculate plot state
        status = self.farming.plot_status(self.plot)
        state = status["state"]  # "empty", "growing", "ready"
        crop_id = self.plot.crop_id
        
        font_small = pygame.font.SysFont("consolas", max(8, self.t.scaled(10, s)), bold=True)
        font_tiny = pygame.font.SysFont("consolas", max(7, self.t.scaled(9, s)))

        # Render Plot Number (centered top)
        plot_str = f"PLOT {self.plot_index + 1}"
        num_surf = font_tiny.render(plot_str, True, self.t.colors.text_disabled)
        surface.blit(num_surf, num_surf.get_rect(midtop=(sr.centerx, sr.y + pad)))

        icon_center_y = sr.centery - self.t.scaled(6, s)

        # Draw Soil Bed inside the card frame
        soil_w = sr.width - pad * 2
        soil_h = self.t.scaled(60.0, s)
        soil_x = sr.x + pad
        soil_y = sr.y + pad + self.t.scaled(12.0, s)
        soil_rect = pygame.Rect(soil_x, soil_y, soil_w, soil_h)

        # 1. Base Soil tilled color
        pygame.draw.rect(surface, (70, 42, 24), soil_rect, border_radius=max(1, int(3 * s)))

        # 2. Horizontal ridges/rows (furrows and highlights)
        row_h = soil_rect.height / 4
        for r in range(4):
            ry = soil_rect.y + r * row_h
            # Draw row furrow (dark shadow)
            pygame.draw.line(surface, (40, 24, 14), (soil_rect.x, ry + row_h - 1), (soil_rect.right, ry + row_h - 1), max(1, int(1 * s)))
            # Draw row ridge (light soil)
            pygame.draw.rect(
                surface,
                (85, 54, 34),
                (soil_rect.x, ry + 1, soil_rect.width, max(1, row_h - 2)),
                border_radius=max(1, int(2 * s))
            )

        # Draw soil border outline
        pygame.draw.rect(surface, self.t.colors.border_dark, soil_rect, width=max(1, int(1.5 * s)), border_radius=max(1, int(3 * s)))

        if state == "empty":
            # Specks of dirt / stones for empty look (deterministic based on index)
            import random
            rng = random.Random(self.plot_index)
            for _ in range(6):
                sx = rng.randint(int(soil_rect.x + 4), int(soil_rect.right - 4))
                sy = rng.randint(int(soil_rect.y + 2), int(soil_rect.bottom - 2))
                pygame.draw.circle(surface, (40, 24, 14), (sx, sy), max(1, int(1 * s)))
            
            label_surf = font_small.render("EMPTY", True, self.t.colors.text_secondary)
            surface.blit(label_surf, label_surf.get_rect(center=(sr.centerx, sr.bottom - pad - max(4, int(4 * s)))))

        else:
            crop = status["crop"]
            needed = float(crop["growth_seconds"])
            elapsed = max(0.0, needed - status["remaining"])
            ratio = min(1.0, elapsed / max(0.1, needed))

            # Draw sprouts or bushes on the ridges
            for r in range(4):
                ry = soil_rect.y + r * row_h + row_h / 2
                for c_idx in range(3):
                    cx = soil_rect.x + (c_idx + 0.5) * (soil_rect.width / 3)
                    
                    if ratio < 0.35:
                        # Early growth sprout
                        pygame.draw.line(surface, (80, 160, 45), (cx, ry + 2 * s), (cx, ry - 3 * s), max(1, int(1.5 * s)))
                        pygame.draw.circle(surface, (110, 210, 70), (int(cx - 1 * s), int(ry - 2 * s)), max(1, int(1.5 * s)))
                        pygame.draw.circle(surface, (110, 210, 70), (int(cx + 1 * s), int(ry - 2 * s)), max(1, int(1.5 * s)))
                    elif ratio < 0.70:
                        # Mid growth plant
                        pygame.draw.line(surface, (60, 140, 35), (cx, ry + 3 * s), (cx, ry - 5 * s), max(1, int(2 * s)))
                        pygame.draw.circle(surface, (85, 185, 55), (int(cx - 2.5 * s), int(ry - 4 * s)), max(2, int(2.5 * s)))
                        pygame.draw.circle(surface, (85, 185, 55), (int(cx + 2.5 * s), int(ry - 4 * s)), max(2, int(2.5 * s)))
                        pygame.draw.circle(surface, (100, 205, 70), (int(cx), int(ry - 6 * s)), max(2, int(3 * s)))
                    else:
                        # Late growth mature bush with product color tips
                        pygame.draw.circle(surface, (45, 115, 25), (int(cx), int(ry - 2 * s)), max(2, int(5 * s)))
                        pygame.draw.circle(surface, (55, 135, 30), (int(cx - 3 * s), int(ry - 4 * s)), max(2, int(4 * s)))
                        pygame.draw.circle(surface, (55, 135, 30), (int(cx + 3 * s), int(ry - 4 * s)), max(2, int(4 * s)))
                        
                        # Product color tip
                        prod_color = self._get_crop_color(crop_id)
                        pygame.draw.circle(surface, prod_color, (int(cx - 1.5 * s), int(ry - 3 * s)), max(1, int(2 * s)))
                        pygame.draw.circle(surface, prod_color, (int(cx + 1.5 * s), int(ry - 3 * s)), max(1, int(2 * s)))

            if state == "growing":
                # Growth Progress Bar
                bar_w = sr.width - pad * 2
                bar_h = max(2, self.t.scaled(5, s))
                bar_x = sr.x + pad
                bar_y = sr.bottom - pad - bar_h - max(12, int(12 * s))

                pygame.draw.rect(surface, self.t.colors.panel_inset, (bar_x, bar_y, bar_w, bar_h), border_radius=max(1, bar_h // 2))
                pygame.draw.rect(surface, self.t.colors.text_success, (bar_x, bar_y, int(bar_w * ratio), bar_h), border_radius=max(1, bar_h // 2))

                # Display countdown string
                timer_str = status["label"].split(" ")[-1]
                time_surf = font_small.render(timer_str, True, self.t.colors.text_primary)
                surface.blit(time_surf, time_surf.get_rect(midbottom=(sr.centerx, sr.bottom - pad)))

            elif state == "ready":
                # Golden Pulse Border Outline
                glow_val = int((math.sin(self._pulse_t) + 1.0) * 50 + 155)
                pulse_color = (glow_val, int(glow_val * 0.8), 50)
                
                border_w = max(1, self.t.scaled(3, s))
                pygame.draw.rect(
                    surface,
                    pulse_color,
                    sr,
                    width=border_w,
                    border_radius=max(2, self.t.scaled(self.style.corner_radius, s)),
                )

                # Mature product icon backing plate and overlay
                icon_size = max(16, self.t.scaled(32, s))
                icon = load_item_icon(crop_id, icon_size)
                if icon:
                    # Draw visual gold plate backing
                    pygame.draw.circle(surface, (48, 30, 18), (sr.centerx, icon_center_y), icon_size // 2 + max(2, int(3 * s)))
                    pygame.draw.circle(surface, (212, 168, 62), (sr.centerx, icon_center_y), icon_size // 2 + max(2, int(3 * s)), width=max(1, int(1.5 * s)))
                    icon_rect = icon.get_rect(center=(sr.centerx, icon_center_y))
                    surface.blit(icon, icon_rect.topleft)
                else:
                    abbr_surf = font_small.render(crop_id[:2].upper(), True, self.t.colors.text_primary)
                    surface.blit(abbr_surf, abbr_surf.get_rect(center=(sr.centerx, icon_center_y)))

                # READY/HARVEST label
                ready_surf = font_small.render("HARVEST", True, (245, 210, 60))
                surface.blit(ready_surf, ready_surf.get_rect(midbottom=(sr.centerx, sr.bottom - pad)))


class FarmPanel(Panel):
    """
    Main farm menu interface containing a seed selection list and plot grid layout.
    """

    def __init__(
        self,
        player: Player,
        farming: FarmingSystem,
        item_catalog: dict[str, Any],
        *,
        x: float = 0.0,
        y: float = 0.0,
        theme: Theme | None = None,
        on_action: Optional[Callable[[str], None]] = None,
        on_close: Optional[Callable[[], None]] = None,
    ) -> None:
        self.t = theme or DEFAULT_STYLES.theme
        width = 800.0
        height = 480.0

        super().__init__(
            x=x,
            y=y,
            width=width,
            height=height,
            title="Settlement Farm",
            theme=self.t,
            name="FarmPanel",
        )
        self.player = player
        self.farming = farming
        self.catalog = item_catalog
        self.on_action = on_action
        self.on_close_cb = on_close

        # Selected seed ID state
        self.selected_seed_id: Optional[str] = None
        self.owned_seeds: list[tuple[str, int]] = []
        
        # Build Back button
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
            name="farm_back",
        )
        self.add_child(self.back_btn)

        # Global farm buttons
        self.plant_all_btn = Button(
            text="Plant All Seeds",
            width=160.0,
            height=30.0,
            theme=self.t,
            callback=self._plant_all_seeds,
            name="farm_plant_all",
        )
        self.add_child(self.plant_all_btn)

        self.harvest_all_btn = Button(
            text="Harvest All Ready",
            width=160.0,
            height=30.0,
            theme=self.t,
            callback=self._harvest_all_ready,
            name="farm_harvest_all",
        )
        self.add_child(self.harvest_all_btn)

        # Build Interactive Plot Cards
        self.plot_cards: list[FarmPlotCard] = []
        for i, plot in enumerate(self.player.plots):
            card = FarmPlotCard(
                i,
                plot,
                self.farming,
                self.catalog,
                theme=self.t,
                on_click_callback=self._on_plot_clicked,
            )
            self.plot_cards.append(card)
            self.add_child(card)

        # Scrollbar for grid of plots
        self.grid_scrollbar = Scrollbar(
            theme=self.t,
            name="farm_grid_scrollbar",
        )
        self.add_child(self.grid_scrollbar)

        # Scrolling hover sidebar selectors
        self.seed_hover_idx: Optional[int] = None

        self._sync_seeds()
        self._layout_children()

    def _sync_seeds(self) -> None:
        """Find seeds inside player inventory."""
        self.owned_seeds = [
            (item_id, count)
            for item_id, count in self.player.inventory.items()
            if item_id.endswith("_seed") and count > 0
        ]
        
        # Verify selected seed is still owned
        if self.selected_seed_id:
            found = any(iid == self.selected_seed_id for iid, _ in self.owned_seeds)
            if not found:
                self.selected_seed_id = None
                
        # Default select first seed
        if not self.selected_seed_id and self.owned_seeds:
            self.selected_seed_id = self.owned_seeds[0][0]

    def _close_clicked(self) -> None:
        if self.on_close_cb:
            self.on_close_cb()

    def _on_plot_clicked(self, index: int) -> None:
        """Operate plot interactively on click."""
        plot = self.player.plots[index]
        status = self.farming.plot_status(plot)
        state = status["state"]

        if state == "ready":
            # Harvest plot
            msg = self.farming.harvest(self.player, index)
            self._on_action_fired(msg)
        elif state == "empty":
            # Plant currently selected seed
            if not self.selected_seed_id:
                self._on_action_fired("Select a seed from the left list first!")
                return
            
            # Map seed item id to crop id (e.g. orange_seed -> orange)
            crop_id = self.selected_seed_id.replace("_seed", "")
            msg = self.farming.plant(self.player, index, crop_id)
            self._on_action_fired(msg)
        else:
            self._on_action_fired(f"Plot is growing: {status['label']}")

    def _plant_all_seeds(self) -> None:
        """Plant the selected seed type in all empty plots."""
        if not self.selected_seed_id:
            self._on_action_fired("Select a seed first!")
            return

        crop_id = self.selected_seed_id.replace("_seed", "")
        planted_count = 0
        
        for plot in self.player.plots:
            status = self.farming.plot_status(plot)
            if status["state"] == "empty":
                res = self.farming.plant(self.player, plot.index, crop_id)
                if res.startswith("Planted"):
                    planted_count += 1
                else:
                    self._on_action_fired(res)
                    break
        
        if planted_count > 0:
            self._on_action_fired(f"Planted {planted_count}x {crop_id} crops.")
        else:
            self._on_action_fired("No plots were planted.")

    def _harvest_all_ready(self) -> None:
        """Harvest all crops currently in 'ready' status."""
        harvest_count = 0
        for plot in self.player.plots:
            status = self.farming.plot_status(plot)
            if status["state"] == "ready":
                res = self.farming.harvest(self.player, plot.index)
                if res.startswith("Harvested"):
                    harvest_count += 1
        
        if harvest_count > 0:
            self._on_action_fired(f"Harvested {harvest_count} ready plots.")
        else:
            self._on_action_fired("No crops were ready for harvest.")

    def _on_action_fired(self, msg: str) -> None:
        """Propagate action messages, save state, and rebuild."""
        self._sync_seeds()
        if self.on_action:
            self.on_action(msg)
        self._layout_children()

    def set_position(self, x: float, y: float) -> None:
        """Reposition widgets when moved."""
        super().set_position(x, y)
        self._layout_children()

    def set_size(self, width: float, height: float) -> None:
        """Resize container."""
        super().set_size(width, height)
        self._layout_children()

    def _layout_children(self) -> None:
        """Layout Left sidebar selector, 3x3 plot grid cards, and bottom toolbar buttons."""
        c = self.content_rect
        gap = self.theme.spacing.grid_gap

        # Sidebar Left (Seeds list width 180)
        sidebar_w = 180.0
        
        # Grid Center (remaining width, leave room for scrollbar)
        scrollbar_w = 16.0
        grid_x = c.x + sidebar_w + gap * 2
        grid_w = c.width - sidebar_w - gap * 4 - scrollbar_w
        grid_h = c.height - 50.0  # leave room for buttons at bottom

        # Position Scrollbar
        self.grid_scrollbar.set_position(c.right - scrollbar_w, c.y)
        self.grid_scrollbar.set_size(scrollbar_w, grid_h)

        # Position Plot Cards (3x3 grid)
        columns = 3
        card_w = 120.0
        card_h = 120.0
        
        col_gap = (grid_w - (columns * card_w)) / 2.0
        row_gap = 12.0  # fixed spacing between rows

        # Calculate total height of grid content
        num_rows = math.ceil(len(self.plot_cards) / columns)
        total_h = num_rows * card_h + max(0, num_rows - 1) * row_gap
        max_scroll_y = max(0.0, total_h - grid_h)

        # Update scrollbar ratio
        self.grid_scrollbar.content_ratio = min(1.0, grid_h / max(1.0, total_h))
        scroll_y = self.grid_scrollbar.scroll

        # Only show scrollbar if content is scrollable
        self.grid_scrollbar.visible = max_scroll_y > 0.0

        for i, card in enumerate(self.plot_cards):
            row, col = divmod(i, columns)
            cx = grid_x + col * (card_w + col_gap)
            cy = c.y + row * (card_h + row_gap) - scroll_y * max_scroll_y
            card.set_position(cx, cy)
            
            # Clip visibility to grid area
            card.visible = (cy >= c.y - 10.0) and (cy + card_h <= c.y + grid_h + 10.0)

        # Bottom Buttons Layout
        self.back_btn.set_position(c.x, c.bottom - 30)
        self.plant_all_btn.set_position(c.right - 330, c.bottom - 30)
        self.harvest_all_btn.set_position(c.right - 160, c.bottom - 30)

    def _handle_event(self, event: pygame.event.Event) -> bool:
        """Hover and selection checks for seed list in left sidebar."""
        c = self.content_rect
        s = self._scale

        if event.type == pygame.MOUSEMOTION:
            # Check if mouse is hovering sidebar bounds
            sidebar_rect = pygame.Rect(c.x * s, c.y * s, 180 * s, (c.height - 50) * s)
            if sidebar_rect.collidepoint(event.pos):
                lx, ly = (event.pos[0] - sidebar_rect.x) / s, (event.pos[1] - sidebar_rect.y) / s
                row_h = max(2, int(32 * s)) / s
                idx = int(ly // row_h)
                if 0 <= idx < len(self.owned_seeds):
                    self.seed_hover_idx = idx
                else:
                    self.seed_hover_idx = None
            else:
                self.seed_hover_idx = None

        if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
            sidebar_rect = pygame.Rect(c.x * s, c.y * s, 180 * s, (c.height - 50) * s)
            if sidebar_rect.collidepoint(event.pos):
                ly = (event.pos[1] - sidebar_rect.y) / s
                row_h = 32.0
                idx = int(ly // row_h)
                if 0 <= idx < len(self.owned_seeds):
                    self.selected_seed_id = self.owned_seeds[idx][0]
                    # Visual confirmation sound
                    if hasattr(self.parent, "audio") and self.parent.audio:
                        self.parent.audio.play("ui_click")
                    self._layout_children()
                    return True

        # Intercept mouse wheel scrolling over grid bounds
        sidebar_w = 180.0
        scrollbar_w = 16.0
        gap = self.theme.spacing.grid_gap
        grid_w = c.width - sidebar_w - gap * 4 - scrollbar_w
        grid_h = c.height - 50.0
        grid_screen_rect = pygame.Rect(
            c.x * s + self.t.scaled(sidebar_w + gap * 2, s),
            c.y * s,
            self.t.scaled(grid_w, s),
            self.t.scaled(grid_h, s)
        )
        if event.type == pygame.MOUSEWHEEL and grid_screen_rect.collidepoint(pygame.mouse.get_pos()):
            self.grid_scrollbar.scroll = max(
                0.0,
                min(1.0, self.grid_scrollbar.scroll - event.y * 0.1),
            )
            self._layout_children()
            return True

        return False

    def _update(self, dt: float) -> None:
        """Monitor updates for plots sync."""
        # Synchronize seed inventory counts
        self._sync_seeds()

    def _draw(self, surface: pygame.Surface) -> None:
        """Draw sidebar outlines, owned seeds lists, quantities, and highlights."""
        super()._draw(surface)
        
        c = self.screen_rect
        s = self._scale

        # Left Sidebar divider frame
        sidebar_w = self.t.scaled(180, s)
        sidebar_h = c.height - self.t.scaled(50, s)
        sidebar_rect = pygame.Rect(c.x, c.y, sidebar_w, sidebar_h)
        
        pygame.draw.rect(surface, self.t.colors.panel_inset, sidebar_rect, border_radius=max(2, int(4 * s)))
        pygame.draw.rect(surface, self.t.colors.border_dark, sidebar_rect, width=max(1, int(2 * s)), border_radius=max(2, int(4 * s)))

        font_header = pygame.font.SysFont("consolas", max(9, self.t.scaled(11, s)), bold=True)
        font_body = pygame.font.SysFont("consolas", max(8, self.t.scaled(10, s)))

        # Sidebar Title
        title_surf = font_header.render("OWNED SEEDS", True, self.t.colors.text_title)
        surface.blit(title_surf, (c.x + max(4, int(8 * s)), c.y + max(4, int(6 * s))))

        # Draw Seeds list
        list_y = c.y + max(8, int(22 * s))
        row_h = self.t.scaled(32, s)

        if not self.owned_seeds:
            no_seeds = font_body.render("No seeds owned.", True, self.t.colors.text_disabled)
            surface.blit(no_seeds, (c.x + max(4, int(10 * s)), list_y + max(4, int(8 * s))))
            return

        for idx, (seed_id, qty) in enumerate(self.owned_seeds):
            row_rect = pygame.Rect(c.x + max(2, int(4 * s)), list_y + idx * row_h, sidebar_w - max(4, int(8 * s)), row_h)
            
            # Hover highlight
            is_hovered = idx == self.seed_hover_idx
            is_selected = seed_id == self.selected_seed_id
            
            if is_selected or is_hovered:
                glow_surf = pygame.Surface(row_rect.size, pygame.SRCALPHA)
                if is_selected:
                    pygame.draw.rect(glow_surf, (*self.t.colors.wood_mid, 180), glow_surf.get_rect(), border_radius=max(1, int(3 * s)))
                    pygame.draw.rect(glow_surf, self.t.colors.border_gold, glow_surf.get_rect(), width=max(1, int(2 * s)), border_radius=max(1, int(3 * s)))
                else:
                    pygame.draw.rect(glow_surf, (*self.t.colors.wood_light, 80), glow_surf.get_rect(), border_radius=max(1, int(3 * s)))
                surface.blit(glow_surf, row_rect.topleft)

            # Draw Seed Icon
            icon_size = max(12, int(18 * s))
            icon = load_item_icon(seed_id, icon_size)
            ix = row_rect.x + max(2, int(6 * s))
            iy = row_rect.centery - icon_size // 2
            
            if icon:
                surface.blit(icon, (ix, iy))
            else:
                pygame.draw.circle(surface, self.t.colors.border_gold, (ix + icon_size // 2, iy + icon_size // 2), icon_size // 2)

            # Draw Seed Name & Count
            meta = self.catalog.get(seed_id, {})
            name_str = meta.get("name", seed_id).replace(" Seed", "")[:12]
            name_surf = font_body.render(name_str, True, self.t.colors.text_primary)
            surface.blit(name_surf, (ix + icon_size + max(4, int(6 * s)), row_rect.centery - name_surf.get_height() // 2))

            count_str = f"x{qty}"
            count_surf = font_body.render(count_str, True, self.t.colors.text_title)
            surface.blit(count_surf, (row_rect.right - count_surf.get_width() - max(4, int(6 * s)), row_rect.centery - count_surf.get_height() // 2))
