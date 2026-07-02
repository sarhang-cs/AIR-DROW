/** Keeps onboarding navigation and focus behavior separate from the app shell. */
export function createOnboardingFlow({ root, nextButton, skipButton, count, dots = [], getCopy, onVisibilityChange } = {}) {
  if (!root || !nextButton || !skipButton || !count || typeof getCopy !== "function") throw new Error("Onboarding UI is incomplete");
  const steps = [...root.querySelectorAll("[data-quick-start-step]")];
  if (!steps.length) throw new Error("Onboarding steps are missing");
  let step = 1;
  function render() {
    step = Math.max(1, Math.min(steps.length, step));
    steps.forEach((panel, index) => { const active = index + 1 === step; panel.classList.toggle("is-active", active); panel.setAttribute("aria-hidden", String(!active)); });
    dots.forEach((dot, index) => { const active = index + 1 === step; dot.classList.toggle("is-active", active); dot.setAttribute("aria-current", active ? "step" : "false"); });
    count.textContent = `${step} / ${steps.length}`;
    nextButton.textContent = step === steps.length ? getCopy("finish") : getCopy("next");
  }
  function open() { step = 1; render(); root.hidden = false; onVisibilityChange?.(true); requestAnimationFrame(() => nextButton.focus({ preventScroll: true })); }
  function close({ completed = true } = {}) { root.hidden = true; onVisibilityChange?.(false, { completed }); }
  function advance() { if (step >= steps.length) return close({ completed: true }); step += 1; render(); }
  nextButton.addEventListener("click", advance);
  skipButton.addEventListener("click", () => close({ completed: true }));
  root.addEventListener("click", event => { if (event.target === root) close({ completed: true }); });
  return { open, close, render, get isOpen() { return !root.hidden; } };
}
