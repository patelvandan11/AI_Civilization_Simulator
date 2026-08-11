"""
Central audio bus for UI and gameplay sounds.

Resolves logical sound keys to files under assets/audio/. Missing files
are silent no-ops so the game runs without assets.
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional

import pygame


class AudioBus:
    """
    Thin wrapper around pygame.mixer with keyed playback and volume channels.
    """

    def __init__(self, root: Path | None = None) -> None:
        """
        Initialize mixer if available.

        Args:
            root: Project root containing ``assets/audio``.
        """
        self.root = root or Path(__file__).resolve().parents[1]
        self.audio_dir = self.root / "assets" / "audio"
        self.audio_dir.mkdir(parents=True, exist_ok=True)
        self._sounds: dict[str, pygame.mixer.Sound] = {}
        self._enabled = False
        self.master_volume = 0.7
        self.ui_volume = 0.8
        self.sfx_volume = 0.8
        try:
            if not pygame.mixer.get_init():
                pygame.mixer.init(frequency=44100, size=-16, channels=2, buffer=512)
            self._enabled = True
        except pygame.error:
            self._enabled = False

        # Logical key → relative filename (optional assets)
        self._map = {
            "ui_hover": "ui_hover.wav",
            "ui_click": "ui_click.wav",
            "ui_open": "ui_open.wav",
            "ui_close": "ui_close.wav",
            "craft": "craft.wav",
            "harvest": "harvest.wav",
            "build": "build.wav",
            "error": "error.wav",
        }

    @property
    def enabled(self) -> bool:
        """True if mixer initialized."""
        return self._enabled

    def play(self, key: str, *, ui: bool = True) -> None:
        """
        Play a sound by logical key.

        Args:
            key: Key from the internal map.
            ui: Use UI volume channel scaling.
        """
        if not self._enabled:
            return
        sound = self._load(key)
        if sound is None:
            return
        vol = self.master_volume * (self.ui_volume if ui else self.sfx_volume)
        sound.set_volume(max(0.0, min(1.0, vol)))
        sound.play()

    def _load(self, key: str) -> Optional[pygame.mixer.Sound]:
        """Load and cache a sound; return None if file missing."""
        if key in self._sounds:
            return self._sounds[key]
        filename = self._map.get(key)
        if not filename:
            return None
        path = self.audio_dir / filename
        if not path.exists():
            return None
        try:
            sound = pygame.mixer.Sound(str(path))
        except pygame.error:
            return None
        self._sounds[key] = sound
        return sound

    def set_master_volume(self, volume: float) -> None:
        """Set master volume 0–1."""
        self.master_volume = max(0.0, min(1.0, volume))
