/**
 * Admin screen by name (owner, 13/11/2026): a player registered as exactly `addmen1280` sees the
 * Admin Screen (fighter creation and settings, Move Config, AI and difficulty set-up, balancing and
 * test tools); every other name sees the User Screen.
 *
 * NOT SECURITY (TD-065). This runs in the browser, so anyone can type the name or edit the page.
 * It only decides which screens are shown on this device; the admin tools edit this browser's own
 * copy of the game. Anything that must really be protected (published config, other players'
 * data, rewards) needs a server-verified admin role (REQ-BE-4, security rules) before it exists.
 */
export const ADMIN_NAME = 'addmen1280';

/** Exactly the admin name (case and spacing matter: `Addmen1280` is a user). */
export function isAdminName(name: string | null): boolean {
  return name === ADMIN_NAME;
}
