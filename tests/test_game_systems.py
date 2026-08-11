"""Test suite for AI Civilization game systems."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

import pygame

from game.auth.auth_manager import AuthManager
from game.core.player import Player
from game.core.save_manager import SaveManager
from game.core.time_system import GameClock, SECONDS_PER_GAME_HOUR
from game.systems.building import BuildingSystem
from game.systems.crafting import CraftingSystem
from game.systems.farming import FarmingSystem
from game.systems.inventory import Inventory, starter_inventory
from game.world.map import WorldMap, TILE_GRASS, TILE_WATER
from ui.widgets.textbox import TextBox


class TestAuth(unittest.TestCase):
    """Local authentication tests."""

    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.auth = AuthManager(Path(self.tmp.name))

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_register_and_login(self) -> None:
        reg = self.auth.register("player1", "secret")
        self.assertTrue(reg.ok)
        self.assertEqual(reg.user_id, "player1")
        login = self.auth.login("player1", "secret")
        self.assertTrue(login.ok)
        self.assertEqual(login.user_id, "player1")

    def test_wrong_password(self) -> None:
        self.auth.register("player1", "secret")
        login = self.auth.login("player1", "wrong")
        self.assertFalse(login.ok)

    def test_invalid_user_id(self) -> None:
        reg = self.auth.register("ab", "secret")
        self.assertFalse(reg.ok)


class TestInventory(unittest.TestCase):
    """Inventory stack operations."""

    def test_add_remove(self) -> None:
        inv = Inventory()
        self.assertTrue(inv.add("wood", 5))
        self.assertEqual(inv.get("wood"), 5)
        self.assertTrue(inv.remove("wood", 2))
        self.assertEqual(inv.get("wood"), 3)

    def test_can_afford_consume(self) -> None:
        inv = starter_inventory()
        self.assertTrue(inv.can_afford({"wood": 5, "stone": 1}))
        self.assertTrue(inv.consume({"wood": 5}))
        self.assertFalse(inv.has("wood", 30))


class TestGameClock(unittest.TestCase):
    """In-game timeline."""

    def test_day_and_speed(self) -> None:
        clock = GameClock(total_seconds=8 * SECONDS_PER_GAME_HOUR, speed=10)
        clock.update(1.0)
        self.assertEqual(clock.speed, 10)
        self.assertGreater(clock.total_seconds, 8 * SECONDS_PER_GAME_HOUR)
        self.assertIn("Day", clock.format_clock())

    def test_cycle_speed(self) -> None:
        clock = GameClock()
        self.assertEqual(clock.cycle_speed(), 10)
        self.assertEqual(clock.cycle_speed(), 60)
        self.assertEqual(clock.cycle_speed(), 1)


class TestFarming(unittest.TestCase):
    """Crop plant and status."""

    def setUp(self) -> None:
        root = Path(__file__).resolve().parents[1]
        crops = SaveManager(root).load_json_data("crops")
        self.farming = FarmingSystem(crops)
        self.player = Player.new("test")

    def test_plant_apple(self) -> None:
        msg = self.farming.plant(self.player, 0, "apple")
        self.assertIn("Planted", msg)
        status = self.farming.plot_status(self.player.plots[0])
        self.assertEqual(status["state"], "growing")

    def test_plant_without_seed(self) -> None:
        self.player.inventory.stacks.clear()
        msg = self.farming.plant(self.player, 0, "apple")
        self.assertIn("Need", msg)


class TestBuildingCrafting(unittest.TestCase):
    """Build and craft actions."""

    def setUp(self) -> None:
        root = Path(__file__).resolve().parents[1]
        saves = SaveManager(root)
        self.building = BuildingSystem(saves.load_json_data("buildings"))
        self.crafting = CraftingSystem(saves.load_json_data("recipes"))
        self.player = Player.new("test")

    def test_start_build(self) -> None:
        msg = self.building.start_build(self.player, "campfire")
        self.assertIn("Started", msg)
        self.assertLess(self.player.inventory.get("wood"), 30)

    def test_start_craft(self) -> None:
        msg = self.crafting.start_craft(self.player, "torch")
        self.assertIn("Crafting", msg)
        self.assertIsNotNone(self.player.craft_job)


class TestSaveManager(unittest.TestCase):
    """Player save round-trip."""

    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.saves = SaveManager(Path(self.tmp.name))

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_save_load_roundtrip(self) -> None:
        player = Player.new("save_test")
        player.money = 250
        player.inventory.add("apple", 3)
        self.saves.save_player(player)
        loaded = self.saves.load_player("save_test")
        self.assertEqual(loaded.money, 250)
        self.assertEqual(loaded.inventory.get("apple"), 3)


class TestWorldMap(unittest.TestCase):
    """Procedural map generation."""

    def test_generate_and_get(self) -> None:
        world = WorldMap(width=32, height=32, seed=99)
        self.assertEqual(world.width, 32)
        tile = world.get(16, 16)
        self.assertIsInstance(tile, int)

    def test_set_tile(self) -> None:
        world = WorldMap(width=8, height=8, seed=1)
        world.set(4, 4, TILE_GRASS)
        self.assertEqual(world.get(4, 4), TILE_GRASS)


class TestTextBox(unittest.TestCase):
    """Keyboard text input widget."""

    @classmethod
    def setUpClass(cls) -> None:
        pygame.init()

    @classmethod
    def tearDownClass(cls) -> None:
        pygame.quit()

    def test_textinput_event(self) -> None:
        box = TextBox(width=200, height=32)
        box.set_scale(1.0)
        box.set_focused(True)
        event = pygame.event.Event(pygame.TEXTINPUT, {"text": "hello"})
        self.assertTrue(box.handle_event(event))
        self.assertEqual(box.text, "hello")
        box.set_focused(False)

    def test_backspace(self) -> None:
        box = TextBox(width=200, height=32)
        box.text = "abc"
        box.set_focused(True)
        event = pygame.event.Event(pygame.KEYDOWN, key=pygame.K_BACKSPACE, unicode="")
        self.assertTrue(box.handle_event(event))
        self.assertEqual(box.text, "ab")
        box.set_focused(False)

    def test_keydown_unicode_fallback(self) -> None:
        box = TextBox(width=200, height=32)
        box.set_focused(True)
        event = pygame.event.Event(pygame.KEYDOWN, key=pygame.K_a, unicode="a")
        self.assertTrue(box.handle_event(event))
        self.assertEqual(box.text, "a")
        box.set_focused(False)


class TestDataFiles(unittest.TestCase):
    """Validate JSON data tables exist and parse."""

    def test_data_files(self) -> None:
        root = Path(__file__).resolve().parents[1]
        for name in ("items", "crops", "recipes", "buildings"):
            path = root / "data" / f"{name}.json"
            self.assertTrue(path.exists(), f"missing {path}")
            data = json.loads(path.read_text(encoding="utf-8"))
            self.assertIsInstance(data, dict)
            self.assertGreater(len(data), 0)


if __name__ == "__main__":
    unittest.main()
