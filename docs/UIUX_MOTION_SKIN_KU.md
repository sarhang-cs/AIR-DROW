# UI/UX Motion Skin Rules

## Animation law
- motion intensity 0%: motion pause / reduced mode.
- 1–100%: CSS duration uses the chosen motion factor.
- system Reduced Motion overrides decorative motion.
- interaction feedback remains understandable without animation.

## Tab state
- only one UI tab is active at a time;
- active tab has semantic `aria-pressed="true"`;
- inactive tab icon returns to its base transform using CSS transition;
- Style/Data/API tabs open their matching panels; Studio returns to canvas.

## Card and glass rule
- glass is used for topbar, workspace, side cards, sheets, toast and confirm dialog;
- backdrop blur can be disabled by user property;
- solid panel fallback keeps text readable when blur is disabled or unsupported;
- high-content canvas itself is not made heavily blurry.

## Property management
- draft values preview live;
- Apply & Save writes to `meta/phase23-motion-skin` in IndexedDB;
- Cancel returns to last saved skin;
- Reset confirms before reverting to defaults.

## What was deliberately not done
- no global text-selection lock;
- no forced animation in Reduced Motion mode;
- no external image asset is required for the Lottie logo;
- no claim that browser hover behavior exists on touch-only devices.
