/**
 * More.com παιδικό θέατρο: URLs τύπου
 * https://www.more.com/gr-el/tickets/theater/children/…
 */
function moreTheaterLinkIsKids(url) {
  const raw = String(url || '').trim();
  if (!raw) return false;
  try {
    const path = new URL(raw).pathname.toLowerCase();
    return /\/tickets\/theater\/children(?:\/|$)/.test(path);
  } catch {
    return /\/tickets\/theater\/children(?:\/|$|\?)/i.test(raw);
  }
}

module.exports = { moreTheaterLinkIsKids };
