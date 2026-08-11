"""
Style definitions that map Theme tokens onto concrete widget looks.

Styles are data-driven: change Theme values and every Style updates.
Widgets receive a Style object rather than raw color / size literals.
"""

from __future__ import annotations

from dataclasses import dataclass, field, replace
from typing import Optional

from ui.theme import (
    ColorAlpha,
    ColorTuple,
    DEFAULT_THEME,
    Theme,
)


@dataclass(slots=True)
class ButtonStyle:
    """Visual / behavioral style for Button widgets."""

    # Fill colors per state
    normal: ColorTuple = (70, 120, 55)
    hover: ColorTuple = (90, 150, 70)
    pressed: ColorTuple = (50, 90, 40)
    disabled: ColorTuple = (70, 65, 55)
    focused: ColorTuple = (90, 150, 70)

    # Borders
    border_color: ColorTuple = (30, 55, 25)
    border_hover: ColorTuple = (212, 168, 62)
    border_focused: ColorTuple = (255, 230, 150)
    border_width: int = 2
    corner_radius: int = 6

    # Text
    text_color: ColorTuple = (245, 230, 200)
    text_disabled: ColorTuple = (110, 95, 80)
    text_shadow: ColorTuple = (20, 12, 8)
    font_size: int = 14

    # Layout
    padding_x: int = 16
    padding_y: int = 8
    min_width: int = 80
    height: int = 32
    icon_size: int = 16
    icon_gap: int = 6

    # Animation / glow
    hover_scale: float = 1.05
    press_scale: float = 0.95
    hover_glow: ColorAlpha = (212, 168, 62, 90)
    hover_duration: float = 0.12
    press_duration: float = 0.06

    # Optional sound keys (resolved by audio system later)
    sound_hover: Optional[str] = "ui_hover"
    sound_click: Optional[str] = "ui_click"
    sound_disabled: Optional[str] = None

    @classmethod
    def from_theme(cls, theme: Theme = DEFAULT_THEME) -> ButtonStyle:
        """Build a ButtonStyle from a Theme instance."""
        c = theme.colors
        s = theme.sizes
        sp = theme.spacing
        a = theme.animations
        f = theme.fonts
        return cls(
            normal=c.btn_normal,
            hover=c.btn_hover,
            pressed=c.btn_pressed,
            disabled=c.btn_disabled,
            focused=c.btn_hover,
            border_color=c.btn_border,
            border_hover=c.border_gold,
            border_focused=c.focus_ring,
            border_width=s.border_width,
            corner_radius=s.corner_radius,
            text_color=c.text_primary,
            text_disabled=c.text_disabled,
            text_shadow=c.text_shadow,
            font_size=f.size_body,
            padding_x=sp.button_padding_x,
            padding_y=sp.button_padding_y,
            min_width=s.button_min_width,
            height=s.button_height,
            icon_size=s.button_icon_size,
            icon_gap=sp.sm,
            hover_scale=a.hover_scale,
            press_scale=a.press_scale,
            hover_glow=c.btn_glow,
            hover_duration=a.hover_glow,
            press_duration=a.button_press,
        )


