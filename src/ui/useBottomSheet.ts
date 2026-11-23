import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { SHEET_DEFAULT_RATIO, setSheetRatio } from "./sheetView";

const PHONE_QUERY = "(max-width: 859px) and (max-aspect-ratio: 4/5)";
const STOPS = [0.28, SHEET_DEFAULT_RATIO, 0.92];
const DEFAULT_STOP = 1;
/** The camera stops making room past this, so the object does not leave the screen. */
const MAX_CAMERA_RATIO = 0.6;
const CLOSE_BELOW = 0.2;
const SETTLE_MS = 260;
const DRAG_THRESHOLD = 6;
const FLICK_MS = 130;
const NO_DRAG = "input, textarea, select, .term, .icon-button";

/** Makes a panel a drawer on upright phones: drag it, flick it or pull it down to close. */
export function useBottomSheet(panel: RefObject<HTMLElement | null>, onClose: () => void) {
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useLayoutEffect(() => {
    const element = panel.current;
    if (!element) return;
    const body = element.querySelector<HTMLElement>(".panel-body")!;
    const handle = element.querySelector<HTMLElement>(".sheet-handle")!;
    const query = window.matchMedia(PHONE_QUERY);
    let stop = DEFAULT_STOP;
    let timer = 0;
    let gesture: { startY: number; startVisible: number; lastY: number; lastTime: number; speed: number; moved: boolean } | null = null;
    let suppressClick = false;

    const screen = () => element.parentElement?.clientHeight || window.innerHeight;
    const full = () => screen() * STOPS[STOPS.length - 1];
    const visibleNow = () => full() - new DOMMatrixReadOnly(getComputedStyle(element).transform).m42;
    const moveTo = (visible: number) => element.style.setProperty("--sheet-y", `${full() - visible}px`);

    const fitBody = (visible: number) => {
      element.style.setProperty("--sheet-visible", `${visible}px`);
      element.style.setProperty("--sheet-body", `${Math.max(0, visible - body.offsetTop)}px`);
      element.classList.remove("is-moving", "is-settling");
    };

    const layout = () => {
      window.clearTimeout(timer);
      element.classList.remove("is-moving", "is-settling");
      if (!query.matches) {
        ["--sheet-y", "--sheet-full", "--sheet-visible", "--sheet-body"].forEach((name) => element.style.removeProperty(name));
        return;
      }
      element.style.setProperty("--sheet-full", `${full()}px`);
      const visible = screen() * STOPS[stop];
      moveTo(visible);
      fitBody(visible);
    };

    const settle = (next: number) => {
      stop = next;
      const visible = screen() * STOPS[next];
      element.classList.add("is-moving", "is-settling");
      moveTo(visible);
      setSheetRatio(Math.min(STOPS[next], MAX_CAMERA_RATIO));
      window.clearTimeout(timer);
      timer = window.setTimeout(() => fitBody(visible), SETTLE_MS);
    };

    const dismiss = () => {
      element.classList.add("is-moving", "is-settling");
      moveTo(0);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => close.current(), SETTLE_MS);
    };

    const begin = (y: number) => {
      window.clearTimeout(timer);
      const startVisible = visibleNow();
      element.classList.remove("is-settling");
      moveTo(startVisible);
      gesture = { startY: y, startVisible, lastY: y, lastTime: performance.now(), speed: 0, moved: false };
    };

    const drag = (y: number) => {
      if (!gesture) return;
      if (!gesture.moved && Math.abs(y - gesture.startY) < DRAG_THRESHOLD) return;
      gesture.moved = true;
      element.classList.add("is-moving");
      const now = performance.now();
      if (now > gesture.lastTime) gesture.speed = (y - gesture.lastY) / (now - gesture.lastTime);
      gesture.lastY = y;
      gesture.lastTime = now;
      moveTo(Math.min(full(), Math.max(0, gesture.startVisible + gesture.startY - y)));
    };

    const finish = () => {
      if (!gesture) return;
      const { moved, speed, lastY, startY, startVisible } = gesture;
      gesture = null;
      if (!moved) {
        layout();
        return;
      }
      suppressClick = true;
      window.setTimeout(() => (suppressClick = false), 0);
      const landing = (startVisible + startY - lastY - speed * FLICK_MS) / screen();
      if (landing < CLOSE_BELOW) {
        dismiss();
        return;
      }
      let nearest = 0;
      STOPS.forEach((value, index) => {
        if (Math.abs(value - landing) < Math.abs(STOPS[nearest] - landing)) nearest = index;
      });
      settle(nearest);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!query.matches || event.button !== 0) return;
      const target = event.target as Element;
      if (target.closest(".icon-button") || !target.closest(".panel-head, .sheet-handle")) return;
      element.setPointerCapture(event.pointerId);
      begin(event.clientY);
    };
    const onPointerMove = (event: PointerEvent) => drag(event.clientY);

    /** Inside the text, the drawer moves first and the page scrolls once it can't. */
    let touch: { x: number; y: number; decided: boolean } | null = null;
    const onTouchStart = (event: TouchEvent) => {
      const target = event.target as Element;
      touch = query.matches && event.touches.length === 1 && body.contains(target) && !target.closest(NO_DRAG) ? { x: event.touches[0].clientX, y: event.touches[0].clientY, decided: false } : null;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (!touch) return;
      const point = event.touches[0];
      if (!touch.decided) {
        const dx = point.clientX - touch.x;
        const dy = point.clientY - touch.y;
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        const pullsDown = dy > 0 && body.scrollTop <= 0;
        const growsUp = dy < 0 && stop < STOPS.length - 1;
        if (Math.abs(dy) <= Math.abs(dx) || !(pullsDown || growsUp)) {
          touch = null;
          return;
        }
        touch.decided = true;
        begin(touch.y);
      }
      event.preventDefault();
      drag(point.clientY);
    };
    const onTouchEnd = () => {
      if (touch?.decided) finish();
      touch = null;
    };

    const onHandleClick = () => {
      if (!suppressClick && query.matches) settle(stop === DEFAULT_STOP ? STOPS.length - 1 : DEFAULT_STOP);
    };
    const onHandleKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowUp" && stop < STOPS.length - 1) settle(stop + 1);
      else if (event.key === "ArrowDown" && stop > 0) settle(stop - 1);
      else return;
      event.preventDefault();
    };

    layout();
    setSheetRatio(SHEET_DEFAULT_RATIO);
    element.addEventListener("pointerdown", onPointerDown);
    element.addEventListener("pointermove", onPointerMove);
    element.addEventListener("pointerup", finish);
    element.addEventListener("pointercancel", finish);
    element.addEventListener("touchstart", onTouchStart, { passive: true });
    element.addEventListener("touchmove", onTouchMove, { passive: false });
    element.addEventListener("touchend", onTouchEnd);
    element.addEventListener("touchcancel", onTouchEnd);
    handle.addEventListener("click", onHandleClick);
    handle.addEventListener("keydown", onHandleKey);
    window.addEventListener("resize", layout);
    query.addEventListener("change", layout);
    return () => {
      window.clearTimeout(timer);
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerup", finish);
      element.removeEventListener("pointercancel", finish);
      element.removeEventListener("touchstart", onTouchStart);
      element.removeEventListener("touchmove", onTouchMove);
      element.removeEventListener("touchend", onTouchEnd);
      element.removeEventListener("touchcancel", onTouchEnd);
      handle.removeEventListener("click", onHandleClick);
      handle.removeEventListener("keydown", onHandleKey);
      window.removeEventListener("resize", layout);
      query.removeEventListener("change", layout);
      setSheetRatio(SHEET_DEFAULT_RATIO);
    };
  }, [panel]);
}
