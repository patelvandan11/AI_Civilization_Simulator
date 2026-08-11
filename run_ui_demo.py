"""
Demo runner for the AI Civilization UI foundation modules.

Hub buttons open the next panel (Build / Craft / Inventory / Settings).
Back returns to the hub. ESC quits.
"""

from __future__ import annotations

import sys
from collections.abc import Callable
from pathlib import Path

_ROOT = Path(__file__).resolve().parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pygame

from ui.styles import ButtonStyle, UIStyles
from ui.theme import Theme
from ui.widgets.button import Button
from ui.widgets.grid import Align, Grid
from ui.widgets.panel import Panel


# Screen ids for simple navigation (no hardcoded positions).
SCREEN_HUB = "hub"
SCREEN_BUILD = "build"
SCREEN_CRAFT = "craft"
SCREEN_INVENTORY = "inventory"
SCREEN_SETTINGS = "settings"

SCREEN_TITLES: dict[str, str] = {
    SCREEN_HUB: "Settlement Hub",
    SCREEN_BUILD: "Build Menu",
    SCREEN_CRAFT: "Crafting",
    SCREEN_INVENTORY: "Inventory",
    SCREEN_SETTINGS: "Settings",
}

SCREEN_BLURBS: dict[str, tuple[str, ...]] = {
    SCREEN_BUILD: (
        "House",
        "Fence",
        "Farm",
        "Storage",
        "Workshop",
        "Bridge",
        "Campfire",
    ),
    SCREEN_CRAFT: (
        "Wooden Axe",
        "Stone Pick",
        "Torch",
        "Rope",
        "Cloth",
        "Bread",
    ),
    SCREEN_INVENTORY: (
        "Tab: All",
        "Tab: Tools",
        "Tab: Food",
        "Tab: Materials",
    ),
    SCREEN_SETTINGS: (
        "Video",
        "Audio",
        "Controls",
        "Gameplay",
    ),
}


def _make_panel(
    theme: Theme,
    styles: UIStyles,
    title: str,
    width: float,
    height: float,
) -> Panel:
    """Create a wooden panel with a title."""
    return Panel(
        x=0,
        y=0,
        width=width,
        height=height,
        title=title,
        style=styles.panel,
        theme=theme,
    )


def _fill_grid_in_panel(panel: Panel, grid: Grid) -> None:
    """Fit a grid into the panel content rect (layout-driven)."""
    content = panel.content_rect
    grid.set_position(content.x, content.y)
    grid.set_size(content.width, content.height)
    if grid not in panel.children:
        panel.add_child(grid)


def build_hub(
    theme: Theme,
    styles: UIStyles,
    navigate: Callable[[str], None],
    quit_app: Callable[[], None],
) -> Panel:
    """Build the main hub panel with navigation buttons."""
    panel = _make_panel(theme, styles, SCREEN_TITLES[SCREEN_HUB], 440, 300)
    grid = Grid(
        columns=2,
        style=styles.grid,
        theme=theme,
        h_align=Align.STRETCH,
        v_align=Align.CENTER,
    )

    cancel_style = styles.with_button(
        normal=(160, 60, 50),
        hover=(190, 80, 65),
        pressed=(120, 40, 35),
        border_color=(80, 25, 20),
    ).button

    actions: list[tuple[str, str | None, ButtonStyle]] = [
        ("Build", SCREEN_BUILD, styles.button),
        ("Craft", SCREEN_CRAFT, styles.button),
        ("Inventory", SCREEN_INVENTORY, styles.button),
        ("Settings", SCREEN_SETTINGS, styles.button),
        ("Quit", None, cancel_style),
    ]

    for label, target, style in actions:
        if target is None:
            cb = quit_app
        else:
            # Bind target by default-arg to avoid late-binding bugs.
            cb = (lambda t=target: navigate(t))
        grid.add(Button(text=label, style=style, theme=theme, callback=cb))

    _fill_grid_in_panel(panel, grid)
    return panel


def build_sub_screen(
    theme: Theme,
    styles: UIStyles,
    screen_id: str,
    navigate: Callable[[str], None],
) -> Panel:
    """Build a secondary screen with action buttons and Back."""
    panel = _make_panel(theme, styles, SCREEN_TITLES[screen_id], 480, 340)
    grid = Grid(
        columns=2,
        style=styles.grid,
        theme=theme,
        h_align=Align.STRETCH,
        v_align=Align.CENTER,
    )

    for label in SCREEN_BLURBS[screen_id]:
        grid.add(
            Button(
                text=label,
                style=styles.button,
                theme=theme,
                callback=lambda name=label: print(f"Selected: {name}"),
            )
        )

    back_style = styles.with_button(
        normal=(90, 70, 45),
        hover=(120, 95, 55),
        pressed=(70, 50, 30),
        border_color=(40, 24, 14),
        border_hover=theme.colors.border_gold,
    ).button
    # Back spans full width on its own row when odd count — still fine in 2-col.
    grid.add(
        Button(
            text="← Back to Hub",
            style=back_style,
            theme=theme,
            callback=lambda: navigate(SCREEN_HUB),
        ),
        h_align=Align.STRETCH,
    )

    _fill_grid_in_panel(panel, grid)
    return panel


