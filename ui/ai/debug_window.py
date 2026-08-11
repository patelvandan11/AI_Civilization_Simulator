"""
Floating AI debug window composing agent + reward panels.
"""

from __future__ import annotations

from typing import Any, Callable

from ui.ai.agent_panel import AgentPanel
from ui.ai.reward_panel import RewardPanel
from ui.styles import DEFAULT_STYLES
from ui.theme import Theme
from ui.widgets.window import Window


class AIDebugWindow(Window):
    """
    Draggable debug window for RL training inspection.
    """

    def __init__(
        self,
        *,
        x: float = 40.0,
        y: float = 60.0,
        theme: Theme | None = None,
        on_close: Callable[[], None] | None = None,
    ) -> None:
        """Create AI debug window with nested panels."""
        t = theme or DEFAULT_STYLES.theme
        super().__init__(
            title="AI Debug",
            x=x,
            y=y,
            width=320,
            height=420,
            theme=t,
            on_close=on_close,
            resizable=True,
            name="AIDebugWindow",
        )
        self.agent_panel = AgentPanel(theme=t)
        self.reward_panel = RewardPanel(theme=t)
        self.add_child(self.agent_panel)
        self.add_child(self.reward_panel)
        self._place_panels()

        # Simulated agent state (replace with real RL hook later)
        self.episode = 0
        self.total_reward = 0.0
        self.step_reward = 0.0
        self.train_speed = 1.0
        self.agent_name = "SettlerPPO"
        self.state_name = "idle"
        self.last_action = "none"
        self.observation = "hp=1.0 energy=1.0"

    def _place_panels(self) -> None:
        """Stack panels in content area."""
        c = self.content_rect
        self.agent_panel.set_position(c.x, c.y)
        self.agent_panel.set_size(c.width, 200)
        self.reward_panel.set_position(c.x, c.y + 210)
        self.reward_panel.set_size(c.width, 140)

    def set_size(self, width: float, height: float) -> None:
        """Resize and relayout children."""
        super().set_size(width, height)
        self._place_panels()

    def set_position(self, x: float, y: float) -> None:
        """Move and relayout."""
        super().set_position(x, y)
        self._place_panels()

    def tick_sim(self, dt: float) -> None:
        """
        Advance a lightweight fake RL signal for UI demo.

        Args:
            dt: Delta seconds.
        """
        self.step_reward = 0.05 * (0.5 - (self.episode % 10) * 0.02)
        self.total_reward += self.step_reward * dt * 10 * self.train_speed
        if self.total_reward > 10:
            self.episode += 1
            self.total_reward = 0.0
            self.state_name = ("idle", "gather", "farm", "craft", "explore")[self.episode % 5]
            self.last_action = ("move", "chop", "plant", "build", "wait")[self.episode % 5]
        self.observation = f"day_prog={self.episode % 24} state={self.state_name}"
        self.refresh_ui()

    def refresh_ui(self) -> None:
        """Push current fields into child panels."""
        self.agent_panel.update_agent(
            {
                "agent": self.agent_name,
                "state": self.state_name,
                "action": self.last_action,
                "observation": self.observation,
                "episode": self.episode,
            }
        )
        self.reward_panel.update_reward(
            self.total_reward,
            self.step_reward,
            self.train_speed,
        )

    def apply_data(self, data: dict[str, Any]) -> None:
        """
        Apply real RL trainer payload.

        Args:
            data: Agent debug dictionary.
        """
        self.agent_name = str(data.get("agent", self.agent_name))
        self.state_name = str(data.get("state", self.state_name))
        self.last_action = str(data.get("action", self.last_action))
        self.observation = str(data.get("observation", self.observation))
        self.episode = int(data.get("episode", self.episode))
        self.total_reward = float(data.get("total_reward", self.total_reward))
        self.step_reward = float(data.get("step_reward", self.step_reward))
        self.train_speed = float(data.get("train_speed", self.train_speed))
        self.refresh_ui()
