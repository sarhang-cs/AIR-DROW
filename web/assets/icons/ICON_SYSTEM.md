# AIR-DROW local icon system

All non-toolbar interface icons are now standalone local SVG assets.

- `toolbar/` contains the existing editable toolbar SVG sources and is intentionally preserved.
- `actions/` contains close, clear, redo and reset controls.
- `workspace/` contains Draw, Shape, Create, Projects and Settings navigation icons.
- `settings/` contains the section icons used in the drawer.
- `status/` contains detection and error-state icons.
- `brand/` contains the AIR-DROW mark.

The interface renders these files through the semantic classes in `assets/css/icon-system.css`. Replace an SVG file in the same path to change that icon without editing application markup or JavaScript.
