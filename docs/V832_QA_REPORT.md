# AIR-DROW v8.3.2 QA report

- About metadata grid uses explicit named areas, providing a wider input card in both RTL and LTR layouts.
- Settings scroll resets only when the drawer is newly opened without an explicit workspace destination.
- `cloneValue()` and `lastItem()` cover active paths that otherwise require newer WebKit APIs.
- Existing hand-guide, export safety, and legacy WebAssembly CSP checks remain present.
- Automated result: `npm run verify:all` and `npm test` pass in the packaged source.
