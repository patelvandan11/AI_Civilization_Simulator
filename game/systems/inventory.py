"""
Stack-based inventory for the civilization simulator.

All item ids are data-driven from ``data/items.json``.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterator, Mapping


@dataclass(slots=True)
class Inventory:
    """
    Mutable item stack map: item_id -> count.

    Methods never go negative; remove/add return success flags.
    """

    stacks: dict[str, int] = field(default_factory=dict)
    max_slots: int = 40

    def get(self, item_id: str) -> int:
        """
        Return stack count for an item.

        Args:
            item_id: Item identifier from items.json.

        Returns:
            Non-negative count (0 if missing).
        """
        return max(0, self.stacks.get(item_id, 0))

    def has(self, item_id: str, count: int = 1) -> bool:
        """
        Check whether at least ``count`` of an item exists.

        Args:
            item_id: Item identifier.
            count: Required amount.

        Returns:
            True if inventory has enough.
        """
        return self.get(item_id) >= count

    def can_afford(self, requirements: Mapping[str, int]) -> bool:
        """
        Check whether all requirement stacks are available.

        Args:
            requirements: Mapping of item_id -> needed count.

        Returns:
            True if every requirement is satisfied.
        """
        return all(self.has(item_id, qty) for item_id, qty in requirements.items())

    def add(self, item_id: str, count: int = 1) -> bool:
        """
        Add items to a stack.

        Args:
            item_id: Item identifier.
            count: Amount to add (must be > 0).

        Returns:
            True on success.
        """
        if count <= 0:
            return False
        if item_id not in self.stacks and len(self.stacks) >= self.max_slots:
            # New unique item would exceed slot cap.
            return False
        self.stacks[item_id] = self.get(item_id) + count
        return True

    def remove(self, item_id: str, count: int = 1) -> bool:
        """
        Remove items from a stack.

        Args:
            item_id: Item identifier.
            count: Amount to remove (must be > 0).

        Returns:
            True if removal succeeded.
        """
        if count <= 0 or not self.has(item_id, count):
            return False
        remaining = self.get(item_id) - count
        if remaining <= 0:
            self.stacks.pop(item_id, None)
        else:
            self.stacks[item_id] = remaining
        return True

    def consume(self, requirements: Mapping[str, int]) -> bool:
        """
        Atomically remove a requirement set if affordable.

        Args:
            requirements: Mapping of item_id -> count.

        Returns:
            True if consumed; False leaves inventory unchanged.
        """
        if not self.can_afford(requirements):
            return False
        for item_id, qty in requirements.items():
            self.remove(item_id, qty)
        return True

    def items(self) -> Iterator[tuple[str, int]]:
        """Iterate (item_id, count) pairs sorted by id."""
        for item_id in sorted(self.stacks.keys()):
            yield item_id, self.stacks[item_id]

    def to_dict(self) -> dict[str, int]:
        """Serialize stacks for save files."""
        return dict(self.stacks)

    @classmethod
    def from_dict(cls, data: Mapping[str, int] | None, max_slots: int = 40) -> Inventory:
        """
        Deserialize an inventory from save data.

        Args:
            data: Raw stack mapping, or None for empty.
            max_slots: Slot capacity.

        Returns:
            Inventory instance.
        """
        stacks = {str(k): int(v) for k, v in (data or {}).items() if int(v) > 0}
        return cls(stacks=stacks, max_slots=max_slots)



def starter_inventory() -> Inventory:
    """
    Bootstrap kit for a new city builder save.

    Gives just enough resources to craft one campfire immediately so players
    have a clear first goal.  Everything else must be gathered.

    Returns:
        Inventory with minimal starter materials.
    """
    inv = Inventory()
    starter = {
        "wood":  15,
        "stone": 10,
        "fiber":  8,
    }
    for item_id, qty in starter.items():
        inv.add(item_id, qty)
    return inv

