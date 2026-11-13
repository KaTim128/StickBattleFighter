# src/interface
**Owner:** Mobile Controls Specialist. HUD (health, stamina, cooldowns, portraits, timer, callouts, floating combat text), menus, settings, fighter select. Original designs only.

`settings-panel.ts`: the Settings screen (gear button / Esc): Audio sliders and Controls rebinding with conflict messages and reset; reads and writes `SettingsState`.

`front-end.ts`: title (owner's art with buttons over its plates), name registration, Game Modes, fighter select (info panel + select stance strips), quit. Callbacks in `FrontEndOptions`; `onScreen` lets the app lower the music on fighter select.
`main-menu.ts`: the Admin Panel (former main menu), for the admin name only (TD-065). `fighter-info.ts`: shared stats and abilities view. `landscape.ts`: turned landscape layout on upright phones (TD-064).
