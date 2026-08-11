"""
Central theme configuration for the AI Civilization pixel-art UI.

All colors, fonts, sizes, spacing, margins, padding, and animation
timings live here. Widgets must never hardcode visual constants —
they read from Theme (or a Style that wraps Theme values).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Final


# ---------------------------------------------------------------------------
# Color helpers
# ---------------------------------------------------------------------------

ColorTuple = tuple[int, int, int]
ColorAlpha = tuple[int, int, int, int]


@dataclass(frozen=True, slots=True)
class ColorPalette:
    """Immutable named color set for the wooden / indie pixel UI."""

    # --- Panel / wood ---
    wood_dark: ColorTuple = (62, 39, 23)
    wood_mid: ColorTuple = (92, 58, 32)
    wood_light: ColorTuple = (133, 88, 48)
    wood_highlight: ColorTuple = (168, 118, 68)
    border_dark: ColorTuple = (40, 24, 14)
    border_gold: ColorTuple = (212, 168, 62)
    border_gold_dim: ColorTuple = (150, 115, 40)

    # --- Surfaces ---
    panel_bg: ColorTuple = (78, 48, 28)
    panel_bg_dark: ColorTuple = (48, 30, 18)
    panel_inset: ColorTuple = (35, 22, 12)
    overlay_dim: ColorAlpha = (0, 0, 0, 160)
    shadow: ColorAlpha = (0, 0, 0, 120)

    # --- Text ---
    text_primary: ColorTuple = (245, 230, 200)
    text_secondary: ColorTuple = (190, 170, 140)
    text_disabled: ColorTuple = (110, 95, 80)
    text_shadow: ColorTuple = (20, 12, 8)
    text_title: ColorTuple = (255, 220, 140)
    text_danger: ColorTuple = (220, 80, 70)
    text_success: ColorTuple = (120, 200, 100)

    # --- Buttons ---
    btn_normal: ColorTuple = (70, 120, 55)
    btn_hover: ColorTuple = (90, 150, 70)
    btn_pressed: ColorTuple = (50, 90, 40)
    btn_disabled: ColorTuple = (70, 65, 55)
    btn_border: ColorTuple = (30, 55, 25)
    btn_glow: ColorAlpha = (212, 168, 62, 90)

    # --- Semantic HUD bars ---
    health: ColorTuple = (200, 55, 45)
    health_bg: ColorTuple = (80, 25, 20)
    energy: ColorTuple = (230, 200, 50)
    energy_bg: ColorTuple = (90, 75, 20)
    hunger: ColorTuple = (230, 130, 40)
    hunger_bg: ColorTuple = (90, 50, 15)
    thirst: ColorTuple = (55, 130, 210)
    thirst_bg: ColorTuple = (20, 50, 85)
    xp: ColorTuple = (150, 80, 200)
    xp_bg: ColorTuple = (55, 30, 75)

    # --- Inventory / slots ---
    slot_bg: ColorTuple = (45, 28, 16)
    slot_border: ColorTuple = (95, 65, 40)
    slot_hover: ColorTuple = (212, 168, 62)
    slot_selected: ColorTuple = (255, 210, 90)
    slot_empty: ColorTuple = (35, 22, 12)

    # --- Misc ---
    transparent: ColorAlpha = (0, 0, 0, 0)
    white: ColorTuple = (255, 255, 255)
    black: ColorTuple = (0, 0, 0)
    focus_ring: ColorTuple = (255, 230, 150)


@dataclass(frozen=True, slots=True)
class FontConfig:
    """Font paths and pixel sizes used across the UI."""

    # Relative to project root; swap for Kenney/pixel fonts when assets land.
    primary_path: str = "assets/ui/kenney/fonts/PixelFont.ttf"
    title_path: str = "assets/ui/kenney/fonts/PixelFontBold.ttf"
    mono_path: str = "assets/ui/kenney/fonts/PixelMono.ttf"

    size_tiny: int = 10
    size_small: int = 12
    size_body: int = 14
    size_medium: int = 16
    size_large: int = 20
    size_title: int = 24
    size_hero: int = 32


@dataclass(frozen=True, slots=True)
class SpacingConfig:
    """Consistent spacing / padding / margin tokens (no magic numbers)."""

    xs: int = 2
    sm: int = 4
    md: int = 8
    lg: int = 12
    xl: int = 16
    xxl: int = 24
    xxxl: int = 32

    panel_padding: int = 12
    window_padding: int = 16
    button_padding_x: int = 16
    button_padding_y: int = 8
    slot_padding: int = 4
    grid_gap: int = 6
    section_gap: int = 12


@dataclass(frozen=True, slots=True)
class SizeConfig:
    """Default widget dimensions in logical (unscaled) pixels."""

    border_width: int = 2
    border_width_thick: int = 3
    corner_radius: int = 6
    corner_radius_sm: int = 4
    corner_radius_lg: int = 10

    button_height: int = 32
    button_min_width: int = 80
    button_icon_size: int = 16

    panel_min_width: int = 120
    panel_min_height: int = 80

    window_title_height: int = 28
    window_close_size: int = 20
    window_min_width: int = 200
    window_min_height: int = 150
    window_resize_handle: int = 12
    window_shadow_offset: int = 6

    slot_size: int = 40
    slot_icon_size: int = 32
    hotbar_slots: int = 10

    progressbar_height: int = 14
    scrollbar_width: int = 12
    slider_height: int = 16
    slider_thumb: int = 14

    tooltip_max_width: int = 260
    tooltip_icon_size: int = 32

    icon_sm: int = 16
    icon_md: int = 24
    icon_lg: int = 32

    minimap_size: int = 128
    hud_bar_width: int = 140
    hud_bar_height: int = 14


@dataclass(frozen=True, slots=True)
class AnimationConfig:
    """Timing and easing parameters for UI motion (seconds / factors)."""

    # Durations in seconds
    fade_in: float = 0.18
    fade_out: float = 0.14
    scale_in: float = 0.20
    scale_out: float = 0.15
    hover_glow: float = 0.12
    button_press: float = 0.06
    tooltip_fade: float = 0.10
    inventory_open: float = 0.22
    inventory_close: float = 0.16
    progress_smooth: float = 0.35
    window_drag_smooth: float = 0.0  # instant follow

    # Scale factors
    hover_scale: float = 1.05
    press_scale: float = 0.95
    window_open_scale_from: float = 0.85
    window_open_scale_to: float = 1.0

    # Glow / alpha targets
    hover_glow_alpha: int = 90
    disabled_alpha: int = 120
    tooltip_alpha: int = 240


@dataclass(frozen=True, slots=True)
class LayerConfig:
    """Z-order constants for layered rendering."""

    background: int = 0
    panels: int = 100
    buttons: int = 200
    icons: int = 300
    text: int = 400
    windows: int = 500
    tooltip: int = 900
    cursor: int = 1000


@dataclass(slots=True)
class Theme:
    """
    Single source of truth for all UI visual configuration.

    Instantiate once (typically via ``Theme.default()``) and inject into
    the UIManager / styles. Widgets query this object instead of literals.
    """

    colors: ColorPalette = field(default_factory=ColorPalette)
    fonts: FontConfig = field(default_factory=FontConfig)
    spacing: SpacingConfig = field(default_factory=SpacingConfig)
    sizes: SizeConfig = field(default_factory=SizeConfig)
    animations: AnimationConfig = field(default_factory=AnimationConfig)
    layers: LayerConfig = field(default_factory=LayerConfig)

    # Base design resolution — UI scales relative to this.
    design_width: int = 1280
    design_height: int = 720
    # Pixel-perfect integer scale when True; otherwise smooth float scale.
    pixel_perfect: bool = True
    # Minimum / maximum allowed UI scale factors.
    min_scale: float = 0.75
    max_scale: float = 3.0

    @classmethod
    def default(cls) -> Theme:
        """Return a Theme with all default wooden / indie pixel values."""
        return cls()

    def resolve_font_path(self, relative: str, project_root: Path | None = None) -> Path:
        """
        Resolve a font path relative to the project root.

        Args:
            relative: Path string from FontConfig (e.g. primary_path).
            project_root: Optional root; defaults to two levels above this file.

        Returns:
            Absolute Path to the font file (may not exist yet).
        """
        root = project_root or Path(__file__).resolve().parent.parent
        return root / relative

    def compute_scale(self, screen_width: int, screen_height: int) -> float:
        """
        Compute UI scale from current screen size vs design resolution.

        Args:
            screen_width: Actual window width in pixels.
            screen_height: Actual window height in pixels.

        Returns:
            Clamped scale factor. Integer-rounded when ``pixel_perfect``.
        """
        sx = screen_width / self.design_width
        sy = screen_height / self.design_height
        scale = min(sx, sy)
        scale = max(self.min_scale, min(self.max_scale, scale))
        if self.pixel_perfect:
            # Prefer nearest integer scale for crisp pixel art; allow 0.5 steps
            # when the window is between integer multiples.
            return max(self.min_scale, round(scale * 2) / 2)
        return scale

    def scaled(self, value: int | float, scale: float) -> int:
        """
        Scale a logical size to screen pixels.

        Args:
            value: Logical (design) size.
            scale: Current UI scale from ``compute_scale``.

        Returns:
            Integer pixel size (minimum 1 when value > 0).
        """
        if value == 0:
            return 0
        result = int(round(value * scale))
        return max(1, result) if value > 0 else result


# Module-level singleton used when no Theme is injected.
DEFAULT_THEME: Final[Theme] = Theme.default()
