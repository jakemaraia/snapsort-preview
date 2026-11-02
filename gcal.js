// Google Calendar via Google Identity Services token client (browser-only, no backend).
window.GCal = (() => {
  const SCOPE = "https://www.googleapis.com/auth/calendar.events";
  const API = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
  let token = null, expires = 0, client = null, pending = null;
  const clientId = () => (window.SNAPSORT_CONFIG || {}).googleClientId;

  function init() {
    if (client) return client;
    if (!clientId()) throw new Error("Google Calendar isn't set up yet (no client ID in config.js). Use .ics for now.");
    if (!window.google?.accounts?.oauth2) throw new Error("Google sign-in is still loading. Try again in a second.");
    client = google.accounts.oauth2.initTokenClient({
      client_id: clientId(), scope: SCOPE,
      callback: r => { if (r.error) pending?.reject(new Error(r.error_description || r.error));
        else { token = r.access_token; expires = Date.now() + (r.expires_in - 60) * 1000; pending?.resolve(token); } pending = null; },
      error_callback: e => { pending?.reject(new Error(e.message || "Sign-in was closed")); pending = null; },
    });
    return client;
  }
  function getToken(prompt) {
    if (token && Date.now() < expires) return Promise.resolve(token);
    return new Promise((resolve, reject) => { pending = { resolve, reject }; init().requestAccessToken({ prompt }); });
  }
  async function call(method, url, body) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(url, { method, headers: { Authorization: `Bearer ${await getToken("")}`, "Content-Type": "application/json" }, body: body && JSON.stringify(body) });
      if (res.status === 401 && attempt === 0) { token = null; continue; }
      if (!res.ok && res.status !== 410) throw new Error(`${res.status} ${(await res.json().catch(() => ({})))?.error?.message || res.statusText}`);
      return res.status === 204 || res.status === 410 ? null : res.json();
    }
  }
  const day = (d, tz) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

  // Same mapping as the iOS CalendarService.
  function toEvent(it) {
    const desc = "Added by SnapSort" + (it.flight ? `\nFlight ${it.flight.flightNumber} ${it.flight.origin || ""} → ${it.flight.destination || ""}` : "")
      + (it.endTimeZone !== it.startTimeZone ? `\nArrival time zone: ${it.endTimeZone}` : "");
    const ev = { summary: it.title, description: desc, location: it.location || undefined };
    if (it.allDay) {
      ev.start = { date: day(it.start, it.startTimeZone) };
      ev.end = { date: day(new Date(it.start.getTime() + 86400e3), it.startTimeZone) };
    } else {
      const end = it.end || new Date(it.start.getTime() + (it.kind === "flight" ? 7200e3 : 3600e3));
      ev.start = { dateTime: it.start.toISOString(), timeZone: it.startTimeZone };
      ev.end = { dateTime: end.toISOString(), timeZone: it.endTimeZone || it.startTimeZone };
    }
    if (it.kind === "flight") ev.reminders = { useDefault: false, overrides: [{ method: "popup", minutes: 1440 }, { method: "popup", minutes: 180 }] };
    return ev;
  }
  return {
    toEvent,
    connected: () => !!token,
    connect: () => getToken("consent"),
    disconnect: () => { if (token) google.accounts.oauth2.revoke(token, () => {}); token = null; },
    insert: it => call("POST", API, toEvent(it)),
    remove: id => call("DELETE", `${API}/${encodeURIComponent(id)}`),
  };
})();
if (typeof module !== "undefined") module.exports = window.GCal;
