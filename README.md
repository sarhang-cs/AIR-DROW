# AIR-DROW — Production Release v1.0.3

**Developer:** SARHANG IO

## Android / Termux compatibility

Some Android arm64 Termux devices crash at `vite build` with `Illegal instruction` from Vite 8/Rolldown. This release avoids that local native build.

### GitHub upload
```bash
bash scripts/github-upload-termux.sh
```

### Vercel production publish
```bash
bash scripts/vercel-publish-termux.sh
```

The scripts perform only source-level checks on Termux, then Vercel performs the Vite build in its Linux cloud build environment.

See `TERMUX_SIGILL_FIX_KU.md` for the complete steps.