@dataclass(slots=True)
class PanelStyle:
    """Visual style for Panel widgets (wooden frames)."""

    background: ColorTuple = (78, 48, 28)
    background_dark: ColorTuple = (48, 30, 18)
    inset: ColorTuple = (35, 22, 12)
    border_color: ColorTuple = (40, 24, 14)
    border_highlight: ColorTuple = (133, 88, 48)
    border_width: int = 2
    corner_radius: int = 6
    padding: int = 12
    shadow_color: ColorAlpha = (0, 0, 0, 120)
    shadow_offset: int = 4
    draw_shadow: bool = True
    draw_inset: bool = False
    header_height: int = 28
    header_color: ColorTuple = (62, 39, 23)
    title_color: ColorTuple = (255, 220, 140)
    title_font_size: int = 16

    @classmethod
    def from_theme(cls, theme: Theme = DEFAULT_THEME) -> PanelStyle:
        """Build a PanelStyle from a Theme instance."""
        c = theme.colors
        s = theme.sizes
        sp = theme.spacing
        f = theme.fonts
        return cls(
            background=c.panel_bg,
            background_dark=c.panel_bg_dark,
            inset=c.panel_inset,
            border_color=c.border_dark,
            border_highlight=c.wood_light,
            border_width=s.border_width,
            corner_radius=s.corner_radius,
            padding=sp.panel_padding,
            shadow_color=c.shadow,
            shadow_offset=s.window_shadow_offset // 2,
            header_height=s.window_title_height,
            header_color=c.wood_dark,
            title_color=c.text_title,
            title_font_size=f.size_medium,
        )


@dataclass(slots=True)
class LabelStyle:
    """Visual style for Label / text widgets."""

    color: ColorTuple = (245, 230, 200)
    shadow_color: ColorTuple = (20, 12, 8)
    font_size: int = 14
    draw_shadow: bool = True
    shadow_offset: int = 1
    line_spacing: int = 4
    align: str = "left"  # left | center | right

    @classmethod
    def from_theme(cls, theme: Theme = DEFAULT_THEME) -> LabelStyle:
        """Build a LabelStyle from a Theme instance."""
        return cls(
            color=theme.colors.text_primary,
            shadow_color=theme.colors.text_shadow,
            font_size=theme.fonts.size_body,
        )


@dataclass(slots=True)
class ProgressBarStyle:
    """Visual style for ProgressBar widgets."""

    fill: ColorTuple = (200, 55, 45)
    background: ColorTuple = (80, 25, 20)
    border_color: ColorTuple = (40, 24, 14)
    border_width: int = 2
    corner_radius: int = 4
    height: int = 14
    smooth_duration: float = 0.35
    show_text: bool = True
    text_color: ColorTuple = (245, 230, 200)
    font_size: int = 10

    @classmethod
    def health(cls, theme: Theme = DEFAULT_THEME) -> ProgressBarStyle:
        """Health bar (red) style."""
        return cls._from_semantic(theme, theme.colors.health, theme.colors.health_bg)

    @classmethod
    def energy(cls, theme: Theme = DEFAULT_THEME) -> ProgressBarStyle:
        """Energy bar (yellow) style."""
        return cls._from_semantic(theme, theme.colors.energy, theme.colors.energy_bg)

    @classmethod
    def hunger(cls, theme: Theme = DEFAULT_THEME) -> ProgressBarStyle:
        """Hunger bar (orange) style."""
        return cls._from_semantic(theme, theme.colors.hunger, theme.colors.hunger_bg)

    @classmethod
    def thirst(cls, theme: Theme = DEFAULT_THEME) -> ProgressBarStyle:
        """Thirst / water bar (blue) style."""
        return cls._from_semantic(theme, theme.colors.thirst, theme.colors.thirst_bg)

    @classmethod
    def xp(cls, theme: Theme = DEFAULT_THEME) -> ProgressBarStyle:
        """XP bar (purple) style."""
        return cls._from_semantic(theme, theme.colors.xp, theme.colors.xp_bg)

    @classmethod
    def _from_semantic(
        cls,
        theme: Theme,
        fill: ColorTuple,
        background: ColorTuple,
    ) -> ProgressBarStyle:
        """Internal helper for semantic HUD bar styles."""
        return cls(
            fill=fill,
            background=background,
            border_color=theme.colors.border_dark,
            border_width=theme.sizes.border_width,
            corner_radius=theme.sizes.corner_radius_sm,
            height=theme.sizes.progressbar_height,
            smooth_duration=theme.animations.progress_smooth,
            text_color=theme.colors.text_primary,
            font_size=theme.fonts.size_tiny,
        )


