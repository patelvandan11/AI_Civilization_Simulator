"""
AI Civilization — City Builder Edition.
Upgrades the original settlement game into a full sandbox city builder:
  • 50×50 empty grass map
  • Land ownership (10×10 start, expandable)
  • Resource gathering + building crafting queue
  • Terrain painting (road, river, mountain, sand, forest, concrete, sidewalk)
  • Road auto-tiling
  • Scrollable build toolbar with ghost preview + placement rules
  • Camera pan + zoom
  • Clickable minimap
  • Full save persistence
"""

from __future__ import annotations

import sys
import os
import importlib
import threading
from pathlib import Path
from typing import Callable

_ROOT = Path(__file__).resolve().parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pygame

from game.audio_bus import AudioBus
from game.auth.online_client import HybridAuth
from game.core.player import Player, PlacedBuilding, BuildJob
from game.core.save_manager import SaveManager
from game.systems.building import BuildingSystem
from game.systems.crafting import CraftingSystem
from game.systems.farming import FarmingSystem
from game.world.map import (
    WorldMap, WorldRenderer,
    TILE_WATER, TILE_ROAD, TILE_SIDEWALK, TILE_GRASS,
    TILE_FOREST, TILE_EMPTY, TILE_RIVER, TILE_MOUNTAIN,
    TILE_SAND, TILE_CONCRETE, TILE_COLORS,
)
from ui.ai.debug_window import AIDebugWindow
from ui.farming.farm_panel import FarmPanel
from ui.market.market_panel import MarketPanel
from ui.hud.clock import ClockHUD
from ui.inventory.dragdrop import DragDropController
from ui.inventory.hotbar import Hotbar
from ui.inventory.inventory import InventoryPanel
from ui.styles import UIStyles
from ui.theme import Theme
from ui.ui_manager import UIManager
from ui.widgets.button import Button
from ui.widgets.grid import Align, Grid
from ui.widgets.panel import Panel
from ui.widgets.textbox import TextBox
from ui.widgets.scrollbar import Scrollbar


# ---------------------------------------------------------------------------
# Screen IDs
# ---------------------------------------------------------------------------
SCR_LOGIN    = "login"
SCR_HUB      = "hub"
SCR_FARM     = "farm"
SCR_BUILD    = "build"
SCR_CRAFT    = "craft"
SCR_INV      = "inventory"
SCR_MAP      = "map"
SCR_SETTINGS = "settings"
SCR_MARKET   = "market"

# ---------------------------------------------------------------------------
# Usable items
# ---------------------------------------------------------------------------
USABLE_ITEMS = {
    "apple": "You eat an apple. Feeling fresher.",
    "banana": "You peel and eat a banana. Tasty!",
    "cherry": "You pop a sweet cherry. Juicy!",
    "grapes": "You eat grapes. Plump and sweet.",
    "orange": "You eat a fresh orange slice. Juicy!",
    "strawberry": "You eat a sweet strawberry.",
    "watermelon": "You slice and eat watermelon. Refreshing!",
    "avacado": "You eat rich avocado.",
    "peach": "You eat a soft sweet peach.",
    "blue_berry": "You eat sweet blueberries.",
    "carrot": "You crunch on a fresh carrot.",
    "pumpkin": "You eat pumpkin pie.",
    "mushroom": "You eat cooked mushrooms.",
    "corn": "You eat hot buttered corn.",
    "cucumber": "You eat cool cucumber slices.",
    "brokeli": "You eat steamed broccoli.",
    "cabbige": "You eat fresh cabbage leaves.",
    "chilly": "You eat a chili. Whew, hot!",
    "reddies": "You eat peppery radishes.",
    "bread": "You eat bread. Hunger eased.",
    "orange_juice": "You drink cool orange juice.",
    "strawberry_cake": "You eat sweet strawberry cake!",
    "cherry_cake": "You eat cherry cake!",
    "cake": "You eat delicious classic cake!",
    "wine": "You drink aged wine. Feeling fancy.",
    "pizza": "You eat pizza. Cheesy goodness!",
    "burger": "You eat a mushroom veggie burger.",
    "cherry_jam": "You eat sweet cherry jam.",
    "chess": "You eat rich block cheese.",
    "torch": "You light a torch. The dark feels safer.",
}

# ---------------------------------------------------------------------------
# Terrain paint palette  (display_name, tile_id, gather_cost_label)
# ---------------------------------------------------------------------------
TERRAIN_PALETTE: list[tuple[str, int]] = [
    ("Grass",     TILE_GRASS),
    ("Road",      TILE_ROAD),
    ("Sidewalk",  TILE_SIDEWALK),
    ("River",     TILE_RIVER),
    ("Mountain",  TILE_MOUNTAIN),
    ("Sand",      TILE_SAND),
    ("Forest",    TILE_FOREST),
    ("Concrete",  TILE_CONCRETE),
    ("Empty",     TILE_EMPTY),
]

# Land expansion cost in gold per 5×5 chunk
LAND_CHUNK_COST = 50

# ---------------------------------------------------------------------------
# Placement rule checker
# ---------------------------------------------------------------------------
_ADJACENTS = [(0, -1), (1, 0), (0, 1), (-1, 0)]


def _check_placement(
    building_id: str,
    tx: int,
    ty: int,
    world: WorldMap,
    player: Player,
    rule: str,
) -> tuple[bool, str]:
    """
    Validate building placement at (tx, ty).

    Returns (valid, reason_string).
    """
    tile = world.get(tx, ty)

    # 1. Owned land
    if not player.owns(tx, ty):
        return False, "Not Owned Land"

    # 2. Collision
    for b in player.buildings:
        if b.x == tx and b.y == ty:
            return False, "Occupied"

    # 3. Inventory
    if not any(
        b.building_id == building_id and b.x is None and b.ready_at_game_seconds is None
        for b in player.buildings
    ):
        return False, "Craft First!"

    # 4. Terrain rules
    if rule == "river_only":
        if tile not in (TILE_RIVER, TILE_WATER):
            return False, "River Only"

    elif rule == "road_only":
        if tile != TILE_ROAD:
            return False, "Road Only"

    elif rule == "road_adjacent":
        if tile in (TILE_MOUNTAIN, TILE_RIVER, TILE_WATER):
            return False, "Invalid Terrain"
        has_road = any(
            world.get(tx + dx, ty + dy) == TILE_ROAD
            for dx, dy in _ADJACENTS
        )
        if not has_road:
            return False, "Need Road"

    elif rule == "road_or_sidewalk":
        ok = any(
            world.get(tx + dx, ty + dy) in (TILE_ROAD, TILE_SIDEWALK)
            for dx, dy in _ADJACENTS
        )
        if not ok:
            return False, "Need Road/Sidewalk"

    elif rule == "no_water":
        if tile in (TILE_RIVER, TILE_WATER):
            return False, "No Water"

    elif rule == "any_owned":
        if tile in (TILE_MOUNTAIN,):
            return False, "Mountain Blocked"

    return True, "OK"