def main() -> None:
    """Boot pygame-ce with multi-screen navigation demo."""
    pygame.init()
    pygame.display.set_caption("AI Civilization — UI Navigation Demo")

    theme = Theme.default()
    styles = UIStyles.from_theme(theme)

    screen = pygame.display.set_mode(
        (theme.design_width, theme.design_height),
        pygame.RESIZABLE,
    )
    clock = pygame.time.Clock()

    state: dict[str, object] = {
        "current": SCREEN_HUB,
        "running": True,
        "flash": "",
        "flash_t": 0.0,
    }

    def quit_app() -> None:
        state["running"] = False

    def navigate(screen_id: str) -> None:
        """Switch active screen and show a short status flash."""
        if screen_id not in screens:
            return
        state["current"] = screen_id
        state["flash"] = f"Opened: {SCREEN_TITLES[screen_id]}"
        state["flash_t"] = 1.6
        print(state["flash"])
        # Re-center after switch
        layout_root(screen.get_width(), screen.get_height())

    screens: dict[str, Panel] = {
        SCREEN_HUB: build_hub(theme, styles, navigate, quit_app),
        SCREEN_BUILD: build_sub_screen(theme, styles, SCREEN_BUILD, navigate),
        SCREEN_CRAFT: build_sub_screen(theme, styles, SCREEN_CRAFT, navigate),
        SCREEN_INVENTORY: build_sub_screen(theme, styles, SCREEN_INVENTORY, navigate),
        SCREEN_SETTINGS: build_sub_screen(theme, styles, SCREEN_SETTINGS, navigate),
    }

    def active_panel() -> Panel:
        return screens[str(state["current"])]

    def layout_root(sw: int, sh: int) -> float:
        scale = theme.compute_scale(sw, sh)
        logical_w = sw / scale
        logical_h = sh / scale
        for panel in screens.values():
            panel.set_scale(scale)
            panel.set_position(
                (logical_w - panel.width) / 2,
                (logical_h - panel.height) / 2,
            )
            # Refresh nested grids after move
            for child in panel.children:
                if isinstance(child, Grid):
                    c = panel.content_rect
                    child.set_position(c.x, c.y)
                    child.set_size(c.width, c.height)
        return scale

    scale = layout_root(screen.get_width(), screen.get_height())
    font = pygame.font.SysFont("consolas", 18)
    font_small = pygame.font.SysFont("consolas", 14)

    while bool(state["running"]):
        dt = clock.tick(60) / 1000.0
        panel = active_panel()

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                state["running"] = False
            elif event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
                # ESC: back to hub, or quit if already on hub
                if state["current"] != SCREEN_HUB:
                    navigate(SCREEN_HUB)
                else:
                    state["running"] = False
            elif event.type == pygame.VIDEORESIZE:
                screen = pygame.display.set_mode((event.w, event.h), pygame.RESIZABLE)
                scale = layout_root(event.w, event.h)
            else:
                panel.handle_event(event)

        panel.update(dt)
        flash_t = float(state["flash_t"])
        if flash_t > 0:
            state["flash_t"] = max(0.0, flash_t - dt)

        # Atmospheric background
        w, h = screen.get_size()
        for y in range(h):
            t = y / max(1, h - 1)
            pygame.draw.line(
                screen,
                (int(18 + 22 * t), int(28 + 18 * t), int(22 + 12 * t)),
                (0, y),
                (w, y),
            )

        panel.draw(screen)

        # Navigation hint + flash feedback
        hint = font_small.render(
            f"Screen: {SCREEN_TITLES[str(state['current'])]}  |  "
            f"scale {scale:.2f}  |  ESC back/quit",
            True,
            theme.colors.text_secondary,
        )
        screen.blit(hint, (12, 12))

        if float(state["flash_t"]) > 0 and state["flash"]:
            alpha = min(255, int(255 * min(1.0, float(state["flash_t"]))))
            flash_surf = font.render(str(state["flash"]), True, theme.colors.text_title)
            flash_surf.set_alpha(alpha)
            screen.blit(flash_surf, (12, 36))

        pygame.display.flip()

    pygame.quit()


if __name__ == "__main__":
    main()
