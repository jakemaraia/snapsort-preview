// Port of Sources/SnapSortCore (RuleBasedParser, DateParsing, ConfidenceRouter). Keep rules in sync.
(function (root) {
  const AIRPORTS = {JFK:"America/New_York",LGA:"America/New_York",EWR:"America/New_York",BOS:"America/New_York",IAD:"America/New_York",DCA:"America/New_York",ATL:"America/New_York",MIA:"America/New_York",MCO:"America/New_York",ORD:"America/Chicago",DFW:"America/Chicago",IAH:"America/Chicago",DEN:"America/Denver",PHX:"America/Phoenix",LAS:"America/Los_Angeles",LAX:"America/Los_Angeles",SFO:"America/Los_Angeles",SEA:"America/Los_Angeles",YYZ:"America/Toronto",LHR:"Europe/London",CDG:"Europe/Paris",AMS:"Europe/Amsterdam",FRA:"Europe/Berlin",DXB:"Asia/Dubai",NRT:"Asia/Tokyo",HND:"Asia/Tokyo",SYD:"Australia/Sydney",HNL:"Pacific/Honolulu"};
  const TZ_ABBREV = {EST:"America/New_York",EDT:"America/New_York",ET:"America/New_York",CST:"America/Chicago",CDT:"America/Chicago",CT:"America/Chicago",MST:"America/Denver",MDT:"America/Denver",PST:"America/Los_Angeles",PDT:"America/Los_Angeles",PT:"America/Los_Angeles",GMT:"Europe/London",BST:"Europe/London",CET:"Europe/Paris",UTC:"UTC",JST:"Asia/Tokyo"};
  const MONTHS = {jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
  const MON = "(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?";
  const RE = {
    monthName: new RegExp(`\\b${MON}\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`, "gi"),
    dayMonth: new RegExp(`\\b(\\d{1,2})\\s+${MON},?\\s+(\\d{4})\\b`, "gi"),
    iso: /\b(\d{4})-(\d{2})-(\d{2})\b/g,
    us: /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g,
    time: /\b(\d{1,2}):(\d{2})\s*([AaPp]\.?[Mm]\.?)?/g,
    flight: /\b([A-Z]{2}|[A-Z][0-9]|[0-9][A-Z])\s?([0-9]{1,4})\b/g,
    route: /\b([A-Z]{3})\b\s*(?:→|->|–|—|-|to|TO|✈)\s*\b([A-Z]{3})\b/g,
    code: /\b([A-Z]{3})\b/g,
  };
  const NOT_AIRLINES = new Set(["AM","PM","TO","AT","ON","NO","OF","IN"]);
  const all = (re, s) => [...s.matchAll(new RegExp(re.source, re.flags))];

  function dates(s) {
    const f = [];
    for (const m of all(RE.monthName, s)) { const mo = MONTHS[m[1].slice(0,3).toLowerCase()]; if (mo) f.push([m.index, {y:+m[3], mo, d:+m[2]}]); }
    for (const m of all(RE.dayMonth, s)) { const mo = MONTHS[m[2].slice(0,3).toLowerCase()]; if (mo) f.push([m.index, {y:+m[3], mo, d:+m[1]}]); }
    for (const m of all(RE.iso, s)) f.push([m.index, {y:+m[1], mo:+m[2], d:+m[3]}]);
    for (const m of all(RE.us, s)) f.push([m.index, {y:+m[3], mo:+m[1], d:+m[2]}]);
    return f.sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
  }
  const firstDate = s => dates(s)[0] || null;
  function times(s) {
    return all(RE.time, s).map(m => {
      let h = +m[1]; const mi = +m[2]; if (h > 23 || mi > 59) return null;
      if (m[3]) { const pm = m[3][0].toLowerCase() === "p"; if (h === 12) h = pm ? 12 : 0; else if (pm) h += 12; }
      return {h, mi};
    }).filter(Boolean);
  }
  function explicitTZ(s) { for (const w of s.split(/[^A-Za-z0-9]+/)) if (TZ_ABBREV[w]) return TZ_ABBREV[w]; return null; }

  // Wall-clock in IANA zone → Date
  function tzOffsetMs(date, tz) {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-US",{timeZone:tz,hourCycle:"h23",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit"}).formatToParts(date).map(x=>[x.type,x.value]));
    return Date.UTC(+p.year, +p.month-1, +p.day, +p.hour % 24, +p.minute, +p.second) - date.getTime();
  }
  function make(d, t, tz) {
    const guess = Date.UTC(d.y, d.mo-1, d.d, t.h, t.mi);
    let ts = guess - tzOffsetMs(new Date(guess), tz);
    ts = guess - tzOffsetMs(new Date(ts), tz);
    return new Date(ts);
  }

  function parseFlights(lines, defTZ) {
    const starts = [];
    lines.forEach((line, i) => {
      for (const m of all(RE.flight, line)) {
        if (NOT_AIRLINES.has(m[1])) continue;
        const fn = m[1] + m[2];
        if (starts.length && starts[starts.length-1][1] === fn) continue;
        starts.push([i, fn]); break;
      }
    });
    const items = []; let carried = null;
    starts.forEach(([si, fn], n) => {
      const end = n + 1 < starts.length ? starts[n+1][0] : lines.length;
      const seg = lines.slice(n === 0 ? 0 : si, end).join("\n");
      let origin = null, dest = null;
      const routes = all(RE.route, seg);
      const r = routes.find(x => AIRPORTS[x[1]] || AIRPORTS[x[2]]) || routes[0];
      if (r) { origin = r[1]; dest = r[2]; }
      else { const c = all(RE.code, seg).map(x=>x[1]).filter(x=>AIRPORTS[x]); if (c.length >= 2) { origin = c[0]; dest = c[1]; } }
      if (!origin && !seg.toLowerCase().includes("flight")) return;
      const date = firstDate(seg) || carried; carried = date;
      const ts = times(seg);
      const depTZ = (origin && AIRPORTS[origin]) || defTZ;
      const arrTZ = (dest && AIRPORTS[dest]) || depTZ;
      let start = null, endD = null;
      if (date && ts[0]) start = make(date, ts[0], depTZ);
      if (date && ts.length > 1) {
        const arrDate = dates(seg)[1] || date;
        endD = make(arrDate, ts[1], arrTZ);
        if (start && endD <= start) endD = new Date(endD.getTime() + 86400000);
      }
      let conf = 0.4; if (origin) conf += 0.2; if (date) conf += 0.15; if (start) conf += 0.1; if (endD) conf += 0.1;
      items.push({id: crypto.randomUUID(), kind:"flight", title:`✈️ ${fn}` + (origin ? ` ${origin} → ${dest}` : ""),
        start, end: endD, startTimeZone: depTZ, endTimeZone: arrTZ, location: origin,
        flight: {flightNumber: fn, origin, destination: dest}, confidence: Math.min(conf, 0.95), source: "rules"});
    });
    return items;
  }

  function parseEvents(lines, defTZ) {
    const items = [], used = new Set();
    lines.forEach((line, i) => {
      if (used.has(i)) return;
      const date = firstDate(line); if (!date) return;
      used.add(i);
      let ts = times(line);
      if (!ts.length && i + 1 < lines.length && !firstDate(lines[i+1])) { ts = times(lines[i+1]); if (ts.length) used.add(i+1); }
      const tz = explicitTZ(line + " " + (lines[i+1] || "")) || defTZ;
      let title = "Event";
      for (let j = i - 1; j >= 0; j--) { if (!firstDate(lines[j]) && !times(lines[j]).length) { title = lines[j]; break; } }
      let location = null;
      for (let k = i + 1; k < Math.min(i + 4, lines.length); k++) {
        const l = lines[k], lo = l.toLowerCase();
        if (lo.startsWith("location:") || lo.startsWith("where:")) { location = l.split(/:(.*)/s)[1].trim(); break; }
        if (l.startsWith("@")) { location = l.slice(1).trim(); break; }
      }
      const start = make(date, ts[0] || {h:0, mi:0}, tz);
      const end = ts.length > 1 ? make(date, ts[1], tz) : null;
      let conf = 0.55; if (ts.length) conf += 0.25; if (title !== "Event") conf += 0.1; if (location) conf += 0.05;
      items.push({id: crypto.randomUUID(), kind:"event", title, start, end, startTimeZone: tz, endTimeZone: tz,
        location, flight: null, confidence: conf, source: "rules", hasTime: ts.length > 0});
    });
    return items;
  }

  function parse(text, defTZ = Intl.DateTimeFormat().resolvedOptions().timeZone) {
    const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const f = parseFlights(lines, defTZ);
    return f.length ? f : parseEvents(lines, defTZ);
  }
  const route = (item, threshold = 0.8) => (item.start && item.confidence >= threshold) ? "added" : "review";

  root.SnapSort = { parse, route, AIRPORTS };
  if (typeof module !== "undefined") module.exports = root.SnapSort;
})(typeof window !== "undefined" ? window : globalThis);
