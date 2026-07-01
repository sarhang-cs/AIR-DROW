export class TouchEngine {
  constructor(stage, callbacks, guard) {
    this.stage = stage;
    this.callbacks = callbacks;
    this.guard = guard;
    this.enabled = true;
    this.pointers = new Map();
    this.primaryId = null;
    this.isDrawing = false;
    this.pendingTouch = null;
    this.gesture = null;

    stage.addEventListener("pointerdown", event => this.onDown(event), { passive: false });
    stage.addEventListener("pointermove", event => this.onMove(event), { passive: false });
    stage.addEventListener("pointerup", event => this.onUp(event), { passive: false });
    stage.addEventListener("pointercancel", event => this.onUp(event), { passive: false });
    stage.addEventListener("lostpointercapture", event => this.onUp(event), { passive: false });
    stage.addEventListener("wheel", event => this.onWheel(event), { passive: false });
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) this.finishStroke();
  }

  point(event) {
    const rect = this.stage.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      pressure: Number.isFinite(event.pressure) && event.pressure > 0 ? event.pressure : (event.pointerType === "pen" ? .5 : 1),
      pointerType: event.pointerType || "unknown",
      time: event.timeStamp || performance.now()
    };
  }

  onDown(event) {
    if (!this.enabled || this.guard?.busy) return;
    if (event.pointerType === "mouse" && event.button !== 0 && event.button !== 1) return;

    this.stage.setPointerCapture?.(event.pointerId);
    const point = this.point(event);
    this.pointers.set(event.pointerId, point);
    this.callbacks.onPointerType?.(point.pointerType);

    if (this.pointers.size >= 2 && event.pointerType === "touch") {
      this.cancelPendingTouch();
      this.finishStroke();
      this.beginPinch();
      event.preventDefault();
      return;
    }

    if (event.button === 1 || event.altKey || event.shiftKey) {
      this.primaryId = event.pointerId;
      this.gesture = { kind: "pan", last: point };
      event.preventDefault();
      return;
    }

    this.primaryId = event.pointerId;

    // Touch waits for movement so a long press can open the quick menu without leaving a dot/stroke.
    if (event.pointerType === "touch") {
      this.pendingTouch = { pointerId: event.pointerId, point };
    } else {
      this.beginStroke(point);
    }
    event.preventDefault();
  }

  onMove(event) {
    if (!this.enabled || this.guard?.busy || !this.pointers.has(event.pointerId)) return;
    const point = this.point(event);
    this.pointers.set(event.pointerId, point);

    if (this.pointers.size >= 2 && event.pointerType === "touch") {
      this.cancelPendingTouch();
      this.finishStroke();
      this.updatePinch();
      event.preventDefault();
      return;
    }

    if (this.gesture?.kind === "pan" && event.pointerId === this.primaryId) {
      const dx = point.x - this.gesture.last.x;
      const dy = point.y - this.gesture.last.y;
      this.gesture.last = point;
      this.callbacks.onPan?.(dx, dy);
      event.preventDefault();
      return;
    }

    if (this.pendingTouch?.pointerId === event.pointerId) {
      const begin = this.pendingTouch.point;
      if (Math.hypot(point.x - begin.x, point.y - begin.y) > 6) {
        if (this.guard?.consumeLongPress?.()) return;
        this.pendingTouch = null;
        this.beginStroke(begin);
        this.addPoint(point);
      }
      event.preventDefault();
      return;
    }

    if (!this.isDrawing || event.pointerId !== this.primaryId) return;
    const list = typeof event.getCoalescedEvents === "function" ? event.getCoalescedEvents() : [event];
    for (const item of list) this.addPoint(this.point(item));
    event.preventDefault();
  }

  onUp(event) {
    const wasPendingTouch = this.pendingTouch?.pointerId === event.pointerId;
    this.pointers.delete(event.pointerId);
    if (wasPendingTouch) {
      const point = this.pendingTouch.point;
      this.pendingTouch = null;
      if (!this.guard?.consumeLongPress?.()) {
        this.beginStroke(point);
        this.finishStroke();
      }
    }

    if (event.pointerId === this.primaryId) {
      if (this.gesture?.kind === "pan") this.gesture = null;
      this.finishStroke();
      this.primaryId = null;
    }

    if (this.pointers.size < 2) this.gesture = null;
    try { this.stage.releasePointerCapture?.(event.pointerId); } catch {}
  }

  beginStroke(point) {
    this.isDrawing = true;
    this.callbacks.onStrokeStart?.(point);
  }

  addPoint(point) {
    this.callbacks.onStrokePoint?.(point);
  }

  finishStroke() {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.callbacks.onStrokeEnd?.();
  }

  cancelPendingTouch() {
    this.pendingTouch = null;
  }

  beginPinch() {
    const values = [...this.pointers.values()].slice(0, 2);
    if (values.length < 2) return;
    const distance = Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y);
    const center = { x: (values[0].x + values[1].x) / 2, y: (values[0].y + values[1].y) / 2 };
    this.gesture = { kind: "pinch", distance, center };
    this.callbacks.onGesture?.("Two-finger pan / zoom");
  }

  updatePinch() {
    const values = [...this.pointers.values()].slice(0, 2);
    if (values.length < 2) return;
    if (!this.gesture || this.gesture.kind !== "pinch") this.beginPinch();
    const distance = Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y);
    const center = { x: (values[0].x + values[1].x) / 2, y: (values[0].y + values[1].y) / 2 };
    const scale = Math.max(.5, Math.min(2, distance / Math.max(1, this.gesture.distance)));
    const dx = center.x - this.gesture.center.x;
    const dy = center.y - this.gesture.center.y;
    this.callbacks.onPinch?.({ scale, center, previousCenter: this.gesture.center, dx, dy });
    this.gesture = { kind: "pinch", distance, center };
  }

  onWheel(event) {
    if (!(event.ctrlKey || event.metaKey)) return;
    if (!this.enabled || this.guard?.busy) return;
    event.preventDefault();
    this.callbacks.onWheelZoom?.(event.deltaY < 0 ? 1.08 : .92, this.point(event));
  }
}
