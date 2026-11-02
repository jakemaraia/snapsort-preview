# Renders the sample screenshots: python3 samples/make_samples.py
from PIL import Image, ImageDraw, ImageFont
F = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"; FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
def font(s, b=False): return ImageFont.truetype(FB if b else F, s)
W, H = 750, 1334
def base(bg, bar=(0,0,0)):
    im = Image.new("RGB", (W, H), bg); d = ImageDraw.Draw(im)
    d.text((40, 24), "9:41", font=font(28, True), fill=bar); d.text((600, 24), "5G  87%", font=font(24), fill=bar)
    return im, d

# 1. Flight confirmation, two legs
im, d = base("white")
d.rectangle([0, 80, W, 220], fill=(0, 51, 102)); d.text((40, 120), "SkyWays  Trip Confirmation", font=font(38, True), fill="white")
y = 270
for line, sz, b, c in [("Confirmation: K7QX2P", 30, False, (60,60,60)), ("", 0, 0, 0),
    ("Flight DL 423", 44, True, "black"), ("Mar 14, 2027", 32, False, "black"), ("JFK → LAX", 52, True, (0,51,102)),
    ("Depart 8:05 AM   Arrive 11:20 AM", 32, False, "black"), ("Seat 14C  ·  Economy", 28, False, (90,90,90)), ("", 0, 0, 0),
    ("Flight DL 1180", 44, True, "black"), ("Mar 21, 2027", 32, False, "black"), ("LAX → JFK", 52, True, (0,51,102)),
    ("Depart 10:30 PM   Arrive 7:05 AM", 32, False, "black"), ("Seat 22A  ·  Economy", 28, False, (90,90,90))]:
    if sz: d.text((40, y), line, font=font(sz, b), fill=c); y += sz + 26
    else: d.line([40, y, W-40, y], fill=(220,220,220), width=2); y += 30
im.save("samples/flight-confirmation.png")

# 2. Event flyer
im, d = base((24, 16, 48), "white")
d.text((40, 220), "LIVE MUSIC", font=font(36, True), fill=(255, 196, 0))
d.text((40, 320), "Rooftop Jazz Night", font=font(60, True), fill="white")
y = 520
for line in ["Saturday, July 10, 2027", "7:30 PM - 10:00 PM ET", "Location: 123 Main St, Brooklyn"]:
    d.text((40, y), line, font=font(38), fill="white"); y += 80
d.text((40, 1000), "Tickets $25 at the door", font=font(32), fill=(200, 200, 220))
im.save("samples/event-flyer.png")

# 3. Group chat: one timed event + one date-only (goes to Review)
im, d = base((242, 242, 247))
d.text((290, 100), "Family", font=font(34, True), fill="black")
y = 200
for line, me in [("Dinner at Nonna's", False), ("2027-01-12 19:30", False), ("Mom's birthday", True), ("Aug 3, 2027", True)]:
    tw = d.textlength(line, font=font(34)); x = W - tw - 70 if me else 40
    d.rounded_rectangle([x - 20, y - 14, x + tw + 20, y + 54], 28, fill=(205, 226, 255) if me else (229, 229, 234))
    d.text((x, y), line, font=font(34), fill="black"); y += 110
im.save("samples/group-chat.png")