@dataclass(slots=True)
class SlotStyle:
    """Visual style for inventory / hotbar slots."""

    background: ColorTuple = (45, 28, 16)
    empty: ColorTuple = (35, 22, 12)
    border: ColorTuple = (95, 65, 40)
    hover: ColorTuple = (212, 168, 62)
    selected: ColorTuple = (255, 210, 90)
    size: int = 40
    icon_size: int = 32
    padding: int = 4
    border_width: int = 2
    corner_radius: int = 4
    stack_font_size: int = 10
    stack_color: ColorTuple = (245, 230, 200)

    @classmethod
    def from_theme(cls, theme: Theme = DEFAULT_THEME) -> SlotStyle:
        """Build a SlotStyle from a Theme instance."""
        c = theme.colors
        s = theme.sizes
        return cls(
            background=c.slot_bg,
            empty=c.slot_empty,
            border=c.slot_border,
            hover=c.slot_hover,
            selected=c.slot_selected,
            size=s.slot_size,
            icon_size=s.slot_icon_size,
            padding=theme.spacing.slot_padding,
            border_width=s.border_width,
            corner_radius=s.corner_radius_sm,
            stack_font_size=theme.fonts.size_tiny,
            stack_color=c.text_primary,
        )


@dataclass(slots=True)
class TooltipStyle:
    """Visual style for Tooltip widgets."""

    background: ColorTuple = (48, 30, 18)
    border_color: ColorTuple = (212, 168, 62)
    border_width: int = 2
    corner_radius: int = 6
    padding: int = 8
    max_width: int = 260
    icon_size: int = 32
    title_color: ColorTuple = (255, 220, 140)
    body_color: ColorTuple = (190, 170, 140)
    meta_color: ColorTuple = (168, 118, 68)
    title_font_size: int = 14
    body_font_size: int = 12
    fade_duration: float = 0.10
    alpha: int = 240
    offset_x: int = 12
    offset_y: int = 12

    @classmethod
    def from_theme(cls, theme: Theme = DEFAULT_THEME) -> TooltipStyle:
        """Build a TooltipStyle from a Theme instance."""
        c = theme.colors
        s = theme.sizes
        a = theme.animations
        f = theme.fonts
        return cls(
            background=c.panel_bg_dark,
            border_color=c.border_gold,
            border_width=s.border_width,
            corner_radius=s.corner_radius,
            padding=theme.spacing.md,
            max_width=s.tooltip_max_width,
            icon_size=s.tooltip_icon_size,
            title_color=c.text_title,
            body_color=c.text_secondary,
            meta_color=c.wood_highlight,
            title_font_size=f.size_body,
            body_font_size=f.size_small,
            fade_duration=a.tooltip_fade,
            alpha=a.tooltip_alpha,
            offset_x=theme.spacing.lg,
            offset_y=theme.spacing.lg,
        )


@dataclass(slots=True)
class WindowStyle:
    """Visual style for Window widgets."""

    background: ColorTuple = (78, 48, 28)
    header_color: ColorTuple = (62, 39, 23)
    border_color: ColorTuple = (40, 24, 14)
    border_highlight: ColorTuple = (133, 88, 48)
    title_color: ColorTuple = (255, 220, 140)
    shadow_color: ColorAlpha = (0, 0, 0, 120)
    border_width: int = 3
    corner_radius: int = 10
    padding: int = 16
    title_height: int = 28
    close_size: int = 20
    shadow_offset: int = 6
    min_width: int = 200
    min_height: int = 150
    resize_handle: int = 12
    title_font_size: int = 16
    fade_in: float = 0.18
    fade_out: float = 0.14
    scale_in: float = 0.20
    scale_from: float = 0.85
    scale_to: float = 1.0

    @classmethod
    def from_theme(cls, theme: Theme = DEFAULT_THEME) -> WindowStyle:
        """Build a WindowStyle from a Theme instance."""
        c = theme.colors
        s = theme.sizes
        a = theme.animations
        return cls(
            background=c.panel_bg,
            header_color=c.wood_dark,
            border_color=c.border_dark,
            border_highlight=c.wood_light,
            title_color=c.text_title,
            shadow_color=c.shadow,
            border_width=s.border_width_thick,
            corner_radius=s.corner_radius_lg,
            padding=theme.spacing.window_padding,
            title_height=s.window_title_height,
            close_size=s.window_close_size,
            shadow_offset=s.window_shadow_offset,
            min_width=s.window_min_width,
            min_height=s.window_min_height,
            resize_handle=s.window_resize_handle,
            title_font_size=theme.fonts.size_medium,
            fade_in=a.fade_in,
            fade_out=a.fade_out,
            scale_in=a.scale_in,
            scale_from=a.window_open_scale_from,
            scale_to=a.window_open_scale_to,
        )


