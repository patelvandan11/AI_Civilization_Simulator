"""
RL agent status panel — current agent, state, action, observation.
"""

from __future__ import annotations

from typing import Any

import pygame

from ui.styles import DEFAULT_STYLES
from ui.theme import Theme
from ui.widgets.label import Label
from ui.widgets.panel import Panel


class AgentPanel(Panel):
    """
    Shows live RL agent fields for debugging.
    """

    def __init__(
        self,
        *,
        x: float = 0.0,
        y: float = 0.0,
        theme: Theme | None = None,
    ) -> None:
        """Create agent panel with placeholder labels."""
        t = theme or DEFAULT_STYLES.theme
        super().__init__(
            x=x,
            y=y,
            width=280,
            height=200,
            title="Agent",
            theme=t,
            name="AgentPanel",
        )
        self._lines = {
            "agent": Label("Agent: —", width=250, height=18, theme=t),
            "state": Label("State: —", width=250, height=18, theme=t),
            "action": Label("Action: —", width=250, height=18, theme=t),
            "obs": Label("Obs: —", width=250, height=36, theme=t),
            "episode": Label("Episode: 0", width=250, height=18, theme=t),
        }
        for label in self._lines.values():
            self.add_child(label)
        self._layout_labels()

    def _layout_labels(self) -> None:
        """Stack labels in content area."""
        c = self.content_rect
        y = c.y
        for label in self._lines.values():
            label.set_position(c.x, y)
            label.set_size(c.width, label.height)
            y += label.height + 4

    def update_agent(self, data: dict[str, Any]) -> None:
        """
        Refresh displayed fields.

        Args:
            data: Keys agent, state, action, observation, episode.
        """
        self._lines["agent"].text = f"Agent: {data.get('agent', '—')}"
        self._lines["state"].text = f"State: {data.get('state', '—')}"
        self._lines["action"].text = f"Action: {data.get('action', '—')}"
        obs = str(data.get("observation", "—"))
        self._lines["obs"].text = f"Obs: {obs[:60]}"
        self._lines["episode"].text = f"Episode: {data.get('episode', 0)}"
        self._layout_labels()

    def set_position(self, x: float, y: float) -> None:
        """Move and relayout."""
        super().set_position(x, y)
        self._layout_labels()
