/**
 * Page/environment identifiers for the app (used by the sidebar & routers).
 */
export type PageId = 'dashboard' | 'calendar';

export function navigateTo(pageId: PageId, action?: 'redirect' | 'reload') {
  if (action === 'redirect') {
    window.location.href = `/${pageId}`;
    return;
  }
  if (action === 'reload') {
    window.location.reload();
    return;
  }
  // No router: silent no-op. Page switches are handled by MainScreen's
  // `activePage` state (see SideRail render) — this function is a no-op
  // placeholder so SideRail compiles without a router.
}
