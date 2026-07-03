# AIR-DROW Release Notes

## v7.5.5 — Localization & Theme Final

- Re-renders all dynamic UI immediately after language changes, including Hand drawing check, calibration guidance, device readiness, network state and recovery messages.
- Verifies a matching Kurdish/English dictionary contract and prevents opposite-language fallback text.
- Adds a paired dark/light theme matrix for Violet, Pink, Sapphire, Obsidian, Silver and Gold.
- Adds contrast-safe icon tokens for toolbar, navigation, scanner, summary and status states.
- Locks Android browser selection and Copy/Share/Translate/Search callouts across onboarding and every non-editable studio surface.
- Keeps real text inputs editable and keeps scrolling/taps functional.
- Preserves the real four-target calibration flow and persisted calibration result from v7.5.4.

## Verification

`npm run vercel:build` validates the local hand model, MediaPipe build output, bilingual keys, dynamic localization paths, paired themes, release identity and deploy-ready output.
