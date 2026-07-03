/** Keeps onboarding navigation, focus restoration and touch-first navigation separate from the app shell. */
export function createOnboardingFlow({ root, nextButton, skipButton, count, dots = [], getCopy, onVisibilityChange } = {}) {
  if (!root || !nextButton || !skipButton || !count || typeof getCopy !== "function") throw new Error("Onboarding UI is incomplete");
  const steps = [...root.querySelectorAll("[data-quick-start-step]")];
  if (!steps.length) throw new Error("Onboarding steps are missing");
  let step = 1;
  let returnFocus = null;
  let touchStart = null;

  function render() {
    step = Math.max(1, Math.min(steps.length, step));
    steps.forEach((panel, index) => {
      const active = index + 1 === step;
      panel.classList.toggle("is-active", active);
      panel.setAttribute("aria-hidden", String(!active));
    });
    dots.forEach((dot, index) => {
      const active = index + 1 === step;
      dot.classList.toggle("is-active", active);
      dot.setAttribute("aria-current", active ? "step" : "false");
    });
    count.textContent = `${step} / ${steps.length}`;
    nextButton.textContent = step === steps.length ? getCopy("finish") : getCopy("next");
  }

  function open() {
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    step = 1;
    render();
    root.hidden = false;
    onVisibilityChange?.(true);
    requestAnimationFrame(() => nextButton.focus({ preventScroll: true }));
  }

  function close({ completed = true } = {}) {
    root.hidden = true;
    onVisibilityChange?.(false, { completed });
    const target = returnFocus;
    returnFocus = null;
    if (target?.isConnected) requestAnimationFrame(() => target.focus({ preventScroll: true }));
  }

  function advance() {
    if (step >= steps.length) return close({ completed: true });
    step += 1;
    render();
  }

  function previous() {
    if (step <= 1) return;
    step -= 1;
    render();
  }

  nextButton.addEventListener("click", advance);
  skipButton.addEventListener("click", () => close({ completed: true }));
  root.addEventListener("click", event => { if (event.target === root) close({ completed: true }); });
  root.addEventListener("keydown", event => {
    if (event.key === "ArrowRight") { event.preventDefault(); advance(); }
    if (event.key === "ArrowLeft") { event.preventDefault(); previous(); }
  });
  root.addEventListener("touchstart", event => {
    const touch = event.changedTouches?.[0];
    if (touch) touchStart = { x: touch.clientX, y: touch.clientY };
  }, { passive: true });
  root.addEventListener("touchend", event => {
    const touch = event.changedTouches?.[0];
    if (!touch || !touchStart) return;
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(deltaX) < 54 || Math.abs(deltaX) < Math.abs(deltaY) * 1.35) return;
    if (deltaX < 0) advance(); else previous();
  }, { passive: true });
  return { open, close, advance, previous, render, get isOpen() { return !root.hidden; } };
}