# ---------------------------------------------------------------------------
# GameApp
# ---------------------------------------------------------------------------
class GameApp:
    """Full game application — city builder edition."""

    def __init__(self) -> None:
        pygame.init()
        pygame.display.set_caption("AI Civilization — City Builder")

        self.theme  = Theme.default()
        self.styles = UIStyles.from_theme(self.theme)
        self.root   = _ROOT
        self.saves  = SaveManager(self.root)
        self.auth   = HybridAuth(self.root)
        self.audio  = AudioBus(self.root)

        self.items     = self.saves.load_json_data("items")
        self.crops     = self.saves.load_json_data("crops")
        self.recipes   = self.saves.load_json_data("recipes")
        self.buildings = self.saves.load_json_data("buildings")

        self.farming  = FarmingSystem(self.crops)
        self.building = BuildingSystem(self.buildings)
        self.crafting = CraftingSystem(self.recipes)

        self.world          = WorldMap(width=50, height=50, seed=42)
        self.world_renderer = WorldRenderer(self.world, tile_size=20)

        self.screen  = pygame.display.set_mode(
            (self.theme.design_width, self.theme.design_height),
            pygame.RESIZABLE,
        )
        self.clock   = pygame.time.Clock()
        self.running = True
        self.player: Player | None = None
        self.current = SCR_LOGIN
        self.status  = "Online auth if server running, else local."
        self.status_t = 5.0
        self.scale   = 1.0

        # ---------- Build / terrain mode state ----------
        self.build_mode_active   = False
        self.selected_build_id: str | None = None

        # Terrain paint mode
        self.terrain_mode_active = False
        self.selected_terrain    = TILE_ROAD
        self.terrain_dragging    = False

        # Toolbar scroll
        self.toolbar_scroll = 0   # leftmost visible index
        self.TOOLBAR_VISIBLE = 8  # max items shown at once

        # Camera drag (middle mouse / right drag)
        self._cam_drag_active = False
        self._cam_drag_start: tuple[int, int] = (0, 0)
        self._cam_start: tuple[float, float]  = (0.0, 0.0)

        # Map keys
        self._map_keys = {"up": False, "down": False, "left": False, "right": False}

        # Minimap rect (set in draw)
        self._minimap_rect: pygame.Rect | None = None
        self._map_dest_rect: pygame.Rect | None = None

        # Legacy panel refs
        self.build_palette    = None
        self.build_toggle_btn = None
        self.center_btn       = None
        self.build_btns:       dict = {}
        self.dragging_build_id: str | None = None
        self.build_scrollbar  = None
        self.build_close_btn  = None
        self.build_screen_btns: dict = {}
        self.hub_btn          = None

        self.font    = pygame.font.SysFont("consolas", 16)
        self.font_sm = pygame.font.SysFont("consolas", 13)
        self.font_lg = pygame.font.SysFont("consolas", 18, bold=True)

        self.ui   = UIManager(self.theme)
        self.drag = self.ui.drag

        self.user_box = TextBox(width=280, height=36, placeholder="User ID",   max_length=16, theme=self.theme)
        self.pass_box = TextBox(width=280, height=36, placeholder="Password",  max_length=64, password=True, theme=self.theme)

        self.panels: dict[str, Panel] = {}
        self.clock_hud: ClockHUD | None     = None
        self.hotbar: Hotbar | None          = None
        self.inv_panel: InventoryPanel | None = None
        self.ai_debug: AIDebugWindow | None = None
        self.show_ai = False
        self._farm_plot_buttons: list[Button] = []

        self._auth_in_progress = False
        self._hotreload_timer  = 0.0
        self._module_times: dict = {}
        self._watched_modules = {
            "ui.inventory.inventory_panel": "ui/inventory/inventory_panel.py",
            "ui.farming.farm_panel":        "ui/farming/farm_panel.py",
            "ui.market.market_panel":       "ui/market/market_panel.py",
        }
        for mod_name, file_path in self._watched_modules.items():
            full_path = os.path.join(self.root, file_path)
            if os.path.exists(full_path):
                self._module_times[mod_name] = os.path.getmtime(full_path)

        mode = "online" if self.auth.server_available() else "local"
        self.status = f"Auth mode: {mode}. Click User ID field, then type."
        self._rebuild_login()
        self.user_box.set_focused(True)

    # -----------------------------------------------------------------------
    # Utilities
    # -----------------------------------------------------------------------
    def flash(self, message: str, seconds: float = 3.5) -> None:
        self.status   = message
        self.status_t = seconds
        print(message)

    def save(self) -> None:
        if self.player is not None:
            # Persist camera position
            self.player.camera_x = self.world_renderer.camera_x
            self.player.camera_y = self.world_renderer.camera_y
            # Persist terrain
            self.player.terrain_data = self.world.to_flat()
            self.saves.save_player(self.player)

    def logout(self) -> None:
        self.save()
        self.audio.play("ui_close")
        self.player    = None
        self.clock_hud = None
        self.hotbar    = None
        self.inv_panel = None
        if self.ai_debug:
            self.ui.remove(self.ai_debug)
            self.ai_debug = None
        self.show_ai = False
        self.current = SCR_LOGIN
        self.pass_box.clear()
        self._rebuild_login()
        self.flash("Logged out.")
        self._layout()

    def enter_game(self, user_id: str) -> None:
        self.player = self.saves.load_player(user_id)
        self.building.apply_farm_expansions(self.player)

        # Restore or create world
        if self.player.terrain_data and len(self.player.terrain_data) == 50 * 50:
            self.world = WorldMap.from_flat(self.player.terrain_data, 50, 50, seed=hash(user_id) % 100000)
        else:
            self.world = WorldMap(width=50, height=50, seed=hash(user_id) % 100000)

        self.world_renderer = WorldRenderer(self.world, tile_size=20)

        # Restore camera
        if self.player.camera_x or self.player.camera_y:
            self.world_renderer.camera_x = self.player.camera_x
            self.world_renderer.camera_y = self.player.camera_y
        else:
            # Default: centre on owned land
            ts = self.world_renderer.tile_size
            self.world_renderer.camera_x = 20 * ts - 200
            self.world_renderer.camera_y = 20 * ts - 150

        self.current = SCR_HUB
        self._rebuild_game_screens()
        auth_tag = "online" if (self.auth.session and self.auth.session.online) else "local"
        self.audio.play("ui_open")
        self.flash(f"Signed in as {user_id} ({auth_tag})")
        self._layout()

    def _fill(self, panel: Panel, grid: Grid) -> None:
        c = panel.content_rect
        grid.set_position(c.x, c.y)
        grid.set_size(c.width, c.height)
        panel.clear_children()
        panel.add_child(grid)

    def _btn(
        self,
        text: str,
        callback: Callable[[], None],
        *,
        danger: bool = False,
        muted: bool = False,
        active: bool = False,
        icon: pygame.Surface | None = None,
    ) -> Button:
        def wrapped() -> None:
            self.audio.play("ui_click")
            callback()

        style = self.styles.button
        if danger:
            style = self.styles.with_button(
                normal=(160, 60, 50), hover=(190, 80, 65),
                pressed=(120, 40, 35), border_color=(80, 25, 20),
            ).button
        elif active:
            style = self.styles.with_button(
                normal=(40, 130, 70), hover=(50, 160, 85),
                pressed=(30, 100, 55), border_color=(20, 80, 40),
            ).button
        elif muted:
            style = self.styles.with_button(
                normal=(100, 90, 80), hover=(120, 110, 95),
                pressed=(80, 75, 65), border_color=(50, 45, 40),
            ).button
        return Button(text=text, callback=wrapped, style=style, theme=self.theme, icon=icon)

    def _refresh(self, screen_id: str) -> None:
        if pygame.mouse.get_pressed(num_buttons=3)[0]:
            return
        if self.player:
            if screen_id == SCR_INV and self.inv_panel:
                self.inv_panel.rebuild_slots()
                return
            elif screen_id == SCR_FARM and isinstance(self.panels.get(SCR_FARM), FarmPanel):
                self.panels[SCR_FARM]._sync_seeds()
                return
            elif screen_id == SCR_MARKET and isinstance(self.panels.get(SCR_MARKET), MarketPanel):
                self.panels[SCR_MARKET]._refresh_tab_data()
                return

        builders = {
            SCR_HUB:      self._build_hub,
            SCR_FARM:     self._build_farm,
            SCR_BUILD:    self._build_build,
            SCR_CRAFT:    self._build_craft,
            SCR_INV:      self._build_inventory_screen,
            SCR_MAP:      self._build_map,
            SCR_SETTINGS: self._build_settings,
            SCR_MARKET:   self._build_market,
        }
        builder = builders.get(screen_id)
        if builder and self.player:
            self.panels[screen_id] = builder()
            if self.current == screen_id:
                self._layout()

    def _after_action(self, message: str, *screens: str) -> None:
        self.flash(message)
        self.save()
        self._sync_hotbar()
        for sid in screens:
            self._refresh(sid)

    # -----------------------------------------------------------------------
    # Actions
    # -----------------------------------------------------------------------
    def action_gather(self, resource: str, amount: int = 5) -> None:
        assert self.player
        self.player.inventory.add(resource, amount)
        self.audio.play("harvest", ui=False)
        name = self.items.get(resource, {}).get("name", resource)
        self._after_action(f"Gathered {amount}× {name}.", SCR_INV, SCR_HUB)

    def action_sell(self, item_id: str, count: int = 1) -> None:
        assert self.player
        meta = self.items.get(item_id, {})
        if not self.player.inventory.remove(item_id, count):
            self.flash(f"No {meta.get('name', item_id)} to sell.")
            return
        value = int(meta.get("value", 1)) * count
        self.player.money += value
        self._after_action(f"Sold {count}× {meta.get('name', item_id)} for ${value}.", SCR_INV)

    def action_use(self, item_id: str) -> None:
        assert self.player
        if item_id not in USABLE_ITEMS:
            self.flash("Cannot use that item.")
            return
        if not self.player.inventory.remove(item_id, 1):
            self.flash("None left.")
            return
        self._after_action(USABLE_ITEMS[item_id], SCR_INV)

    def action_plot(self, i: int) -> None:
        assert self.player
        crop = "apple"
        if not self.player.inventory.has("apple_seed") and self.player.inventory.has("wheat_seed"):
            crop = "wheat"
        msg = self.farming.interact(self.player, i, preferred_crop=crop)
        self.audio.play("harvest", ui=False)
        self._after_action(msg, SCR_FARM, SCR_INV)
        self._sync_farm_labels()

    def action_plant_all(self, crop_id: str) -> None:
        assert self.player
        n = 0
        for plot in self.player.plots:
            if self.farming.plot_status(plot)["state"] == "empty":
                if self.farming.plant(self.player, plot.index, crop_id).startswith("Planted"):
                    n += 1
        self._after_action(f"Planted {n}× {crop_id}.", SCR_FARM, SCR_INV)
        self._sync_farm_labels()

    def action_harvest_all(self) -> None:
        assert self.player
        n = sum(
            1 for p in self.player.plots
            if self.farming.plot_status(p)["state"] == "ready"
            and self.farming.harvest(self.player, p.index).startswith("Harvested")
        )
        self.audio.play("harvest", ui=False)
        self._after_action(f"Harvested {n} plot(s).", SCR_FARM, SCR_INV)
        self._sync_farm_labels()

    def action_build(self, building_id: str) -> None:
        assert self.player
        msg = self.building.start_build(self.player, building_id)
        self.audio.play("build", ui=False)
        self._after_action(msg, SCR_BUILD, SCR_INV)

    def action_craft(self, recipe_id: str) -> None:
        assert self.player
        msg = self.crafting.start_craft(self.player, recipe_id)
        self.audio.play("craft", ui=False)
        self._after_action(msg, SCR_CRAFT, SCR_INV)

    def action_buy_seeds(self, seed_id: str, cost: int, amount: int = 3) -> None:
        assert self.player
        if self.player.money < cost:
            self.flash(f"Need ${cost}.")
            return
        self.player.money -= cost
        self.player.inventory.add(seed_id, amount)
        self._after_action(f"Bought {amount}× {seed_id}.", SCR_INV, SCR_FARM)

    def action_buy_land(self, tx: int, ty: int) -> None:
        """Purchase a 5×5 land chunk centred on (tx, ty)."""
        assert self.player
        if self.player.money < LAND_CHUNK_COST:
            self.flash(f"Need ${LAND_CHUNK_COST} to buy land.")
            return
        # Must be adjacent to owned land
        owned = self.player.owned_set()
        half = 5 // 2
        chunk_tiles = {
            (x, y)
            for y in range(ty - half, ty - half + 5)
            for x in range(tx - half, tx - half + 5)
        }
        adjacent = any(
            (cx + dx, cy + dy) in owned
            for cx, cy in chunk_tiles
            for dx, dy in _ADJACENTS
        )
        if not adjacent and owned:
            self.flash("Land must be adjacent to owned tiles.")
            return
        new = self.player.buy_land_chunk(tx, ty, chunk_size=5)
        if not new:
            self.flash("Land already owned!")
            return
        self.player.money -= LAND_CHUNK_COST
        self.save()
        self.flash(f"Purchased {len(new)} new tiles for ${LAND_CHUNK_COST}!")

    def toggle_ai_debug(self) -> None:
        if self.ai_debug and self.show_ai:
            self.ai_debug.request_close()
            self.show_ai = False
            self.flash("AI Debug closed.")
            return
        self.ai_debug = AIDebugWindow(
            theme=self.theme,
            on_close=lambda: setattr(self, "show_ai", False),
        )
        self.ai_debug.set_scale(self.scale)
        self.ui.add(self.ai_debug)
        self.show_ai = True
        self.audio.play("ui_open")
        self.flash("AI Debug opened.")

    # -----------------------------------------------------------------------
    # Sync helpers
    # -----------------------------------------------------------------------
    def _sync_farm_labels(self) -> None:
        if not self.player:
            return
        for btn, plot in zip(self._farm_plot_buttons, self.player.plots):
            st = self.farming.plot_status(plot)
            btn.text = f"P{plot.index + 1}: {st['label']}"[:28]

    def _sync_hotbar(self) -> None:
        if not self.player or not self.hotbar:
            return
        stacks = list(self.player.inventory.items())
        for i in range(Hotbar.SLOT_COUNT):
            if i < len(stacks):
                iid, cnt = stacks[i]
                self.hotbar.set_slot(i, iid, cnt, self.items.get(iid, {}))
            else:
                self.hotbar.set_slot(i, None, 0)

    def _on_inv_changed(self) -> None:
        self.save()
        self._sync_hotbar()

    def _on_hover_item(self, data: dict | None, pos: tuple[int, int]) -> None:
        self.ui.show_tooltip(data, pos)

    # -----------------------------------------------------------------------
    # Screen builders
    # -----------------------------------------------------------------------
    def _rebuild_login(self) -> None:
        panel = Panel(width=460, height=380, title="AI Civilization — Sign In",
                      style=self.styles.panel, theme=self.theme)
        grid  = Grid(columns=1, style=self.styles.grid, theme=self.theme,
                     h_align=Align.CENTER, v_align=Align.CENTER)
        self.user_box.set_size(280, 36)
        self.pass_box.set_size(280, 36)
        grid.add(self.user_box, h_align=Align.CENTER)
        grid.add(self.pass_box, h_align=Align.CENTER)

        def do_login() -> None:
            if self._auth_in_progress:
                return
            self._auth_in_progress = True
            user_id  = self.user_box.text
            password = self.pass_box.text
            self.user_box.enabled = False
            self.pass_box.enabled = False
            self.flash("Connecting…")
            def run_auth():
                result = self.auth.login(user_id, password)
                pygame.event.post(pygame.event.Event(pygame.USEREVENT + 1, result=result))
            threading.Thread(target=run_auth, daemon=True).start()

        def do_register() -> None:
            if self._auth_in_progress:
                return
            self._auth_in_progress = True
            user_id  = self.user_box.text
            password = self.pass_box.text
            self.user_box.enabled = False
            self.pass_box.enabled = False
            self.flash("Registering…")
            def run_auth():
                result = self.auth.register(user_id, password)
                pygame.event.post(pygame.event.Event(pygame.USEREVENT + 1, result=result))
            threading.Thread(target=run_auth, daemon=True).start()

        self._login_submit = do_login
        row = Grid(columns=2, style=self.styles.grid, theme=self.theme)
        row.add(self._btn("Sign In",  do_login))
        row.add(self._btn("Register", do_register))
        grid.add(row, h_align=Align.STRETCH)
        online = self.auth.server_available()
        grid.add(
            self._btn(
                f"Auth: {'ONLINE' if online else 'LOCAL'}",
                lambda: self.flash("Online" if self.auth.server_available() else "Run: py -3 -m server.auth_server"),
                muted=True,
            ),
            h_align=Align.STRETCH,
        )
        grid.add(self._btn("Quit", self._quit, danger=True), h_align=Align.STRETCH)
        self._fill(panel, grid)
        self.panels = {SCR_LOGIN: panel}
        self.user_box.set_focused(True)

    def _rebuild_game_screens(self) -> None:
        assert self.player
        self.clock_hud = ClockHUD(self.player, width=230, height=52, theme=self.theme)
        self.hotbar = Hotbar(theme=self.theme, drag=self.drag, on_hover_item=self._on_hover_item)
        self._sync_hotbar()
        self.panels = {
            SCR_HUB:      self._build_hub(),
            SCR_FARM:     self._build_farm(),
            SCR_BUILD:    self._build_build(),
            SCR_CRAFT:    self._build_craft(),
            SCR_INV:      self._build_inventory_screen(),
            SCR_MAP:      self._build_map(),
            SCR_SETTINGS: self._build_settings(),
            SCR_MARKET:   self._build_market(),
        }

    def _nav(self, screen_id: str) -> Callable[[], None]:
        def _go() -> None:
            if not self.player:
                return
            self.current = screen_id
            self._refresh(screen_id)
            self._layout()
            self.flash(f"Opened: {screen_id}", 1.2)
        return _go

    # ---- Hub ----
    def _build_hub(self) -> Panel:
        assert self.player
        panel = Panel(width=600, height=520, title=f"City Builder — {self.player.user_id}", theme=self.theme)
        grid  = Grid(columns=2, style=self.styles.grid, theme=self.theme, v_align=Align.CENTER)

        for label, sid in (
            ("Farm",     SCR_FARM),
            ("Workshop", SCR_BUILD),
            ("Craft",    SCR_CRAFT),
            ("Inventory",SCR_INV),
            ("World Map",SCR_MAP),
            ("Market",   SCR_MARKET),
            ("Settings", SCR_SETTINGS),
        ):
            grid.add(self._btn(label, self._nav(sid)))
        grid.add(self._btn("AI Debug", self.toggle_ai_debug))
        grid.add(self._btn("Logout", self.logout, danger=True))

        # Gather resource buttons (2 columns)
        RESOURCES = [
            ("🪵 Chop Wood",    "wood",     5),
            ("🪨 Mine Stone",   "stone",    5),
            ("🌿 Gather Fiber", "fiber",    5),
            ("⛏ Mine Iron",    "iron",     3),
            ("🔩 Mine Copper",  "copper",   3),
            ("🔧 Smelt Steel",  "steel",    2),
            ("🪟 Blow Glass",   "glass",    3),
            ("💧 Fetch Water",  "water",    8),
            ("🍞 Gather Food",  "food",     5),
            ("⛽ Pump Fuel",    "fuel",     3),
            ("🏗 Mix Concrete", "concrete", 4),
            ("🏎 Tap Rubber",   "rubber",   3),
        ]
        for label, res, amt in RESOURCES:
            grid.add(self._btn(label, lambda r=res, a=amt: self.action_gather(r, a), muted=True))

        self._fill(panel, grid)
        return panel

    # ---- Farm ----
    def _build_farm(self) -> Panel:
        assert self.player
        return FarmPanel(
            self.player, self.farming, self.items,
            theme=self.theme, on_action=self._on_farm_action, on_close=self._nav(SCR_HUB),
        )

    def _on_farm_action(self, message: str) -> None:
        self.flash(message)
        self.save()
        self._sync_hotbar()
        if self.inv_panel:
            self.inv_panel.rebuild_slots()

    # ---- Market ----
    def _build_market(self) -> Panel:
        assert self.player
        return MarketPanel(
            self.player, self.items, self.crops,
            theme=self.theme, on_sell=self.action_sell,
            on_buy=self._on_market_buy, on_close=self._nav(SCR_HUB),
        )

    def _on_market_buy(self, seed_id: str, cost: int, amount: int) -> None:
        self.action_buy_seeds(seed_id, cost, amount)
        if self.inv_panel:
            self.inv_panel.rebuild_slots()

    # ---- Construction Workshop (BUILD screen) ----
    def _build_build(self) -> Panel:
        """
        Workshop panel.  Layout strategy:
          • Panel is 700×530 fixed.
          • Top strip  (32px) — queue status.
          • Scrollable card area — one row per building.
          • Bottom strip (38px) — ← Hub button.
          • Right edge (18px) — scrollbar.
        All children are positioned in _layout().
        """
        assert self.player
        defs  = self.building.list_definitions()
        panel = Panel(width=700, height=530, title="⚒ Construction Workshop", theme=self.theme)

        # --- Queue status strip (top) ---
        self.build_scrollbar   = Scrollbar(theme=self.theme, name="WorkshopScrollbar")
        self.build_screen_btns = {}

        queue_count = len(self.player.build_queue)
        if queue_count:
            qnames = ", ".join(
                self.buildings.get(bj.building_id, {}).get("name", bj.building_id)
                for bj in self.player.build_queue[:4]
            )
            qlabel_text = f"⏳ Crafting: {qnames}" + (f" (+{queue_count - 4} more)" if queue_count > 4 else "")
        else:
            qlabel_text = "⏳ Workshop idle — pick a building below to start crafting"
        qlabel = self._btn(qlabel_text, lambda: None, muted=True)
        self.build_queue_label = qlabel

        panel.add_child(qlabel)
        panel.add_child(self.build_scrollbar)

        # --- One Craft button per building (positioned in _layout) ---
        for d in defs:
            bid = d["id"]
            btn = self._btn("Craft", lambda b=bid: self.action_build(b))
            panel.add_child(btn)
            self.build_screen_btns[bid] = btn

        self.build_close_btn = self._btn("← Hub", self._nav(SCR_HUB), muted=True)
        panel.add_child(self.build_close_btn)
        return panel

    # ---- Craft (item crafting) ----
    def _build_craft(self) -> Panel:
        assert self.player
        recipes = self.crafting.list_recipes()
        panel   = Panel(
            width=600, height=140 + len(recipes) * 42,
            title=f"Crafting — {self.crafting.job_label(self.player)}",
            theme=self.theme,
        )
        grid = Grid(columns=1, style=self.styles.grid, theme=self.theme)
        for r in recipes:
            rid  = r["id"]
            req  = ", ".join(f"{k}×{v}" for k, v in r.get("requirements", {}).items())
            grid.add(self._btn(
                f"{r['name']} → {r['output_count']}× ({req})"[:54],
                lambda x=rid: self.action_craft(x),
            ))
        grid.add(self._btn("← Hub", self._nav(SCR_HUB), muted=True))
        self._fill(panel, grid)
        return panel

    # ---- Inventory ----
    def _build_inventory_screen(self) -> Panel:
        assert self.player
        self.inv_panel = InventoryPanel(
            self.player.inventory, self.items,
            columns=8, slot_count=40, theme=self.theme,
            drag=self.drag, on_inventory_changed=self._on_inv_changed,
            on_hover_item=self._on_hover_item, on_close=self._nav(SCR_HUB),
        )
        return self.inv_panel

    # ---- World Map ----
    def _build_map(self) -> Panel:
        panel = Panel(width=800, height=580, title="World Map — WASD/arrows • scroll=zoom • RMB/MMB=pan", theme=self.theme)

        self.center_btn       = self._btn("⌖ Center",     self._center_map, muted=True)
        self.build_toggle_btn = self._btn("🏗 Build",      self._toggle_build_mode,
                                          active=self.build_mode_active)
        self.terrain_toggle_btn = self._btn("🖌 Terrain",  self._toggle_terrain_mode,
                                            active=self.terrain_mode_active)
        self.hub_btn          = self._btn("← Hub",         self._nav(SCR_HUB), muted=True)
        self.buy_land_btn     = self._btn("💰 Buy Land",   self._buy_land_click, muted=True)

        panel.add_child(self.center_btn)
        panel.add_child(self.build_toggle_btn)
        panel.add_child(self.terrain_toggle_btn)
        panel.add_child(self.buy_land_btn)
        panel.add_child(self.hub_btn)
        return panel

    def _toggle_build_mode(self) -> None:
        self.build_mode_active   = not self.build_mode_active
        self.terrain_mode_active = False
        if not self.build_mode_active:
            self.selected_build_id = None
        if hasattr(self, "build_toggle_btn") and self.build_toggle_btn:
            self.build_toggle_btn.text = "🏗 Build [ON]" if self.build_mode_active else "🏗 Build"
        if hasattr(self, "terrain_toggle_btn") and self.terrain_toggle_btn:
            self.terrain_toggle_btn.text = "🖌 Terrain"
        self._layout()
        self.flash("Build Mode: " + ("Enabled" if self.build_mode_active else "Disabled"))

    def _toggle_terrain_mode(self) -> None:
        self.terrain_mode_active = not self.terrain_mode_active
        self.build_mode_active   = False
        self.selected_build_id   = None
        if hasattr(self, "terrain_toggle_btn") and self.terrain_toggle_btn:
            self.terrain_toggle_btn.text = "🖌 Terrain [ON]" if self.terrain_mode_active else "🖌 Terrain"
        if hasattr(self, "build_toggle_btn") and self.build_toggle_btn:
            self.build_toggle_btn.text = "🏗 Build"
        self._layout()
        self.flash("Terrain Mode: " + ("Enabled — click/drag to paint" if self.terrain_mode_active else "Disabled"))

    def _buy_land_click(self) -> None:
        self.flash(f"Click any locked tile to buy a 5×5 chunk for ${LAND_CHUNK_COST}.")

    def _center_map(self) -> None:
        ts = self.world_renderer.tile_size
        self.world_renderer.camera_x = 20 * ts - 280
        self.world_renderer.camera_y = 20 * ts - 200
        self.flash("Camera centred on starting land.")

    # ---- Settings ----
    def _build_settings(self) -> Panel:
        assert self.player
        panel = Panel(width=440, height=360, title="Settings", theme=self.theme)
        grid  = Grid(columns=1, style=self.styles.grid, theme=self.theme)

        def cycle_speed() -> None:
            assert self.player
            spd = self.player.clock.cycle_speed()
            self._after_action(f"Speed {spd}x", SCR_SETTINGS)

        def cycle_weather() -> None:
            assert self.player
            order = ("Clear", "Cloudy", "Rain", "Storm", "Fog")
            cur = self.player.clock.weather
            self.player.clock.weather = order[(order.index(cur) + 1) % len(order)] if cur in order else "Clear"
            self._after_action(f"Weather: {self.player.clock.weather}", SCR_SETTINGS)

        grid.add(self._btn(f"Cycle Speed ({self.player.clock.speed}x)", cycle_speed))
        grid.add(self._btn(f"Cycle Weather ({self.player.clock.weather})", cycle_weather))
        grid.add(self._btn("Volume +", lambda: self.audio.set_master_volume(self.audio.master_volume + 0.1)))
        grid.add(self._btn("Volume -", lambda: self.audio.set_master_volume(self.audio.master_volume - 0.1)))
        grid.add(self._btn("AI Debug Panel", self.toggle_ai_debug))
        grid.add(self._btn("Save Now", lambda: self._after_action("Saved.", SCR_SETTINGS)))
        grid.add(self._btn("← Hub", self._nav(SCR_HUB), muted=True))
        grid.add(self._btn("Logout", self.logout, danger=True))
        grid.add(self._btn("Quit", self._quit, danger=True))
        self._fill(panel, grid)
        return panel

    def _quit(self) -> None:
        self.save()
        self.running = False

    # -----------------------------------------------------------------------
    # Workshop card renderer
    # -----------------------------------------------------------------------
    _CAT_COLORS: dict[str, tuple[int, int, int]] = {
        "infrastructure": (60,  80, 140),
        "residential":    (60, 130,  70),
        "commercial":     (130, 90,  40),
        "civic":          (110, 60, 130),
        "decorative":     (50, 120, 130),
    }

    def _draw_workshop_cards(self, surface: pygame.Surface, panel: Panel) -> None:
        """
        Draw per-building info cards in the workshop scroll area, then
        reposition the Craft buttons to stay in sync with the scroll value.

        Layout per card (left → right, logical px):
          4px gap | 40px icon | 6px | text column | 6px | [CRAFT_W button zone]

        The card background only fills 'info_w' — it stops before the button
        zone so buttons drawn by panel.draw() are never covered.
        """
        assert self.player
        if not hasattr(self, "build_screen_btns") or not self.build_screen_btns:
            return

        from game.world.map import BUILDING_ART, _building_color

        c = panel.content_rect
        s = self.scale

        SB_W    = 18.0
        QUEUE_H = 32.0
        CLOSE_H = 36.0
        CARD_H  = 52.0
        CARD_GAP = 4.0
        CRAFT_W = 74.0   # width of the Craft button
        ICON_SZ = 38.0   # icon square size (logical px)
        ICON_PAD = 5.0   # gap between left edge and icon

        scroll_area_y = c.y + QUEUE_H + 4
        scroll_area_h = c.height - QUEUE_H - CLOSE_H - 12
        card_x        = c.x + 4
        card_w        = c.width - SB_W - 12
        info_w        = card_w - CRAFT_W - 8   # card bg stops before button zone
        btn_x         = card_x + card_w - CRAFT_W - 2

        defs       = self.building.list_definitions()
        max_scroll = max(0.0, len(defs) * (CARD_H + CARD_GAP) - scroll_area_h)
        scroll_y   = (self.build_scrollbar.scroll * max_scroll) if self.build_scrollbar else 0.0

        # ── Clip to the scroll viewport ──────────────────────────────────────
        clip     = pygame.Rect(
            int(card_x * s), int(scroll_area_y * s),
            int(info_w * s), int(scroll_area_h * s),   # only clip to info_w (not btn zone)
        )
        old_clip = surface.get_clip()
        surface.set_clip(clip)

        for idx, d in enumerate(defs):
            bid = d["id"]
            by  = scroll_area_y + idx * (CARD_H + CARD_GAP) - scroll_y

            # Skip if completely outside scroll area
            if by + CARD_H < scroll_area_y or by > scroll_area_y + scroll_area_h:
                continue

            cat     = d.get("category", "")
            cat_col = self._CAT_COLORS.get(cat, (60, 60, 60))
            # Slightly lighter tint for card bg
            bg_col  = tuple(min(255, int(c_ * 0.18 + 28)) for c_ in cat_col)

            # ── Card background (info_w wide, NOT covering button zone) ──────
            card_rect = pygame.Rect(
                int(card_x * s), int(by * s),
                int(info_w * s), int(CARD_H * s),
            )
            pygame.draw.rect(surface, bg_col,   card_rect, border_radius=5)
            pygame.draw.rect(surface, cat_col,  card_rect, 1, border_radius=5)

            # Left accent stripe
            stripe = pygame.Rect(int(card_x * s), int(by * s), max(3, int(4 * s)), int(CARD_H * s))
            pygame.draw.rect(surface, cat_col, stripe, border_radius=3)

            # ── Icon ─────────────────────────────────────────────────────────
            isz     = int(ICON_SZ * s)
            icon_x  = int((card_x + ICON_PAD) * s)
            icon_y  = int((by + (CARD_H - ICON_SZ) / 2) * s)

            # Solid background so no transparent black holes
            icon_bg = tuple(min(255, int(c_ * 0.45 + 15)) for c_ in cat_col)
            icon_sf = pygame.Surface((isz, isz))   # NO SRCALPHA → solid bg
            icon_sf.fill(icon_bg)
            pygame.draw.rect(icon_sf, cat_col, (0, 0, isz, isz), 1, border_radius=4)

            draw_fn = BUILDING_ART.get(bid)
            if draw_fn and isz >= 12:
                draw_fn(icon_sf, 0, 0, isz)
            else:
                col = _building_color(bid)
                pygame.draw.rect(icon_sf, col, (2, 2, isz - 4, isz - 4), border_radius=3)

            surface.blit(icon_sf, (icon_x, icon_y))

            # ── Text column ──────────────────────────────────────────────────
            tx = int((card_x + ICON_PAD + ICON_SZ + 6) * s)
            ty = int(by * s) + int(5 * s)

            # Building name
            name_s = self.font_lg.render(d.get("name", bid), True, (235, 225, 205))
            surface.blit(name_s, (tx, ty))
            ty += name_s.get_height() + 1

            # Category  |  Inv / Queue counts
            inv_c   = self.building.inventory_count(self.player, bid)
            q_c     = self.building.queue_count(self.player, bid)
            cnt_col = (140, 225, 140) if inv_c > 0 else (150, 148, 143)
            meta    = f"{cat.capitalize()}   Inv:{inv_c}  Q:{q_c}"
            meta_s  = self.font_sm.render(meta, True, cnt_col)
            surface.blit(meta_s, (tx, ty))
            ty += meta_s.get_height() + 2

            # Resource costs — one row, comma-separated, green=have / red=missing
            req   = d.get("requirements", {})
            parts = []
            for item_id, qty in list(req.items())[:5]:
                have = self.player.inventory.get(item_id)
                ok   = have >= qty
                parts.append((f"{item_id[:8]}×{qty}", ok))

            rx = tx
            for text, ok in parts:
                col = (125, 205, 115) if ok else (215, 100, 85)
                rs  = self.font_sm.render(text, True, col)
                # Stop if we'd overflow info_w
                if rx + rs.get_width() > int((card_x + info_w - 4) * s):
                    more_s = self.font_sm.render("…", True, (150, 145, 140))
                    surface.blit(more_s, (rx, ty))
                    break
                surface.blit(rs, (rx, ty))
                rx += rs.get_width() + int(6 * s)

        surface.set_clip(old_clip)

        # ── Reposition Craft buttons every frame (outside clip) ───────────────
        for idx, d in enumerate(defs):
            bid = d["id"]
            if bid not in self.build_screen_btns:
                continue
            btn = self.build_screen_btns[bid]
            by  = scroll_area_y + idx * (CARD_H + CARD_GAP) - scroll_y
            in_area = (by + CARD_H > scroll_area_y) and (by < scroll_area_y + scroll_area_h)
            btn.visible = in_area
            if in_area:
                btn.set_position(btn_x, by + (CARD_H - 28) / 2)
                btn.set_size(CRAFT_W, 28)

    # -----------------------------------------------------------------------
    # Layout
    # -----------------------------------------------------------------------
    def _layout(self) -> None:
        sw, sh = self.screen.get_size()
        self.scale    = self.ui.set_scale_for_screen(sw, sh)
        logical_w     = sw / self.scale
        logical_h     = sh / self.scale
        panel         = self.panels.get(self.current)
        if panel:
            panel.set_scale(self.scale)
            panel.set_position(
                (logical_w - panel.width) / 2,
                max(8, (logical_h - panel.height) / 2 - 20),
            )
            for child in panel.children:
                if isinstance(child, Grid):
                    c = panel.content_rect
                    child.set_position(c.x, c.y)
                    child.set_size(c.width, c.height)
                if isinstance(child, InventoryPanel):
                    c = panel.content_rect
                    child.set_position(c.x, c.y)
                    child.set_scale(self.scale)

            # Map screen button layout
            if self.current == SCR_MAP:
                c      = panel.content_rect
                btn_h  = 28
                btn_y  = c.y + 6
                bw     = 110
                gap    = 6
                if self.center_btn:
                    self.center_btn.set_position(c.x + 4, btn_y)
                    self.center_btn.set_size(bw, btn_h)
                if self.build_toggle_btn:
                    self.build_toggle_btn.set_position(c.x + 4 + bw + gap, btn_y)
                    self.build_toggle_btn.set_size(bw, btn_h)
                if hasattr(self, "terrain_toggle_btn") and self.terrain_toggle_btn:
                    self.terrain_toggle_btn.set_position(c.x + 4 + 2*(bw + gap), btn_y)
                    self.terrain_toggle_btn.set_size(bw, btn_h)
                if hasattr(self, "buy_land_btn") and self.buy_land_btn:
                    self.buy_land_btn.set_position(c.x + 4 + 3*(bw + gap), btn_y)
                    self.buy_land_btn.set_size(bw, btn_h)
                if self.hub_btn:
                    self.hub_btn.set_position(c.right - bw - 4, btn_y)
                    self.hub_btn.set_size(bw, btn_h)

            # Workshop (BUILD) screen layout
            if self.current == SCR_BUILD:
                c = panel.content_rect
                s = self.scale

                SB_W      = 18.0   # scrollbar width
                QUEUE_H   = 32.0   # queue status strip height
                CLOSE_H   = 36.0   # close button height
                CARD_H    = 52.0   # each building card height
                CARD_GAP  = 4.0
                CRAFT_W   = 72.0   # craft button width inside card

                # Usable scroll area
                scroll_area_y = c.y + QUEUE_H + 4
                scroll_area_h = c.height - QUEUE_H - CLOSE_H - 12

                # --- Queue label strip ---
                if hasattr(self, "build_queue_label") and self.build_queue_label:
                    self.build_queue_label.set_position(c.x + 4, c.y + 4)
                    self.build_queue_label.set_size(c.width - SB_W - 12, QUEUE_H - 4)

                # --- Close button ---
                if self.build_close_btn:
                    self.build_close_btn.set_position(c.x + 4, c.bottom - CLOSE_H - 2)
                    self.build_close_btn.set_size(c.width - SB_W - 12, CLOSE_H)

                # --- Scrollbar ---
                defs      = self.building.list_definitions()
                total_h   = len(defs) * (CARD_H + CARD_GAP)
                max_scroll = max(0.0, total_h - scroll_area_h)

                if self.build_scrollbar:
                    self.build_scrollbar.set_position(c.right - SB_W - 2, scroll_area_y)
                    self.build_scrollbar.set_size(SB_W, scroll_area_h)
                    self.build_scrollbar.content_ratio = min(1.0, scroll_area_h / max(1.0, total_h))
                    self.build_scrollbar.visible = max_scroll > 0
                    scroll_y = self.build_scrollbar.scroll * max_scroll
                else:
                    scroll_y = 0.0

                # --- Craft buttons (one per building) ---
                card_x = c.x + 4
                card_w = c.width - SB_W - 12
                for idx, d in enumerate(defs):
                    bid = d["id"]
                    if bid not in self.build_screen_btns:
                        continue
                    btn = self.build_screen_btns[bid]
                    by  = scroll_area_y + idx * (CARD_H + CARD_GAP) - scroll_y
                    # Craft button sits on the right side of the card
                    bx  = card_x + card_w - CRAFT_W - 2
                    btn.set_position(bx, by + (CARD_H - 28) / 2)
                    btn.set_size(CRAFT_W, 28)
                    in_area = (by + CARD_H > scroll_area_y) and (by < scroll_area_y + scroll_area_h)
                    btn.visible = in_area

        if self.clock_hud and self.player:
            self.clock_hud.set_scale(self.scale)
            self.clock_hud.set_position(logical_w - self.clock_hud.width - 12, 12)
        if self.hotbar and self.player:
            self.hotbar.set_scale(self.scale)
            self.hotbar.set_position((logical_w - self.hotbar.width) / 2, logical_h - self.hotbar.height - 10)

    # -----------------------------------------------------------------------
    # Map interaction helpers
    # -----------------------------------------------------------------------
    def _map_viewport_rect(self, panel: Panel) -> pygame.Rect:
        """The actual tile-rendering area inside the map panel."""
        c  = panel.content_rect
        s  = self.scale
        return pygame.Rect(
            int(c.x * s),
            int((c.y + 42) * s),
            int(c.width * s),
            int(max(40, c.height - 42 - self._TOOLBAR_H * (self.build_mode_active or self.terrain_mode_active)) * s),
        )

    def _screen_to_tile(self, sx: int, sy: int, dest: pygame.Rect) -> tuple[int, int]:
        return self.world_renderer.screen_to_tile(sx, sy, dest)

    def _handle_map_click(self, tx: int, ty: int, mode: str = "place") -> None:
        """Handle a tile click in build / terrain / land-buy mode."""
        assert self.player

        if not (0 <= tx < self.world.width and 0 <= ty < self.world.height):
            return

        # --- Land purchase mode ---
        if hasattr(self, "_land_buy_mode") and self._land_buy_mode:
            self.action_buy_land(tx, ty)
            return

        # --- Terrain paint mode ---
        if self.terrain_mode_active:
            if not self.player.owns(tx, ty):
                self.flash("You don't own that land.")
                return
            self.world.set(tx, ty, self.selected_terrain)
            self.world_renderer._tile_cache.clear()
            return

        # --- Build mode ---
        if not self.build_mode_active or not self.selected_build_id:
            return

        bid = self.selected_build_id

        if bid == "demolish":
            target = next((b for b in self.player.buildings if b.x == tx and b.y == ty), None)
            if not target:
                self.flash("Nothing to demolish here.")
                return
            target.x = None
            target.y = None
            self.building._merge_completed(self.player)
            self.audio.play("build", ui=False)
            self.flash(f"Demolished — returned to inventory.")
            self.save()
            return

        # Validate placement
        defn = self.buildings.get(bid, {})
        rule = defn.get("placement_rule", "any_owned")
        valid, reason = _check_placement(bid, tx, ty, self.world, self.player, rule)
        if not valid:
            self.flash(f"Cannot place here: {reason}")
            return

        # Take one from inventory
        inv_b = next(
            (b for b in self.player.buildings
             if b.building_id == bid and b.x is None and b.ready_at_game_seconds is None),
            None
        )
        if inv_b is None:
            self.flash("None in inventory.")
            return
        if inv_b.count > 1:
            inv_b.count -= 1
            self.player.buildings.append(PlacedBuilding(building_id=bid, count=1, x=tx, y=ty))
        else:
            inv_b.x = tx
            inv_b.y = ty

        self.audio.play("build", ui=False)
        self.flash(f"Placed {defn.get('name', bid)} at ({tx}, {ty}).")
        self.save()

    # -----------------------------------------------------------------------
    # Toolbar draw  (bottom bar in map mode)
    # -----------------------------------------------------------------------
    _TOOLBAR_H       = 80   # toolbar height in logical pixels
    _TOOLBAR_ITEM_W  = 72   # each item button width
    _TOOLBAR_PAD     = 8

    def _get_toolbar_items(self) -> list[tuple[str, str]]:
        """Returns list of (building_id, name) for the scrollable toolbar."""
        if self.build_mode_active:
            items = [
                (d["id"], d.get("name", d["id"]))
                for d in self.building.list_definitions()
            ]
            items.append(("demolish", "Demolish"))
            return items
        elif self.terrain_mode_active:
            return [(str(tid), name) for name, tid in TERRAIN_PALETTE]
        return []

    def _draw_toolbar(self, surface: pygame.Surface, dest: pygame.Rect) -> None:
        """Draw the horizontally scrollable bottom toolbar."""
        if not (self.build_mode_active or self.terrain_mode_active):
            return
        items     = self._get_toolbar_items()
        if not items:
            return

        TH   = int(self._TOOLBAR_H * self.scale)
        TW   = dest.width
        ty_  = dest.bottom - TH
        bar  = pygame.Rect(dest.x, ty_, TW, TH)

        # Background
        bg = pygame.Surface((TW, TH), pygame.SRCALPHA)
        bg.fill((20, 18, 15, 210))
        surface.blit(bg, bar.topleft)
        pygame.draw.rect(surface, (80, 70, 55), bar, 1)

        iw  = int(self._TOOLBAR_ITEM_W * self.scale)
        pad = int(self._TOOLBAR_PAD     * self.scale)
        arrow_w = int(26 * self.scale)

        # Arrow buttons
        left_arrow  = pygame.Rect(bar.x + 2,              bar.y + TH // 4, arrow_w, TH // 2)
        right_arrow = pygame.Rect(bar.right - arrow_w - 2, bar.y + TH // 4, arrow_w, TH // 2)

        def draw_arrow(r: pygame.Rect, text: str) -> None:
            pygame.draw.rect(surface, (60, 55, 48), r, border_radius=4)
            pygame.draw.rect(surface, (100, 90, 78), r, 1, border_radius=4)
            s_ = self.font_sm.render(text, True, (220, 210, 180))
            surface.blit(s_, s_.get_rect(center=r.center))

        draw_arrow(left_arrow,  "◀")
        draw_arrow(right_arrow, "▶")

        # Items area
        items_x0 = bar.x + arrow_w + pad
        items_x1 = bar.right - arrow_w - pad
        items_w  = items_x1 - items_x0
        visible  = max(1, items_w // (iw + pad))

        # Clamp scroll
        max_scroll = max(0, len(items) - visible)
        self.toolbar_scroll = max(0, min(self.toolbar_scroll, max_scroll))

        surface.set_clip(pygame.Rect(items_x0, bar.y, items_w, TH))

        for i, (bid, name) in enumerate(items[self.toolbar_scroll: self.toolbar_scroll + visible]):
            global_i = i + self.toolbar_scroll
            ix = items_x0 + i * (iw + pad)
            iy = bar.y + pad // 2

            # Selection highlight
            is_sel = (
                (self.build_mode_active and bid == self.selected_build_id) or
                (self.terrain_mode_active and bid == str(self.selected_terrain))
            )
            bg_c = (70, 120, 60) if is_sel else (40, 38, 34)
            border_c = (140, 220, 80) if is_sel else (70, 65, 58)
            pygame.draw.rect(surface, bg_c, (ix, iy, iw, TH - pad), border_radius=6)
            pygame.draw.rect(surface, border_c, (ix, iy, iw, TH - pad), 1, border_radius=6)

            # Icon
            icon_size = max(16, TH - pad - 24)
            icon_surf = pygame.Surface((icon_size, icon_size), pygame.SRCALPHA)
            if self.build_mode_active:
                if bid == "demolish":
                    pygame.draw.line(icon_surf, (220, 60, 40), (2, 2), (icon_size - 2, icon_size - 2), 3)
                    pygame.draw.line(icon_surf, (220, 60, 40), (icon_size - 2, 2), (2, icon_size - 2), 3)
                else:
                    from game.world.map import BUILDING_ART
                    draw_fn = BUILDING_ART.get(bid)
                    if draw_fn:
                        draw_fn(icon_surf, 0, 0, icon_size)
                    else:
                        from game.world.map import _building_color
                        col = _building_color(bid)
                        pygame.draw.rect(icon_surf, col, (2, 2, icon_size - 4, icon_size - 4))
                # Inventory count badge
                if self.player:
                    cnt = self.building.inventory_count(self.player, bid) if bid != "demolish" else 0
                    q_c = self.building.queue_count(self.player, bid) if bid != "demolish" else 0
                    if cnt > 0 or q_c > 0:
                        badge = self.font_sm.render(f"{cnt}", True, (255, 235, 100))
                        surface.blit(icon_surf, (ix + (iw - icon_size) // 2, iy + 4))
                        surface.blit(badge, (ix + iw - badge.get_width() - 2, iy + 4))
                    else:
                        surface.blit(icon_surf, (ix + (iw - icon_size) // 2, iy + 4))
                else:
                    surface.blit(icon_surf, (ix + (iw - icon_size) // 2, iy + 4))
            else:
                # Terrain mode: draw tile colour swatch
                tile_id = int(bid)
                col = TILE_COLORS.get(tile_id, (100, 100, 100))
                pygame.draw.rect(icon_surf, col, (2, 2, icon_size - 4, icon_size - 4), border_radius=3)
                surface.blit(icon_surf, (ix + (iw - icon_size) // 2, iy + 4))

            # Label
            lbl = name[:8]
            ls  = self.font_sm.render(lbl, True, (220, 210, 180) if not is_sel else (160, 255, 120))
            surface.blit(ls, ls.get_rect(midbottom=(ix + iw // 2, iy + TH - pad - 2)))

        surface.set_clip(None)

        # Store arrow rects for click detection
        self._toolbar_left_arrow  = left_arrow
        self._toolbar_right_arrow = right_arrow
        self._toolbar_items_x0    = items_x0
        self._toolbar_iw          = iw
        self._toolbar_pad         = pad
        self._toolbar_bar         = bar
        self._toolbar_visible     = visible
        self._toolbar_items       = items

    def _toolbar_handle_event(self, event: pygame.event.Event, dest: pygame.Rect) -> bool:
        """Handle click events on the toolbar.  Returns True if consumed."""
        if not (self.build_mode_active or self.terrain_mode_active):
            return False
        if not hasattr(self, "_toolbar_bar"):
            return False

        bar = self._toolbar_bar
        if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
            mx, my = event.pos
            # Arrow clicks
            if hasattr(self, "_toolbar_left_arrow") and self._toolbar_left_arrow.collidepoint(mx, my):
                self.toolbar_scroll = max(0, self.toolbar_scroll - 1)
                return True
            if hasattr(self, "_toolbar_right_arrow") and self._toolbar_right_arrow.collidepoint(mx, my):
                items = self._get_toolbar_items()
                self.toolbar_scroll = min(len(items) - 1, self.toolbar_scroll + 1)
                return True
            # Item clicks
            if bar.collidepoint(mx, my):
                items = getattr(self, "_toolbar_items", [])
                visible = getattr(self, "_toolbar_visible", 1)
                x0  = self._toolbar_items_x0
                iw_ = self._toolbar_iw
                pad = self._toolbar_pad
                for i in range(visible):
                    ix = x0 + i * (iw_ + pad)
                    item_rect = pygame.Rect(ix, bar.y, iw_, bar.height)
                    if item_rect.collidepoint(mx, my):
                        gi = i + self.toolbar_scroll
                        if 0 <= gi < len(items):
                            bid, name = items[gi]
                            if self.build_mode_active:
                                self.selected_build_id = bid
                                if bid == "demolish":
                                    self.flash("Demolish: click a placed building.")
                                else:
                                    self.flash(f"Selected {name} — click valid tile to place.")
                            else:
                                self.selected_terrain = int(bid)
                                self.flash(f"Painting: {name} — click/drag map tiles.")
                        return True
                return True  # consumed even if clicking empty bar

        if event.type == pygame.MOUSEWHEEL:
            if hasattr(self, "_toolbar_bar") and self._toolbar_bar.collidepoint(*pygame.mouse.get_pos()):
                items = self._get_toolbar_items()
                self.toolbar_scroll = max(0, min(len(items) - 1, self.toolbar_scroll - event.y))
                return True

        return False

    # -----------------------------------------------------------------------
    # Tick
    # -----------------------------------------------------------------------
    def _tick_systems(self, dt: float) -> None:
        # Hot reload
        self._hotreload_timer += dt
        if self._hotreload_timer >= 0.5:
            self._hotreload_timer = 0.0
            reloaded = False
            for mod_name, file_path in self._watched_modules.items():
                full_path = os.path.join(self.root, file_path)
                if os.path.exists(full_path):
                    mtime = os.path.getmtime(full_path)
                    if mtime > self._module_times.get(mod_name, 0.0):
                        self._module_times[mod_name] = mtime
                        try:
                            if mod_name in sys.modules:
                                mod = sys.modules[mod_name]
                                importlib.reload(mod)
                                if mod_name == "ui.farming.farm_panel":
                                    globals()["FarmPanel"] = getattr(mod, "FarmPanel")
                                elif mod_name == "ui.market.market_panel":
                                    globals()["MarketPanel"] = getattr(mod, "MarketPanel")
                                elif mod_name == "ui.inventory.inventory_panel":
                                    globals()["InventoryPanel"] = getattr(mod, "InventoryPanel")
                                reloaded = True
                        except Exception as e:
                            print(f"[HOT RELOAD ERROR] {mod_name}: {e}")
            if reloaded:
                self.flash("Hot reload: UI updated!")
                if self.player:
                    self._rebuild_game_screens()
                    self._layout()
                else:
                    self._rebuild_login()

        if not self.player:
            return

        self.player.clock.update(dt)

        msgs = self.building.tick(self.player)
        for msg in msgs:
            self.flash(msg)
            self.building.apply_farm_expansions(self.player)
        if msgs:
            self.save()
            self._refresh(self.current)

        craft_msg = self.crafting.tick(self.player)
        if craft_msg:
            self.flash(craft_msg)
            self.save()
            self._sync_hotbar()
            self._refresh(self.current)

        if self.show_ai and self.ai_debug and self.ai_debug.visible:
            self.ai_debug.tick_sim(dt)

        self.status_t = max(0.0, self.status_t - dt)

        # Camera keyboard movement
        if self.current == SCR_MAP:
            speed = 260 * dt
            if self._map_keys["left"]:
                self.world_renderer.move_camera(-speed, 0)
            if self._map_keys["right"]:
                self.world_renderer.move_camera(speed, 0)
            if self._map_keys["up"]:
                self.world_renderer.move_camera(0, -speed)
            if self._map_keys["down"]:
                self.world_renderer.move_camera(0, speed)

    # -----------------------------------------------------------------------
    # Draw
    # -----------------------------------------------------------------------
    def _draw_background(self) -> None:
        w, h  = self.screen.get_size()
        night = bool(self.player and self.player.clock.is_night)
        for y in range(0, h, 2):
            t = y / max(1, h - 1)
            if night:
                color = (int(8 + 10 * t), int(10 + 14 * t), int(28 + 20 * t))
            else:
                color = (int(18 + 22 * t), int(28 + 18 * t), int(22 + 12 * t))
            pygame.draw.line(self.screen, color, (0, y), (w, y))
            if y + 1 < h:
                pygame.draw.line(self.screen, color, (0, y + 1), (w, y + 1))

    # -----------------------------------------------------------------------
    # Main loop
    # -----------------------------------------------------------------------
    def run(self) -> None:
        """Main loop."""
        self._layout()
        farm_t = 0.0
        self._land_buy_mode = False

        while self.running:
            dt    = self.clock.tick(60) / 1000.0
            panel = self.panels.get(self.current)

            # ----------------------------------------------------------------
            # Events
            # ----------------------------------------------------------------
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    self._quit()
                    continue

                if event.type == pygame.USEREVENT + 1:
                    result = event.result
                    self._auth_in_progress = False
                    self.user_box.enabled  = True
                    self.pass_box.enabled  = True
                    self.flash(f"{result.message} [{self.auth.mode}]")
                    if result.ok and result.user_id:
                        self.enter_game(result.user_id)
                    continue

                if event.type == pygame.VIDEORESIZE:
                    self.screen = pygame.display.set_mode((event.w, event.h), pygame.RESIZABLE)
                    self._layout()
                    continue

                handled = False

                # ---- Map-specific events ----
                if self.current == SCR_MAP and panel:
                    dest = self._map_viewport_rect(panel)
                    self._map_dest_rect = dest

                    # MOUSEWHEEL on map = zoom  (unless over toolbar)
                    if event.type == pygame.MOUSEWHEEL:
                        mx, my = pygame.mouse.get_pos()
                        # Toolbar scroll first
                        toolbar_consumed = self._toolbar_handle_event(event, dest)
                        if toolbar_consumed:
                            handled = True
                        elif dest.collidepoint(mx, my):
                            old_ts = self.world_renderer.tile_size
                            self.world_renderer.tile_size = old_ts + event.y * 2
                            handled = True

                    # Build scrollbar (workshop screen)
                    if event.type == pygame.MOUSEWHEEL and self.current == SCR_BUILD:
                        if self.build_scrollbar and self.build_scrollbar.visible:
                            self.build_scrollbar.scroll = max(0.0, min(1.0, self.build_scrollbar.scroll - event.y * 0.1))
                            handled = True

                    # Toolbar click
                    if not handled:
                        toolbar_consumed = self._toolbar_handle_event(event, dest)
                        if toolbar_consumed:
                            handled = True

                    # Middle-mouse / right-mouse drag for panning
                    if event.type == pygame.MOUSEBUTTONDOWN and event.button in (2, 3):
                        if dest.collidepoint(event.pos):
                            self._cam_drag_active = True
                            self._cam_drag_start  = event.pos
                            self._cam_start       = (self.world_renderer.camera_x, self.world_renderer.camera_y)
                            handled = True

                    if event.type == pygame.MOUSEBUTTONUP and event.button in (2, 3):
                        self._cam_drag_active = False
                        handled = True

                    if event.type == pygame.MOUSEMOTION and self._cam_drag_active:
                        dx = (event.pos[0] - self._cam_drag_start[0])
                        dy = (event.pos[1] - self._cam_drag_start[1])
                        self.world_renderer.camera_x = self._cam_start[0] - dx
                        self.world_renderer.camera_y = self._cam_start[1] - dy
                        handled = True

                    # Terrain painting drag
                    if self.terrain_mode_active and event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                        if dest.collidepoint(event.pos):
                            self.terrain_dragging = True
                    if event.type == pygame.MOUSEBUTTONUP and event.button == 1:
                        self.terrain_dragging = False
                    if self.terrain_dragging and event.type == pygame.MOUSEMOTION:
                        if dest.collidepoint(event.pos):
                            tx, ty = self._screen_to_tile(event.pos[0], event.pos[1], dest)
                            self._handle_map_click(tx, ty)
                            handled = True

                    # Left click: place building / paint terrain / buy land
                    if not handled and event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                        if dest.collidepoint(event.pos):
                            tx, ty = self._screen_to_tile(event.pos[0], event.pos[1], dest)
                            if 0 <= tx < self.world.width and 0 <= ty < self.world.height:
                                if self._land_buy_mode:
                                    self.action_buy_land(tx, ty)
                                    self._land_buy_mode = False
                                elif self.terrain_mode_active:
                                    self._handle_map_click(tx, ty)
                                elif self.build_mode_active and self.selected_build_id:
                                    self._handle_map_click(tx, ty)
                                handled = True

                    # Minimap click
                    if not handled and event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                        if self._minimap_rect and self._minimap_rect.collidepoint(event.pos):
                            self.world_renderer.minimap_to_camera(
                                event.pos[0], event.pos[1],
                                self._minimap_rect, dest.width, dest.height,
                            )
                            handled = True

                # Workshop scroll
                if self.current == SCR_BUILD and event.type == pygame.MOUSEWHEEL:
                    if self.build_scrollbar and self.build_scrollbar.visible:
                        self.build_scrollbar.scroll = max(0.0, min(1.0, self.build_scrollbar.scroll - event.y * 0.1))
                        handled = True

                # ---- Normal UI routing ----
                if not handled:
                    if self.show_ai and self.ai_debug and self.ai_debug.visible:
                        handled = self.ai_debug.handle_event(event)
                    if not handled and self.hotbar and self.player and self.current != SCR_LOGIN:
                        handled = self.hotbar.handle_event(event)
                    if not handled and panel:
                        handled = panel.handle_event(event)

                if handled:
                    continue

                # ---- Keys ----
                if event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_ESCAPE:
                        if self.show_ai and self.ai_debug:
                            self.toggle_ai_debug()
                        elif self.build_mode_active or self.terrain_mode_active:
                            self.build_mode_active   = False
                            self.terrain_mode_active = False
                            self.selected_build_id   = None
                            self.flash("Build / terrain mode off.")
                        elif self.player and self.current != SCR_HUB:
                            self._nav(SCR_HUB)()
                        elif self.player:
                            self.logout()
                        else:
                            self._quit()
                    elif event.key == pygame.K_RETURN and self.current == SCR_LOGIN:
                        self._login_submit()
                    elif event.key == pygame.K_TAB and self.current == SCR_LOGIN:
                        if self.user_box.is_focused:
                            self.pass_box.set_focused(True)
                            self.user_box.set_focused(False)
                        else:
                            self.user_box.set_focused(True)
                            self.pass_box.set_focused(False)
                    elif event.key == pygame.K_F1 and self.player:
                        self.toggle_ai_debug()
                    elif event.key == pygame.K_i and self.player and self.current != SCR_LOGIN:
                        self._nav(SCR_INV)()
                    elif event.key == pygame.K_m and self.player and self.current != SCR_LOGIN:
                        self._nav(SCR_MAP)()
                    # Map pan keys
                    if event.key in (pygame.K_a, pygame.K_LEFT):  self._map_keys["left"]  = True
                    if event.key in (pygame.K_d, pygame.K_RIGHT): self._map_keys["right"] = True
                    if event.key in (pygame.K_w, pygame.K_UP):    self._map_keys["up"]    = True
                    if event.key in (pygame.K_s, pygame.K_DOWN):  self._map_keys["down"]  = True
                    # Toolbar scroll arrows
                    if self.current == SCR_MAP and (self.build_mode_active or self.terrain_mode_active):
                        if event.key == pygame.K_COMMA:
                            self.toolbar_scroll = max(0, self.toolbar_scroll - 1)
                        if event.key == pygame.K_PERIOD:
                            items = self._get_toolbar_items()
                            self.toolbar_scroll = min(len(items) - 1, self.toolbar_scroll + 1)

                elif event.type == pygame.KEYUP:
                    if event.key in (pygame.K_a, pygame.K_LEFT):  self._map_keys["left"]  = False
                    if event.key in (pygame.K_d, pygame.K_RIGHT): self._map_keys["right"] = False
                    if event.key in (pygame.K_w, pygame.K_UP):    self._map_keys["up"]    = False
                    if event.key in (pygame.K_s, pygame.K_DOWN):  self._map_keys["down"]  = False

            # ----------------------------------------------------------------
            # Update
            # ----------------------------------------------------------------
            self._tick_systems(dt)
            if panel:
                panel.update(dt)
            if self.clock_hud:
                self.clock_hud.update(dt)
            if self.hotbar:
                self.hotbar.update(dt)
            self.ui.update(dt)

            if self.current == SCR_FARM and self.player:
                farm_t += dt
                if farm_t >= 1.0:
                    farm_t = 0.0
                    self._sync_farm_labels()

            # ----------------------------------------------------------------
            # Draw
            # ----------------------------------------------------------------
            self._draw_background()

            if panel:
                panel.draw(self.screen)

            # Workshop cards drawn AFTER panel — card bg stops short of button zone
            # so buttons (drawn by panel) stay fully visible in the right margin.
            if self.current == SCR_BUILD and panel and self.player:
                self._draw_workshop_cards(self.screen, panel)

            # World map rendering
            if self.current == SCR_MAP and panel:
                dest = self._map_viewport_rect(panel)
                self._map_dest_rect = dest

                if dest.width > 0 and dest.height > 0:
                    owned = self.player.owned_set() if self.player else None

                    # Ghost bid + validity
                    ghost_bid   = None
                    ghost_valid = True
                    ghost_reason = ""
                    if self.build_mode_active and self.selected_build_id and self.selected_build_id != "demolish":
                        ghost_bid = self.selected_build_id
                        if self.player:
                            mx_, my_ = pygame.mouse.get_pos()
                            if dest.collidepoint((mx_, my_)):
                                tx_, ty_ = self._screen_to_tile(mx_, my_, dest)
                                if 0 <= tx_ < self.world.width and 0 <= ty_ < self.world.height:
                                    defn = self.buildings.get(ghost_bid, {})
                                    rule = defn.get("placement_rule", "any_owned")
                                    ghost_valid, ghost_reason = _check_placement(
                                        ghost_bid, tx_, ty_, self.world, self.player, rule
                                    )

                    self.world_renderer.draw(
                        self.screen, dest,
                        player=self.player,
                        owned_land=owned,
                        ghost_bid=ghost_bid,
                        ghost_valid=ghost_valid,
                        ghost_reason=ghost_reason,
                    )

                    # Ghost tooltip
                    if ghost_bid and not ghost_valid and ghost_reason:
                        mx_, my_ = pygame.mouse.get_pos()
                        ts_ = self.font_sm.render(ghost_reason, True, (255, 120, 120))
                        bx, by = mx_ + 14, my_ + 14
                        bg = pygame.Surface((ts_.get_width() + 10, ts_.get_height() + 8), pygame.SRCALPHA)
                        bg.fill((15, 10, 8, 220))
                        self.screen.blit(bg, (bx - 5, by - 4))
                        self.screen.blit(ts_, (bx, by))

                    # Terrain mode cursor indicator
                    if self.terrain_mode_active:
                        mx_, my_ = pygame.mouse.get_pos()
                        if dest.collidepoint((mx_, my_)):
                            tx_, ty_ = self._screen_to_tile(mx_, my_, dest)
                            if 0 <= tx_ < self.world.width and 0 <= ty_ < self.world.height:
                                ts  = self.world_renderer.tile_size
                                cx_ = self.world_renderer.camera_x
                                cy_ = self.world_renderer.camera_y
                                sx_ = int(tx_ * ts - cx_) + dest.x
                                sy_ = int(ty_ * ts - cy_) + dest.y
                                col = TILE_COLORS.get(self.selected_terrain, (200, 200, 200))
                                border = pygame.Surface((ts, ts), pygame.SRCALPHA)
                                pygame.draw.rect(border, (*col, 160), (0, 0, ts, ts))
                                pygame.draw.rect(border, (255, 255, 255, 200), (0, 0, ts, ts), 2)
                                self.screen.blit(border, (sx_, sy_))

                    # Minimap (top-right of map area)
                    mini_size = min(120, dest.width // 5, dest.height // 4)
                    mini_rect = pygame.Rect(
                        dest.right - mini_size - 8, dest.y + 8, mini_size, mini_size
                    )
                    self._minimap_rect = mini_rect
                    self.world_renderer.draw_minimap(
                        self.screen, mini_rect,
                        owned_land=owned,
                        viewport_rect=dest,
                    )

                    # Build / terrain info bar above toolbar
                    if self.build_mode_active or self.terrain_mode_active:
                        if self.build_mode_active and self.selected_build_id:
                            defn = self.buildings.get(self.selected_build_id, {})
                            info = f"[{self.selected_build_id}] {defn.get('name','')} — {defn.get('placement_rule','')}"
                            if self.player and self.selected_build_id != "demolish":
                                inv_c = self.building.inventory_count(self.player, self.selected_build_id)
                                q_c   = self.building.queue_count(self.player, self.selected_build_id)
                                info += f"  ▪ Inv: {inv_c}  Queue: {q_c}"
                        elif self.terrain_mode_active:
                            tname = next((n for n, tid in TERRAIN_PALETTE if tid == self.selected_terrain), "?")
                            info  = f"🖌 Painting: {tname}"
                        else:
                            info = "Select a building or terrain type below"
                        info_s = self.font_sm.render(info, True, (230, 220, 180))
                        TH = int(self._TOOLBAR_H * self.scale)
                        self.screen.blit(info_s, (dest.x + 6, dest.bottom - TH - info_s.get_height() - 4))

                    # Draw toolbar
                    self._draw_toolbar(self.screen, dest)

            # HUD
            if self.clock_hud and self.player and self.current != SCR_LOGIN:
                self.clock_hud.draw(self.screen)
            if self.hotbar and self.player and self.current != SCR_LOGIN:
                self.hotbar.draw(self.screen)
            if self.show_ai and self.ai_debug and self.ai_debug.visible:
                self.ai_debug.draw(self.screen)
            self.ui.tooltip.draw(self.screen)
            if self.drag.active:
                self.drag.draw_ghost(self.screen, self.scale)

            # Status / money overlay
            y_ = 12
            if self.player:
                money_s = self.font.render(f"${self.player.money}", True, self.theme.colors.text_title)
                self.screen.blit(money_s, (12, y_))
                y_ += 22
                # Build queue count
                if self.player.build_queue:
                    q_s = self.font_sm.render(f"⚒ Building: {len(self.player.build_queue)} in queue", True, (180, 220, 140))
                    self.screen.blit(q_s, (12, y_))
                    y_ += 18
            if self.status_t > 0 and self.status:
                surf = self.font_sm.render(self.status[:100], True, self.theme.colors.text_primary)
                surf.set_alpha(min(255, int(255 * min(1.0, self.status_t))))
                self.screen.blit(surf, (12, y_))

            hint = self.font_sm.render(
                "M=map | I=inv | WASD=pan | scroll=zoom | RMB=pan | ESC=back | ,. toolbar",
                True, self.theme.colors.text_disabled,
            )
            self.screen.blit(hint, (12, self.screen.get_height() - 22))
            pygame.display.flip()

        pygame.quit()


def main() -> None:
    """Entry."""
    GameApp().run()


if __name__ == "__main__":
    main()
