// Called only from a user gesture. Browsers may enforce their own tab-focus policy.
export function openExternal(url) {
  let tab;
  try { tab = window.open(url, '_blank'); } catch { return false; }
  if (!tab) return false;
  try { tab.opener = null; tab.focus(); } catch { /* Browser controls tab focus. */ }
  return true;
}

export function enableExternalLinks() {
  document.addEventListener('click', event => {
    const anchor = event.target.closest?.('a[href]');
    if (!anchor || event.defaultPrevented || anchor.hasAttribute('download')) return;
    let target;
    try { target = new URL(anchor.href, location.href); } catch { return; }
    if (!['http:', 'https:'].includes(target.protocol) || target.origin === location.origin) return;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (openExternal(target.href)) event.preventDefault();
  });
}
