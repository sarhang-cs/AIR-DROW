export class InteractionGuard {
  constructor(stage, { onLongPress, onBusyChange } = {}) {
    this.stage = stage;
    this.onLongPress = onLongPress;
    this.onBusyChange = onBusyChange;
    this.busy = false;
    this.longPressEnabled = true;
    this.lockDuringBusy = true;
    this.timer = null;
    this.start = null;
    this.longPressed = false;

    stage.addEventListener("contextmenu", event => event.preventDefault());
    stage.addEventListener("dragstart", event => event.preventDefault());
    stage.addEventListener("selectstart", event => event.preventDefault());
    stage.addEventListener("pointerdown", event => this.pointerDown(event), { passive: false });
    stage.addEventListener("pointermove", event => this.pointerMove(event), { passive: false });
    stage.addEventListener("pointerup", () => this.clearLongPress(), { passive: true });
    stage.addEventListener("pointercancel", () => this.clearLongPress(), { passive: true });
  }

  setOptions({ longPressEnabled, lockDuringBusy }) {
    this.longPressEnabled = Boolean(longPressEnabled);
    this.lockDuringBusy = Boolean(lockDuringBusy);
  }

  setBusy(value) {
    this.busy = Boolean(value);
    this.stage.dataset.busy = this.busy ? "true" : "false";
    this.onBusyChange?.(this.busy);
  }

  pointerDown(event) {
    if (!this.longPressEnabled || this.busy || event.pointerType !== "touch") return;
    if (event.isPrimary === false) return;
    this.longPressed = false;
    this.start = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    this.timer = setTimeout(() => {
      this.timer = null;
      this.longPressed = true;
      this.onLongPress?.({
        x: event.clientX,
        y: event.clientY,
        pointerId: event.pointerId
      });
    }, 650);
  }

  pointerMove(event) {
    if (!this.start || event.pointerId !== this.start.pointerId) return;
    if (Math.hypot(event.clientX - this.start.x, event.clientY - this.start.y) > 10) this.clearLongPress();
  }

  consumeLongPress() {
    const value = this.longPressed;
    this.longPressed = false;
    return value;
  }

  clearLongPress() {
    clearTimeout(this.timer);
    this.timer = null;
    this.start = null;
  }
}
