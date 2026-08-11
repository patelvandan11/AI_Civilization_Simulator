"""
Game clock: day/night cycle with configurable speed multipliers.

Crop growth uses real UTC time separately; this clock drives HUD and
game-time build progress.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import ClassVar


# Seconds of game-time that make up one full day (24 game hours).
SECONDS_PER_GAME_DAY: int = 24 * 60  # 1440 game-seconds per day at 1x feel
SECONDS_PER_GAME_HOUR: int = 60


@dataclass(slots=True)
class GameClock:
    """
    In-game timeline with speed control.

    Attributes:
        total_seconds: Accumulated game-time seconds since day 1 00:00.
        speed: Multiplier applied to real dt (1, 10, or 60).
        weather: Simple weather label for HUD.
    """

    total_seconds: float = 8 * SECONDS_PER_GAME_HOUR  # start mid-morning
    speed: int = 1
    weather: str = "Clear"


    _ALLOWED_SPEEDS: ClassVar[tuple[int, ...]] = (1,2,4,8)

    def update(self, real_dt: float) -> None:
        """
        Advance game time by real delta * speed.

        Args:
            real_dt: Real seconds since last frame.
        """
        if real_dt <= 0:
            return
        self.total_seconds += real_dt * float(self.speed)

    @property
    def day(self) -> int:
        """1-based day number."""
        return int(self.total_seconds // SECONDS_PER_GAME_DAY) + 1

    @property
    def time_of_day_seconds(self) -> float:
        """Seconds elapsed within the current game day."""
        return self.total_seconds % SECONDS_PER_GAME_DAY

    @property
    def hour(self) -> int:
        """Hour of day 0–23."""
        return int(self.time_of_day_seconds // SECONDS_PER_GAME_HOUR) % 24

    @property
    def minute(self) -> int:
        """Minute 0–59 (each game-hour has 60 game-seconds → 1 sec = 1 min)."""
        return int(self.time_of_day_seconds % SECONDS_PER_GAME_HOUR)

    @property
    def is_night(self) -> bool:
        """True during night hours (20:00–05:59)."""
        return self.hour >= 20 or self.hour < 6

    def format_clock(self) -> str:
        """
        Human-readable clock string.

        Returns:
            e.g. ``Day 3  14:05``.
        """
        return f"Day {self.day}  {self.hour:02d}:{self.minute:02d}"

    def cycle_speed(self) -> int:
        """
        Rotate speed through 1x → 10x → 60x → 1x.

        Returns:
            New speed value.
        """
        idx = self._ALLOWED_SPEEDS.index(self.speed) if self.speed in self._ALLOWED_SPEEDS else 0
        self.speed = self._ALLOWED_SPEEDS[(idx + 1) % len(self._ALLOWED_SPEEDS)]
        return self.speed

    def set_speed(self, speed: int) -> None:
        """
        Set speed if allowed.

        Args:
            speed: One of 1, 10, 60.
        """
        if speed in self._ALLOWED_SPEEDS:
            self.speed = speed

    def to_dict(self) -> dict[str, float | int | str]:
        """Serialize clock state."""
        return {
            "total_seconds": self.total_seconds,
            "speed": self.speed,
            "weather": self.weather,
        }

    @classmethod
    def from_dict(cls, data: dict | None) -> GameClock:
        """
        Restore clock from save data.

        Args:
            data: Raw dict or None for defaults.

        Returns:
            GameClock instance.
        """
        if not data:
            return cls()
        clock = cls(
            total_seconds=float(data.get("total_seconds", 8 * SECONDS_PER_GAME_HOUR)),
            speed=int(data.get("speed", 1)),
            weather=str(data.get("weather", "Clear")),
        )
        if clock.speed not in cls._ALLOWED_SPEEDS:
            clock.speed = 1
        return clock
