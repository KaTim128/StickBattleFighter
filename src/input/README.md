# src/input
**Owner:** Mobile Controls Specialist. The only code that touches keyboard, pointer or touch. Produces device-independent intents (INV-6). Desktop bindings and rebinding; mobile joystick plus exactly five combat buttons.

Key interfaces: `PlayerIntents` (intents.ts); `bindings.ts` (default layout, `checkBinding`/`rebind` conflict rules, labels); `DesktopInput` + `attachKeyboard`/`attachMouse` (keyboard.ts: bound keys and mouse buttons → intents, cursor position, no context menu); `SettingsState` (settings-store.ts: volumes and bindings in localStorage); touch-controls.ts.
