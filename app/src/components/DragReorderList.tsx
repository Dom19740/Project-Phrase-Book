import { useEffect, useRef, useState, type ReactNode } from 'react'

interface DragHandleProps {
  onPointerDown: (e: React.PointerEvent) => void
}

interface Props<T> {
  items: T[]
  getId: (item: T) => number
  onReorder: (orderedIds: number[]) => void
  renderItem: (item: T, dragHandleProps: DragHandleProps, dragging: boolean) => ReactNode
  className?: string
}

const DEFAULT_ROW_HEIGHT = 56

/** A drag-to-reorder list, scoped to exactly the items passed in — nothing can be dragged out of
 * it, which is what keeps a phrase inside its category/Learnt/Favourites bucket. Position is
 * tracked as slots moved from the drag's start (not incrementally per-move), so fast drags can't
 * drift out of sync with the pointer. */
export function DragReorderList<T>({ items, getId, onReorder, renderItem, className }: Props<T>) {
  const [order, setOrder] = useState<number[]>(() => items.map(getId))
  const orderRef = useRef(order)
  orderRef.current = order

  useEffect(() => {
    setOrder(items.map(getId))
    // Re-sync whenever the underlying items change (sort mode, filters, edits) — only our own
    // in-progress drag should override this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  const itemsById = new Map(items.map((item) => [getId(item), item]))
  const rowRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const dragState = useRef<{ id: number; startIndex: number; startY: number; rowHeight: number } | null>(null)
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [dragOffset, setDragOffset] = useState(0)

  /** Distance from one row's top to the next, gap included — the real per-slot distance, not
   * just the row's own height (which under-measured it and made the drag over-trigger). */
  function measureSlotHeight(id: number): number {
    const rows = orderRef.current
    const index = rows.indexOf(id)
    const el = rowRefs.current.get(id)
    const neighborId = rows[index + 1] ?? rows[index - 1]
    const neighborEl = neighborId != null ? rowRefs.current.get(neighborId) : null
    if (el && neighborEl) return Math.abs(neighborEl.getBoundingClientRect().top - el.getBoundingClientRect().top)
    return el?.offsetHeight || DEFAULT_ROW_HEIGHT
  }

  function handlePointerDown(id: number, e: React.PointerEvent) {
    dragState.current = {
      id,
      startIndex: orderRef.current.indexOf(id),
      startY: e.clientY,
      rowHeight: measureSlotHeight(id),
    }
    setDraggingId(id)
    setDragOffset(0)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent) {
    const drag = dragState.current
    if (!drag) return
    const deltaY = e.clientY - drag.startY
    const slots = Math.round(deltaY / drag.rowHeight)
    const targetIndex = Math.min(Math.max(drag.startIndex + slots, 0), orderRef.current.length - 1)
    // Once a slot's worth of movement has been "spent" reordering the row into its new spot,
    // only the leftover sub-slot distance should still show as a visual offset — otherwise the
    // row's new position (from the reorder) and the full raw pointer delta both apply, so it
    // overshoots further with every slot crossed.
    const consumedSlots = targetIndex - drag.startIndex
    setDragOffset(deltaY - consumedSlots * drag.rowHeight)
    setOrder((prev) => {
      const currentIndex = prev.indexOf(drag.id)
      if (currentIndex === -1 || currentIndex === targetIndex) return prev
      const next = [...prev]
      next.splice(currentIndex, 1)
      next.splice(targetIndex, 0, drag.id)
      return next
    })
  }

  function endDrag() {
    const drag = dragState.current
    dragState.current = null
    setDraggingId(null)
    setDragOffset(0)
    if (drag) onReorder(orderRef.current)
  }

  return (
    <div className={className}>
      {order.map((id) => {
        const item = itemsById.get(id)
        if (!item) return null
        const dragging = draggingId === id
        return (
          <div
            key={id}
            ref={(el) => {
              if (el) rowRefs.current.set(id, el)
              else rowRefs.current.delete(id)
            }}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            style={dragging ? { transform: `translateY(${dragOffset}px)`, position: 'relative', zIndex: 10 } : undefined}
            className={dragging ? 'shadow-xl' : undefined}
          >
            {renderItem(item, { onPointerDown: (e) => handlePointerDown(id, e) }, dragging)}
          </div>
        )
      })}
    </div>
  )
}
