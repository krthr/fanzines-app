export interface DragState {
  active: boolean;
  pageIndex: number;
  textId: string;
  startPointerX: number;
  startPointerY: number;
  startX: number;
  startY: number;
}

export function useDragText(isRotated: (index: number) => boolean) {
  const drag = ref<DragState | null>(null);
  const isDragging = computed(() => drag.value?.active ?? false);

  function startDrag(
    event: PointerEvent,
    pageIndex: number,
    textId: string,
    currentX: number,
    currentY: number,
  ): void {
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    drag.value = {
      active: true,
      pageIndex,
      textId,
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startX: currentX,
      startY: currentY,
    };
  }

  function onPointerMove(
    event: PointerEvent,
    cellRect: DOMRect,
  ): { x: number; y: number; pageIndex: number; textId: string } | null {
    if (!drag.value?.active) return null;

    let deltaX = event.clientX - drag.value.startPointerX;
    let deltaY = event.clientY - drag.value.startPointerY;

    // For rotated cells (top row), the content is flipped 180°
    // so pointer movement must be inverted
    if (isRotated(drag.value.pageIndex)) {
      deltaX = -deltaX;
      deltaY = -deltaY;
    }

    // Convert pixel deltas to percentage of cell size
    const pctX = (deltaX / cellRect.width) * 100;
    const pctY = (deltaY / cellRect.height) * 100;

    const x = Math.max(5, Math.min(95, drag.value.startX + pctX));
    const y = Math.max(5, Math.min(95, drag.value.startY + pctY));

    return {
      x,
      y,
      pageIndex: drag.value.pageIndex,
      textId: drag.value.textId,
    };
  }

  function endDrag(): { pageIndex: number; textId: string } | null {
    if (!drag.value?.active) return null;
    const result = {
      pageIndex: drag.value.pageIndex,
      textId: drag.value.textId,
    };
    drag.value = null;
    return result;
  }

  return {
    drag,
    isDragging,
    startDrag,
    onPointerMove,
    endDrag,
  };
}
