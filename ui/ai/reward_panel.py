"""
Reward readout panel for RL debugging.
"""

from __future__ import annotations

from ui.styles import DEFAULT_STYLES, ProgressBarStyle
from ui.theme import Theme
from ui.widgets.label import Label
from ui.widgets.panel import Panel
from ui.widgets.progressbar import ProgressBar


class RewardPanel(Panel):
    """
    Displays episode reward, step reward, and a normalized reward bar.
    """

    def __init__(
        self,
        *,
        x: float = 0.0,
        y: float = 0.0,
        theme: Theme | None = None,
    ) -> None:
        """Create reward panel."""
        t = theme or DEFAULT_STYLES.theme
        super().__init__(
            x=x,
            y=y,
            width=280,
            height=140,
            title="Reward",
            theme=t,
            name="RewardPanel",
        )
        self.total_label = Label("Total: 0.00", width=250, height=18, theme=t)
        self.step_label = Label("Step: 0.00", width=250, height=18, theme=t)
        self.speed_label = Label("Train speed: 1x", width=250, height=18, theme=t)
        style = ProgressBarStyle.xp(t)
        self.bar = ProgressBar(width=240, value=0.5, style=style, theme=t, label="Reward")
        for w in (self.total_label, self.step_label, self.speed_label, self.bar):
            self.add_child(w)
        self._layout()

    def _layout(self) -> None:
        """Position children."""
        c = self.content_rect
        self.total_label.set_position(c.x, c.y)
        self.step_label.set_position(c.x, c.y + 22)
        self.speed_label.set_position(c.x, c.y + 44)
        self.bar.set_position(c.x, c.y + 70)
        self.bar.set_size(c.width, 16)

    def update_reward(self, total: float, step: float, speed: float = 1.0) -> None:
        """
        Update reward displays.

        Args:
            total: Episode cumulative reward.
            step: Last step reward.
            speed: Training speed multiplier.
        """
        self.total_label.text = f"Total: {total:.2f}"
        self.step_label.text = f"Step: {step:.2f}"
        self.speed_label.text = f"Train speed: {speed:g}x"
        # Map reward to 0-1 for bar (tanh-ish)
        norm = max(0.0, min(1.0, 0.5 + total / 40.0))
        self.bar.value = norm
        self._layout()

    def set_position(self, x: float, y: float) -> None:
        """Move and relayout."""
        super().set_position(x, y)
        self._layout()