@dataclass(slots=True)
class GridStyle:
    """Layout tokens for the Grid layout manager."""

    gap: int = 6
    padding: int = 8
    default_alignment: str = "stretch"  # start | center | end | stretch

    @classmethod
    def from_theme(cls, theme: Theme = DEFAULT_THEME) -> GridStyle:
        """Build a GridStyle from a Theme instance."""
        return cls(
            gap=theme.spacing.grid_gap,
            padding=theme.spacing.md,
        )


@dataclass(slots=True)
class UIStyles:
    """
    Bundle of all widget styles derived from a single Theme.

    Pass this object (or individual styles) into widgets so visuals stay
    consistent and data-driven.
    """

    theme: Theme = field(default_factory=Theme.default)
    button: ButtonStyle = field(default_factory=ButtonStyle)
    panel: PanelStyle = field(default_factory=PanelStyle)
    label: LabelStyle = field(default_factory=LabelStyle)
    progress_health: ProgressBarStyle = field(default_factory=ProgressBarStyle)
    progress_energy: ProgressBarStyle = field(default_factory=ProgressBarStyle)
    progress_hunger: ProgressBarStyle = field(default_factory=ProgressBarStyle)
    progress_thirst: ProgressBarStyle = field(default_factory=ProgressBarStyle)
    progress_xp: ProgressBarStyle = field(default_factory=ProgressBarStyle)
    slot: SlotStyle = field(default_factory=SlotStyle)
    tooltip: TooltipStyle = field(default_factory=TooltipStyle)
    window: WindowStyle = field(default_factory=WindowStyle)
    grid: GridStyle = field(default_factory=GridStyle)

    @classmethod
    def from_theme(cls, theme: Theme | None = None) -> UIStyles:
        """
        Construct a full style sheet from a Theme.

        Args:
            theme: Theme to derive from; uses DEFAULT_THEME when None.

        Returns:
            Fully populated UIStyles instance.
        """
        t = theme or DEFAULT_THEME
        return cls(
            theme=t,
            button=ButtonStyle.from_theme(t),
            panel=PanelStyle.from_theme(t),
            label=LabelStyle.from_theme(t),
            progress_health=ProgressBarStyle.health(t),
            progress_energy=ProgressBarStyle.energy(t),
            progress_hunger=ProgressBarStyle.hunger(t),
            progress_thirst=ProgressBarStyle.thirst(t),
            progress_xp=ProgressBarStyle.xp(t),
            slot=SlotStyle.from_theme(t),
            tooltip=TooltipStyle.from_theme(t),
            window=WindowStyle.from_theme(t),
            grid=GridStyle.from_theme(t),
        )

    def with_button(self, **overrides: object) -> UIStyles:
        """
        Return a copy with ButtonStyle fields overridden.

        Useful for green confirm vs red cancel buttons without new themes.
        """
        return replace(self, button=replace(self.button, **overrides))  # type: ignore[arg-type]


# Module-level default styles for quick prototyping.
DEFAULT_STYLES: UIStyles = UIStyles.from_theme(DEFAULT_THEME)
