# AIR-DROW v7.5.0 Release Notes

## Production reliability
The service worker now installs only the light application shell. The local hand model and MediaPipe runtime remain same-origin, but are fetched and cached only when the person opens Camera. This reduces first-install storage and network cost substantially on constrained Android devices.

## Clean source delivery
`public/` is build output, not source. It is excluded from Git and this ZIP; `npm run vercel:build` recreates and verifies it before Vercel deploys.

## Language and safety
Kurdish and English dictionaries are verified to contain identical keys. The camera-stop message and hand-check drawing-area label are translated. Optional AI creation stays disabled until explicitly enabled on the server and can be limited to approved origins using `AIRDROW_AI_ALLOWED_ORIGINS`.
