"""
Redesigned Inventory Panel combining Toolbar, Categories, Scrollable Slot Grid, and Details Panel.
"""

from __future__ import annotations

from typing import Any, Callable, Optional

import pygame

from game.systems.inventory import Inventory
from ui.inventory.dragdrop import DragDropController
from ui.inventory.inventory_categories import InventoryCategories
from ui.inventory.inventory_context_menu import InventoryContextMenu
from ui.inventory.inventory_details import InventoryDetails
from ui.inventory.inventory_slot import InventorySlot
from ui.inventory.inventory_toolbar import InventoryToolbar
from ui.styles import DEFAULT_STYLES
from ui.theme import Theme
from ui.widgets.panel import Panel
from ui.widgets.scrollbar import Scrollbar


class InventoryPanel(Panel):
    """
    Main container coordinating the entire modern RPG-style responsive inventory layout.
    """

    def __init__(
        self,
        inventory: Inventory,
        item_catalog: dict[str, Any],
        *,
        x: float = 0.0,
        y: float = 0.0,
        columns: int = 8,
        slot_count: int = 40,
        theme: Theme | None = None,
        drag: DragDropController | None = None,
        on_inventory_changed: Callable[[], None] | None = None,
        on_hover_item: Callable[[dict[str, Any] | None, tuple[int, int]], None] | None = None,
        on_close: Callable[[], None] | None = None,
    ) -> None:
        self.t = theme or DEFAULT_STYLES.theme
        
        # Determine container size (approx 940x540)
        # Allows space for categories, slots, details, toolbar
        width = 940.0
        height = 540.0

        super().__init__(
            x=x,
            y=y,
            width=width,
            height=height,
            title="Inventory",
            theme=self.t,
            name="InventoryPanel",
        )
        self.inventory = inventory
        self.catalog = item_catalog
        self.columns = columns
        self.slot_count = slot_count
        self.drag = drag if drag is not None else DragDropController()
        self.on_inventory_changed = on_inventory_changed
        self.on_hover_item = on_hover_item
        self.on_close_cb = on_close

        # Filter states
        self.search_query = ""
        self.category = "All"
        self.sort_mode = "newest"
        
        # Track items marked as favorite
        self.favorites: set[str] = set()
        
        # Tracks which stack is currently selected to show in Details Panel
        self.selected_slot_index: Optional[int] = None
        self.selected_item_id: Optional[str] = None

        # Build Sub-widgets
        # 1. Top Toolbar
        self.toolbar = InventoryToolbar(
            width=width - 24,
            height=42.0,
            theme=self.t,
            on_search=self.set_search,
            on_sort=self.set_sort,
            on_close=self.on_close_cb,
        )
        self.add_child(self.toolbar)

        # 2. Left Categories Sidebar
        self.categories_sidebar = InventoryCategories(
            width=120.0,
            height=height - 80.0,
            theme=self.t,
            on_select_category=self.set_category,
        )
        self.add_child(self.categories_sidebar)

        # 3. Right Details Panel
        # Create standard functions checking usability from hardcoded run_game configuration
        usable_list = {"apple", "bread", "torch"}
        self.details = InventoryDetails(
            width=260.0,
            height=height - 80.0,
            theme=self.t,
            is_usable_fn=lambda iid: iid in usable_list,
            on_use=self._use_item,
            on_sell=self._sell_item,
            on_drop=self._drop_item,
            on_split=self._split_item,
            on_favorite=self._favorite_item,
        )
        self.add_child(self.details)

        # 4. Scrollbar for center grid area
        self.scrollbar = Scrollbar(
            height=height - 80.0,
            theme=self.t,
            name="grid_scrollbar",
        )
        self.add_child(self.scrollbar)

        # 5. Slots Grid
        self._slots: list[InventorySlot] = []
        for i in range(slot_count):
            slot = InventorySlot(
                i,
                theme=self.t,
                drag=self.drag,
                on_change=lambda idx=i: self._on_slot_drop(idx),
                on_hover_item=self._on_slot_hover,
                on_right_click=self._on_slot_right_click,
            )
            self._slots.append(slot)
            self.add_child(slot)

        # Context Menu ref
        self.active_context_menu: Optional[InventoryContextMenu] = None

        self.rebuild_slots()
        self._layout_children()

    # --- Filter & Sort Setters ---

    def set_search(self, text: str) -> None:
        self.search_query = text.lower().strip()
        self.rebuild_slots()

    def set_category(self, category: str) -> None:
        self.category = category
        self.rebuild_slots()

    def set_sort(self, sort_mode: str) -> None:
        self.sort_mode = sort_mode.lower().strip()
        self.rebuild_slots()

    def _category_match(self, item_id: str) -> bool:
        """Verify if item id matches the selected sidebar tab filter."""
        if self.category == "All":
            return True
        if self.category == "Favorite":
            return item_id in self.favorites
        
        # Check value for Rare
        if self.category == "Rare":
            meta = self.catalog.get(item_id, {})
            return int(meta.get("value", 0)) >= 25 or item_id in ("wooden_axe", "stone_pick")

        # Category tags matching items.json profiles
        food_items = {"apple", "wheat", "bread"}
        material_items = {"wood", "stone", "fiber", "rope"}
        tool_items = {"wooden_axe", "stone_pick", "torch", "rope"}
        building_items = {"wood", "stone"}
        farming_items = {"apple_seed", "wheat_seed", "apple", "wheat"}

        if self.category == "Food":
            return item_id in food_items
        elif self.category == "Material":
            return item_id in material_items
        elif self.category == "Tools":
            return item_id in tool_items
        elif self.category == "Building":
            return item_id in building_items
        elif self.category == "Farming":
            return item_id in farming_items
        
        return False

    def rebuild_slots(self) -> None:
        """Re-filter, re-sort, and map player inventory items to visual slots grid."""
        stacks = list(self.inventory.items())
        filtered: list[tuple[str, int]] = []
        
        # 1. Filter stacks
        for item_id, count in stacks:
            if not self._category_match(item_id):
                continue
            meta = self.catalog.get(item_id, {})
            name = str(meta.get("name", item_id)).lower()
            if self.search_query and (self.search_query not in name and self.search_query not in item_id.lower()):
                continue
            filtered.append((item_id, count))

        # 2. Sort stacks
        def get_sort_key(stack: tuple[str, int]) -> Any:
            iid, qty = stack
            meta = self.catalog.get(iid, {})
            if self.sort_mode == "name":
                return meta.get("name", iid).lower()
            elif self.sort_mode == "quantity":
                return -qty
            elif self.sort_mode == "value":
                return -int(meta.get("value", 0))
            elif self.sort_mode == "weight":
                return -float(meta.get("weight", 0.0))
            return iid  # Newest/Default

        if self.sort_mode != "newest":
            filtered.sort(key=get_sort_key)

        self._slot_items = filtered

        # 3. Adjust Scrollbar parameters
        rows = max(1, (len(filtered) + self.columns - 1) // self.columns)
        visible_rows = 5  # Fixed visible grid height constraint
        self.scrollbar.content_ratio = min(1.0, visible_rows / rows)
        
        # Re-clamp scroll position
        if self.scrollbar.scroll > 1.0:
            self.scrollbar.scroll = 1.0

        # Calculate row scroll offset
        scroll_row = int(self.scrollbar.scroll * max(0, rows - visible_rows))

        # 4. Fill slot widgets
        for i, slot in enumerate(self._slots):
            # Calculate slot offset location in the sorted lists
            grid_row, grid_col = divmod(i, self.columns)
            list_idx = (grid_row + scroll_row) * self.columns + grid_col

            if list_idx < len(filtered):
                iid, count = filtered[list_idx]
                meta = self.catalog.get(iid, {})
                slot.set_stack(iid, count, meta)
                slot.is_favorite = iid in self.favorites
                slot.selected = (self.selected_item_id == iid)
            else:
                slot.set_stack(None, 0)
                slot.is_favorite = False
                slot.selected = False

        # 5. Sync stats in Toolbar banner
        total_weight = sum(
            qty * float(self.catalog.get(iid, {}).get("weight", 0.0))
            for iid, qty in self.inventory.items()
        )
        # Try getting money from parent if not injected
        money_val = getattr(self.parent, "player", None)
        player_money = money_val.money if money_val else 100
        self.toolbar.set_stats(player_money, total_weight, 100.0)

        # 6. Keep details panel synchronized
        self._refresh_details()

    def _refresh_details(self) -> None:
        """Reload details view stats based on current slot selection."""
        # Find if selected item is still in slots
        selected_found = False
        if self.selected_item_id:
            for item_id, count in self._slot_items:
                if item_id == self.selected_item_id:
                    meta = self.catalog.get(item_id, {})
                    data = {
                        "name": meta.get("name", item_id),
                        "description": meta.get("description", ""),
                        "weight": meta.get("weight", "-"),
                        "value": meta.get("value", "-"),
                        "durability": (hash(item_id) % 40 + 60) / 100.0 if meta.get("max_stack", 99) == 1 else "-",
                        "stack": count,
                        "item_id": item_id,
                        "category": meta.get("category", "General"),
                        "rarity": "Epic" if item_id in ("wooden_axe", "stone_pick") else "Rare" if int(meta.get("value", 0)) >= 10 else "Common",
                        "is_favorite": item_id in self.favorites,
                    }
                    self.details.set_item(data)
                    selected_found = True
                    break
        
        if not selected_found:
            self.selected_item_id = None
            self.selected_slot_index = None
            self.details.set_item(None)

    def _layout_children(self) -> None:
        """Position sub-panels responsively to fit content boundaries."""
        c = self.content_rect
        gap = self.theme.spacing.grid_gap

        # 1. Top Toolbar banner
        self.toolbar.set_position(c.x, c.y)
        self.toolbar.set_size(c.width, 42.0)

        # Content area start below toolbar
        content_top = c.y + 42.0 + gap
        content_h = c.height - 42.0 - gap

        # 2. Sidebar Left
        self.categories_sidebar.set_position(c.x, content_top)
        self.categories_sidebar.set_size(120.0, content_h)

        # 3. Details Panel Right
        details_w = 260.0
        self.details.set_position(c.right - details_w, content_top)
        self.details.set_size(details_w, content_h)

        # 4. Center Grid slots positioning
        grid_x = c.x + 120.0 + gap
        grid_w = c.width - 120.0 - details_w - gap * 3 - self.theme.sizes.scrollbar_width
        
        # Align slots layout
        slot_size = self.theme.sizes.slot_size
        col_gap = (grid_w - (self.columns * slot_size)) / max(1, self.columns - 1)
        row_gap = (content_h - (5 * slot_size)) / 4.0

        for i, slot in enumerate(self._slots):
            row, col = divmod(i, self.columns)
            sx = grid_x + col * (slot_size + col_gap)
            sy = content_top + row * (slot_size + row_gap)
            slot.set_position(sx, sy)

        # 5. Scrollbar center
        self.scrollbar.set_position(c.right - details_w - gap - self.theme.sizes.scrollbar_width, content_top)
        self.scrollbar.set_size(self.theme.sizes.scrollbar_width, content_h)

    # --- Mouse Event Handlers & Hooks ---

    def _on_slot_hover(self, item_data: dict[str, Any] | None, pos: tuple[int, int]) -> None:
        """Trigger tooltip display if callback is assigned."""
        if self.on_hover_item:
            self.on_hover_item(item_data, pos)

    def _on_slot_hover_enter(self, slot: InventorySlot) -> None:
        """Optionally handle select slot logic on mouse hover."""
        pass

    def _on_slot_right_click(self, index: int) -> None:
        """Spawn the context menu for slots."""
        # Find visual slot reference
        slot = self._slots[index]
        if not slot.item_id:
            return

        # Close existing context menus
        self._close_context_menu()

        # Build list of options depending on game actions
        opts = []
        usable_list = {"apple", "bread", "torch"}
        if slot.item_id in usable_list:
            opts.append(("Use", lambda iid=slot.item_id: self._use_item(iid)))
        
        value = slot.item_meta.get("value", 0)
        if isinstance(value, int) and value > 0:
            opts.append(("Sell", lambda iid=slot.item_id: self._sell_item(iid)))
        
        opts.append(("Drop", lambda iid=slot.item_id: self._drop_item(iid)))
        
        if slot.count > 1:
            opts.append(("Split Stack", lambda iid=slot.item_id: self._split_item(iid)))

        is_fav = slot.item_id in self.favorites
        opts.append(("Unfavorite" if is_fav else "Favorite", lambda iid=slot.item_id: self._favorite_item(iid)))

        if not opts:
            return

        # Spawn at mouse pos
        mx, my = pygame.mouse.get_pos()
        s = max(0.001, self._scale)
        lx = mx / s
        ly = my / s

        self.active_context_menu = InventoryContextMenu(
            opts,
            x=lx,
            y=ly,
            theme=self.t,
            on_close=self._on_context_menu_close,
        )
        self.add_child(self.active_context_menu)

    def _close_context_menu(self) -> None:
        if self.active_context_menu:
            self.active_context_menu._dismiss()
            self.active_context_menu = None

    def _on_context_menu_close(self) -> None:
        self.active_context_menu = None

    # --- Actions execution bridging to GameApp ---

    def _use_item(self, item_id: str) -> None:
        # Resolve use action call via parent hooks
        if hasattr(self.parent, "action_use") and self.parent.action_use:
            self.parent.action_use(item_id)
        elif self.on_inventory_changed:
            # Fallback removal
            self.inventory.remove(item_id, 1)
            self.on_inventory_changed()
            self.rebuild_slots()

    def _sell_item(self, item_id: str) -> None:
        if hasattr(self.parent, "action_sell") and self.parent.action_sell:
            self.parent.action_sell(item_id, 1)
        elif self.on_inventory_changed:
            self.inventory.remove(item_id, 1)
            self.on_inventory_changed()
            self.rebuild_slots()

    def _drop_item(self, item_id: str) -> None:
        # Discard full stack size or 1
        if self.selected_slot_index is not None and self.selected_slot_index < len(self._slot_items):
            _, qty = self._slot_items[self.selected_slot_index]
        else:
            qty = 1
            
        self.inventory.remove(item_id, qty)
        if self.on_inventory_changed:
            self.on_inventory_changed()
        self.rebuild_slots()

    def _split_item(self, item_id: str) -> None:
        """Split item stack placing half on the mouse cursor."""
        if self.selected_slot_index is not None:
            # Find item stack count
            stack_count = self.inventory.get(item_id)
            if stack_count > 1:
                split_qty = stack_count // 2
                
                # Setup drag payload
                self.drag.begin(
                    item_id=item_id,
                    count=split_qty,
                    source_index=self.selected_slot_index,
                    source_panel="inventory",
                    pos=pygame.mouse.get_pos(),
                    split=False,
                )
                
                # Visual feedback sound if available
                if hasattr(self.parent, "audio") and self.parent.audio:
                    self.parent.audio.play("ui_click")

    def _favorite_item(self, item_id: str) -> None:
        if item_id in self.favorites:
            self.favorites.remove(item_id)
        else:
            self.favorites.add(item_id)
        self.rebuild_slots()

    def _on_slot_drop(self, target_index: int) -> None:
        """Apply drag session payload target drop calculations."""
        payload = self.drag.payload
        if payload is None:
            return

        src = payload.source_index
        src_panel = payload.source_panel

        if src == target_index and src_panel == "inventory":
            self.drag.clear()
            return

        # Check stack exist
        if not self.inventory.has(payload.item_id, payload.count):
            self.drag.clear()
            self.rebuild_slots()
            return

        # Carry out slot based swapping logic
        self._apply_slot_based_move(src, target_index, payload.item_id, payload.count)
        self.drag.clear()
        self.rebuild_slots()
        
        if self.on_inventory_changed:
            self.on_inventory_changed()

    def _apply_slot_based_move(self, src: int, dst: int, item_id: str, count: int) -> None:
        """Calculate drag drop swapping inside filtered visual arrays."""
        # Create virtual slot registry from current visual mapping
        slots: list[Optional[tuple[str, int]]] = [None] * self.slot_count
        for i, stack in enumerate(self._slot_items):
            if i < self.slot_count:
                slots[i] = stack

        # Double check bounds
        if src >= self.slot_count or slots[src] is None:
            return

        s_id, s_count = slots[src]  # type: ignore
        if s_id != item_id:
            return

        move_qty = min(count, s_count)
        remain = s_count - move_qty
        slots[src] = (s_id, remain) if remain > 0 else None

        if slots[dst] is None:
            slots[dst] = (item_id, move_qty)
        else:
            d_id, d_count = slots[dst]  # type: ignore
            if d_id == item_id:
                # Merge target stack
                max_stack = int(self.catalog.get(item_id, {}).get("max_stack", 99))
                merged = min(max_stack, d_count + move_qty)
                overflow = d_count + move_qty - merged
                slots[dst] = (item_id, merged)
                if overflow > 0:
                    slots[src] = (item_id, (remain + overflow))
            else:
                # Swap slots
                slots[dst] = (item_id, move_qty)
                slots[src] = (d_id, d_count)

        # Write back changes into inventory dictionary model preserving other categories
        moved_ids = {s[0] for s in self._slot_items}
        preserved = {
            iid: qty
            for iid, qty in self.inventory.items()
            if iid not in moved_ids
        }

        self.inventory.stacks.clear()
        for iid, qty in preserved.items():
            self.inventory.add(iid, qty)
        for entry in slots:
            if entry:
                self.inventory.add(entry[0], entry[1])

    def _update(self, dt: float) -> None:
        """Monitor updates, scroll coordinates and text inputs."""
        self._layout_children()

    def _handle_event(self, event: pygame.event.Event) -> bool:
        """Intercept mouse coordinates clicks, selection state updates and wheel triggers."""
        # 1. Close context menu on any mouse press outside context menu
        if event.type == pygame.MOUSEBUTTONDOWN:
            if self.active_context_menu and not self.active_context_menu.contains_screen_point(event.pos):
                self._close_context_menu()

            # Track left selection click inside grid slots
            if event.button == 1:
                for idx, slot in enumerate(self._slots):
                    if slot.contains_screen_point(event.pos) and slot.item_id:
                        self.selected_slot_index = idx
                        self.selected_item_id = slot.item_id
                        self.rebuild_slots()
                        break

        # 2. Forward mouse wheel events to scrollbar
        if event.type == pygame.MOUSEWHEEL:
            if self.contains_screen_point(pygame.mouse.get_pos()):
                self.scrollbar.scroll = max(
                    0.0,
                    min(1.0, self.scrollbar.scroll - event.y * 0.1),
                )
                self.rebuild_slots()
                return True
        return False
