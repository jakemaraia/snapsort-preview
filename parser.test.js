// node parser.test.js — mirrors Tests/SnapSortCoreTests/ParserTests.swift
const S = require("./parser.js"); const assert = require("assert");
const NY = "America/New_York", iso = d => d && d.toISOString().replace(".000", "");
let n = 0; const t = (name, fn) => { fn(); n++; console.log("✓", name); };
t("single flight", () => { const i = S.parse("Your trip confirmation\nMar 14, 2027\nFlight DL 423\nJFK → LAX\nDepart 8:05 AM   Arrive 11:20 AM", NY);
  assert.equal(i.length, 1); assert.equal(i[0].flight.flightNumber, "DL423"); assert.equal(iso(i[0].start), "2027-03-14T12:05:00Z");
  assert.equal(iso(i[0].end), "2027-03-14T18:20:00Z"); assert.equal(S.route(i[0]), "added"); });
t("multi-leg + overnight", () => { const i = S.parse("Itinerary\nUA 90 Jun 2, 2027\nEWR - NRT\n10:45 - 13:55\nNH 12 Jun 4, 2027\nHND to ORD\n17:00 15:30", NY);
  assert.deepEqual(i.map(x => x.flight.flightNumber), ["UA90", "NH12"]); assert.equal(iso(i[0].end), "2027-06-03T04:55:00Z"); assert.equal(iso(i[1].start), "2027-06-04T08:00:00Z"); });
t("event tz + location", () => { const i = S.parse("Brooklyn Rooftop Jazz Night\nSaturday, July 10, 2027\n7:30 PM - 10:00 PM PT\nLocation: 123 Main St", NY);
  assert.equal(i[0].title, "Brooklyn Rooftop Jazz Night"); assert.equal(i[0].location, "123 Main St"); assert.equal(iso(i[0].start), "2027-07-11T02:30:00Z"); assert.equal(S.route(i[0]), "added"); });
t("multi event", () => assert.deepEqual(S.parse("Team offsite\n2027-01-12 09:00\nDinner with Sam\n2027-01-12 19:30", NY).map(x => x.title), ["Team offsite", "Dinner with Sam"]));
t("date only → review", () => assert.equal(S.route(S.parse("Mom's birthday\nAug 3, 2027", NY)[0]), "review"));
t("noise", () => { assert.equal(S.parse("lol see you at 5:00 PM\nok", NY).length, 0); assert.equal(S.parse("Battery 87%\nWiFi", NY).length, 0); });
console.log(`${n} passed`);
