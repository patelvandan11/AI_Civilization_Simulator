"""
Grid layout manager — automatic arrangement of UI widgets.

No manual positioning: place children into cells; the Grid computes
positions from rows, columns, spacing, padding, and alignment.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum, auto
from typing import Iterator, Sequence

import pygame

from ui.styles import DEFAULT_STYLES, GridStyle
from ui.theme import Theme
from ui.widgets.base import Widget


class Align(Enum):
    """Cell content alignment along an axis."""

    START = auto()
    CENTER = auto()
    END = auto()
    STRETCH = auto()


@dataclass(slots=True)
class GridItem:
    """
    Placement metadata for a widget inside a Grid.

    Attributes:
        widget: The child widget.
        row: Zero-based row index.
        column: Zero-based column index.
        row_span: Number of rows spanned (>= 1).
        column_span: Number of columns spanned (>= 1).
        h_align: Horizontal alignment inside the cell.
        v_align: Vertical alignment inside the cell.
        margin: Extra logical margin (left, top, right, bottom).
    """

    widget: Widget
    row: int = 0
    column: int = 0
    row_span: int = 1
    column_span: int = 1
    h_align: Align = Align.STRETCH
    v_align: Align = Align.STRETCH
    margin: tuple[int, int, int, int] = (0, 0, 0, 0)


class Grid(Widget):
    """
    Responsive grid layout that positions children automatically.

    Supports fixed or auto-sized rows/columns, spacing, padding,
    per-cell alignment, and spanning. Call ``relayout()`` after
    adding items or when the grid size changes.
    """

    def __init__(
        self,
        columns: int = 1,
        rows: int = 0,
        *,
        x: float = 0.0,
        y: float = 0.0,
        width: float = 0.0,
        height: float = 0.0,
        style: GridStyle | None = None,
        theme: Theme | None = None,
        column_weights: Sequence[float] | None = None,
        row_weights: Sequence[float] | None = None,
        h_align: Align = Align.STRETCH,
        v_align: Align = Align.STRETCH,
        name: str = "Grid",
        visible: bool = True,
    ) -> None:
        """
        Create a Grid layout.

        Args:
            columns: Number of columns (>= 1).
            rows: Number of rows; 0 means grow automatically as items are added.
            x: Logical left.
            y: Logical top.
            width: Logical width (0 = shrink-wrap preferred sizes).
            height: Logical height (0 = shrink-wrap preferred sizes).
            style: GridStyle for gap / padding defaults.
            theme: Optional Theme injection.
            column_weights: Relative width weights per column (default equal).
            row_weights: Relative height weights per row (default equal).
            h_align: Default horizontal cell alignment.
            v_align: Default vertical cell alignment.
            name: Debug name.
            visible: Initial visibility.
        """
        if columns < 1:
            raise ValueError("Grid requires at least 1 column")

        self.style: GridStyle = style or DEFAULT_STYLES.grid
        self._columns: int = columns
        self._rows: int = max(0, rows)
        self._auto_rows: bool = rows <= 0
        self._items: list[GridItem] = []
        self._default_h_align = h_align
        self._default_v_align = v_align

        self._column_weights: list[float] = (
            list(column_weights)
            if column_weights is not None
            else [1.0] * columns
        )
        if len(self._column_weights) != columns:
            raise ValueError("column_weights length must match columns")

        # Row weights grow with auto rows.
        initial_rows = max(1, rows) if rows > 0 else 1
        self._row_weights: list[float] = (
            list(row_weights)
            if row_weights is not None
            else [1.0] * initial_rows
        )

        # Gap / padding from style (logical pixels)
        self._gap: int = self.style.gap
        self._padding: int = self.style.padding

        t = theme or DEFAULT_STYLES.theme
        super().__init__(
            x,
            y,
            width,
            height,
            theme=t,
            visible=visible,
            enabled=True,
            name=name,
            layer=t.layers.panels,
        )

    # ------------------------------------------------------------------
    # Configuration
    # ------------------------------------------------------------------

    @property
    def columns(self) -> int:
        """Number of columns."""
        return self._columns

    @property
    def rows(self) -> int:
        """Current number of rows (computed when auto)."""
        return self._ensure_row_count()

    @property
    def gap(self) -> int:
        """Logical gap between cells."""
        return self._gap

    @gap.setter
    def gap(self, value: int) -> None:
        """Set cell gap and mark dirty."""
        self._gap = max(0, value)
        self._dirty = True

    @property
    def padding(self) -> int:
        """Logical padding inside the grid bounds."""
        return self._padding

    @padding.setter
    def padding(self, value: int) -> None:
        """Set padding and mark dirty."""
        self._padding = max(0, value)
        self._dirty = True

    @property
    def items(self) -> Sequence[GridItem]:
        """Read-only view of placed items."""
        return tuple(self._items)

    def set_column_weights(self, weights: Sequence[float]) -> None:
        """
        Replace column weight distribution.

        Args:
            weights: One positive weight per column.
        """
        if len(weights) != self._columns:
            raise ValueError("weights length must match columns")
        self._column_weights = [max(0.0, w) for w in weights]
        self._dirty = True

    def set_row_weights(self, weights: Sequence[float]) -> None:
        """
        Replace row weight distribution.

        Args:
            weights: One positive weight per row.
        """
        self._row_weights = [max(0.0, w) for w in weights]
        self._rows = len(self._row_weights)
        self._auto_rows = False
        self._dirty = True

    # ------------------------------------------------------------------
    # Item management
    # ------------------------------------------------------------------

    def add(
        self,
        widget: Widget,
        row: int | None = None,
        column: int | None = None,
        *,
        row_span: int = 1,
        column_span: int = 1,
        h_align: Align | None = None,
        v_align: Align | None = None,
        margin: tuple[int, int, int, int] = (0, 0, 0, 0),
    ) -> Widget:
        """
        Place a widget into the grid.

        Args:
            widget: Child to manage.
            row: Target row; None appends to the next free cell (row-major).
            column: Target column; required if row is set, else auto.
            row_span: Rows spanned.
            column_span: Columns spanned.
            h_align: Horizontal alignment override.
            v_align: Vertical alignment override.
            margin: Extra (left, top, right, bottom) logical margin.

        Returns:
            The same widget (fluent API).
        """
        if row is None:
            row, column = self._next_free_cell()
        elif column is None:
            raise ValueError("column is required when row is specified")

        if column < 0 or column >= self._columns:
            raise ValueError(f"column {column} out of range 0..{self._columns - 1}")
        if row < 0:
            raise ValueError("row must be >= 0")
        if row_span < 1 or column_span < 1:
            raise ValueError("spans must be >= 1")
        if column + column_span > self._columns:
            raise ValueError("column_span exceeds grid columns")

        item = GridItem(
            widget=widget,
            row=row,
            column=column,
            row_span=row_span,
            column_span=column_span,
            h_align=h_align or self._default_h_align,
            v_align=v_align or self._default_v_align,
            margin=margin,
        )
        self._items.append(item)
        self.add_child(widget)
        self._dirty = True
        self.relayout()
        return widget

    def add_row(self, widgets: Sequence[Widget], **kwargs: object) -> None:
        """
        Add a full row of widgets into consecutive columns.

        Args:
            widgets: Widgets for columns 0..n-1 (must fit in ``columns``).
            **kwargs: Forwarded to each ``add`` (alignment, margin, etc.).
        """
        if len(widgets) > self._columns:
            raise ValueError("Too many widgets for grid columns")
        row = self._ensure_row_count()
        # If current last row has items, use next row index.
        if self._items:
            row = max(it.row + it.row_span for it in self._items)
        for col, widget in enumerate(widgets):
            self.add(widget, row=row, column=col, **kwargs)  # type: ignore[arg-type]

    def remove_item(self, widget: Widget) -> None:
        """
        Remove a widget from the grid.

        Args:
            widget: Previously added widget.
        """
        self._items = [it for it in self._items if it.widget is not widget]
        self.remove_child(widget)
        self._dirty = True
        self.relayout()

    def clear(self) -> None:
        """Remove all items and children."""
        self._items.clear()
        self.clear_children()
        self._dirty = True

    def _next_free_cell(self) -> tuple[int, int]:
        """
        Find the next empty cell in row-major order.

        Returns:
            (row, column) of the first unoccupied cell.
        """
        occupied = self._occupied_set()
        row = 0
        while True:
            for col in range(self._columns):
                if (row, col) not in occupied:
                    return row, col
            row += 1

    def _occupied_set(self) -> set[tuple[int, int]]:
        """Return the set of (row, col) cells covered by existing items."""
        cells: set[tuple[int, int]] = set()
        for it in self._items:
            for r in range(it.row, it.row + it.row_span):
                for c in range(it.column, it.column + it.column_span):
                    cells.add((r, c))
        return cells

    def _ensure_row_count(self) -> int:
        """
        Ensure ``_rows`` covers all placed items; grow weights if auto.

        Returns:
            Current row count.
        """
        needed = 1
        if self._items:
            needed = max(it.row + it.row_span for it in self._items)
        if self._auto_rows:
            self._rows = needed
            while len(self._row_weights) < self._rows:
                self._row_weights.append(1.0)
        else:
            self._rows = max(self._rows, needed)
            while len(self._row_weights) < self._rows:
                self._row_weights.append(1.0)
        return self._rows

    # ------------------------------------------------------------------
    # Layout
    # ------------------------------------------------------------------

    def relayout(self) -> None:
        """
        Recompute child positions and sizes from grid rules.

        Safe to call whenever the grid rect, gap, padding, or items change.
        """
        rows = self._ensure_row_count()
        cols = self._columns
        if rows == 0 or cols == 0:
            return

        pad = self._padding
        gap = self._gap

        # Shrink-wrap: if width/height are 0, size from preferred child sizes.
        col_prefs = self._preferred_column_widths()
        row_prefs = self._preferred_row_heights(rows)

        if self.width <= 0:
            self.width = pad * 2 + sum(col_prefs) + gap * max(0, cols - 1)
        if self.height <= 0:
            self.height = pad * 2 + sum(row_prefs) + gap * max(0, rows - 1)

        inner_w = max(0.0, self.width - pad * 2 - gap * max(0, cols - 1))
        inner_h = max(0.0, self.height - pad * 2 - gap * max(0, rows - 1))

        col_widths = self._distribute(inner_w, self._column_weights[:cols], col_prefs)
        row_heights = self._distribute(
            inner_h,
            self._row_weights[:rows],
            row_prefs,
        )

        # Prefix sums for cell origins
        col_xs = [self.x + pad]
        for i, w in enumerate(col_widths[:-1]):
            col_xs.append(col_xs[-1] + w + gap)
        row_ys = [self.y + pad]
        for i, h in enumerate(row_heights[:-1]):
            row_ys.append(row_ys[-1] + h + gap)

        for item in self._items:
            cell_x = col_xs[item.column]
            cell_y = row_ys[item.row]
            cell_w = sum(col_widths[item.column : item.column + item.column_span])
            cell_w += gap * (item.column_span - 1)
            cell_h = sum(row_heights[item.row : item.row + item.row_span])
            cell_h += gap * (item.row_span - 1)

            ml, mt, mr, mb = item.margin
            cell_x += ml
            cell_y += mt
            cell_w = max(0.0, cell_w - ml - mr)
            cell_h = max(0.0, cell_h - mt - mb)

            self._place_in_cell(item, cell_x, cell_y, cell_w, cell_h)

        self._dirty = False
        self._preferred_size = (self.width, self.height)

    def _preferred_column_widths(self) -> list[float]:
        """
        Minimum preferred width per column from child preferred sizes.

        Returns:
            List of preferred widths, one per column.
        """
        widths = [0.0] * self._columns
        for it in self._items:
            if it.column_span != 1:
                # Distribute preferred width across spanned columns.
                pw = it.widget.preferred_size[0] / it.column_span
                for c in range(it.column, it.column + it.column_span):
                    widths[c] = max(widths[c], pw)
            else:
                widths[it.column] = max(widths[it.column], it.widget.preferred_size[0])
        return widths

    def _preferred_row_heights(self, rows: int) -> list[float]:
        """
        Minimum preferred height per row from child preferred sizes.

        Args:
            rows: Row count.

        Returns:
            List of preferred heights, one per row.
        """
        heights = [0.0] * rows
        for it in self._items:
            if it.row_span != 1:
                ph = it.widget.preferred_size[1] / it.row_span
                for r in range(it.row, it.row + it.row_span):
                    if r < rows:
                        heights[r] = max(heights[r], ph)
            else:
                if it.row < rows:
                    heights[it.row] = max(
                        heights[it.row],
                        it.widget.preferred_size[1],
                    )
        return heights

    def _distribute(
        self,
        available: float,
        weights: Sequence[float],
        minimums: Sequence[float],
    ) -> list[float]:
        """
        Distribute ``available`` pixels across tracks by weight, respecting mins.

        Args:
            available: Total inner size to allocate.
            weights: Relative weights per track.
            minimums: Preferred/minimum size per track.

        Returns:
            Final size per track.
        """
        n = len(weights)
        if n == 0:
            return []

        mins = list(minimums) if len(minimums) == n else [0.0] * n
        # Ensure minimums fit; if not, scale them down proportionally.
        min_total = sum(mins)
        if min_total > available and min_total > 0:
            factor = available / min_total
            return [m * factor for m in mins]

        remaining = available - min_total
        weight_sum = sum(weights) or float(n)
        sizes = []
        for w, m in zip(weights, mins):
            extra = remaining * (w / weight_sum) if weight_sum else 0.0
            sizes.append(m + extra)
        return sizes

    def _place_in_cell(
        self,
        item: GridItem,
        cell_x: float,
        cell_y: float,
        cell_w: float,
        cell_h: float,
    ) -> None:
        """
        Position and size a widget inside its cell according to alignment.

        Args:
            item: Grid item metadata.
            cell_x: Cell left (logical).
            cell_y: Cell top (logical).
            cell_w: Cell width (logical).
            cell_h: Cell height (logical).
        """
        widget = item.widget
        pref_w, pref_h = widget.preferred_size
        min_w, min_h = widget.min_size

        # Width
        if item.h_align == Align.STRETCH:
            w = max(min_w, cell_w)
        else:
            w = max(min_w, min(pref_w, cell_w))

        # Height
        if item.v_align == Align.STRETCH:
            h = max(min_h, cell_h)
        else:
            h = max(min_h, min(pref_h, cell_h))

        # Horizontal position
        if item.h_align == Align.START:
            x = cell_x
        elif item.h_align == Align.CENTER:
            x = cell_x + (cell_w - w) / 2
        elif item.h_align == Align.END:
            x = cell_x + cell_w - w
        else:  # STRETCH
            x = cell_x

        # Vertical position
        if item.v_align == Align.START:
            y = cell_y
        elif item.v_align == Align.CENTER:
            y = cell_y + (cell_h - h) / 2
        elif item.v_align == Align.END:
            y = cell_y + cell_h - h
        else:  # STRETCH
            y = cell_y

        widget.set_position(x, y)
        widget.set_size(w, h)

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def set_size(self, width: float, height: float) -> None:
        """
        Resize the grid and relayout children.

        Args:
            width: New logical width.
            height: New logical height.
        """
        super().set_size(width, height)
        self.relayout()

    def set_position(self, x: float, y: float) -> None:
        """
        Move the grid and offset all children accordingly via relayout.

        Args:
            x: New logical left.
            y: New logical top.
        """
        super().set_position(x, y)
        self.relayout()

    def _update(self, dt: float) -> None:
        """
        Relayout if marked dirty (e.g. after style gap change).

        Args:
            dt: Delta time in seconds.
        """
        if self._dirty:
            self.relayout()

    def _draw(self, surface: pygame.Surface) -> None:
        """
        Grid itself is invisible — children provide visuals.

        Args:
            surface: Target surface (unused).
        """
        return

    def __iter__(self) -> Iterator[Widget]:
        """Iterate child widgets in placement order."""
        return (it.widget for it in self._items)
