"""One-off script to generate site images (icons, og-image) from brand assets.
Not part of the site build - run once, commit the outputs, then this can be deleted.
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps

ASSETS = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(ASSETS))
SCREENSHOTS = f"{ROOT}/marketing_site/screenshots"
ICON_SRC = f"{ROOT}/app/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.webp"

PINK = (236, 29, 139)
BLACK = (18, 18, 18)
WHITE = (255, 255, 255)

FONT_BLACK = "C:/Windows/Fonts/seguibl.ttf"   # Segoe UI Black - headline stand-in
FONT_BOLD = "C:/Windows/Fonts/segoeuib.ttf"   # Segoe UI Bold - wordmark / labels


def rounded_mask(size, radius):
    mask = Image.new("L", size, 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([(0, 0), (size[0] - 1, size[1] - 1)], radius=radius, fill=255)
    return mask


def wrap_text(draw, text, font, max_width):
    words = text.split(" ")
    lines, cur = [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if draw.textlength(trial, font=font) <= max_width:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


# ---------- App icon (square, rounded corners) at a few sizes ----------
icon = Image.open(ICON_SRC).convert("RGBA")
for size in (512, 192, 32):
    resized = icon.resize((size, size), Image.LANCZOS)
    resized.save(f"{ASSETS}/icon-{size}.png")

# favicon.ico with multiple sizes baked in
icon.save(f"{ASSETS}/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (192, 192)])

# ---------- OG / social share image (1200x630) ----------
W, H = 1200, 630
og = Image.new("RGB", (W, H), PINK)
draw = ImageDraw.Draw(og)

# Wordmark row
logo_size = 72
logo = icon.resize((logo_size, logo_size), Image.LANCZOS)
og.paste(logo, (64, 56), logo)
wordmark_font = ImageFont.truetype(FONT_BOLD, 34)
draw.text((64 + logo_size + 20, 56 + logo_size / 2 - 20), "TRAVEL CHATTER", font=wordmark_font, fill=WHITE)

# Headline
headline_font = ImageFont.truetype(FONT_BLACK, 62)
headline_lines = wrap_text(draw, "Every phrase you actually need.", headline_font, 640)
y = 210
for line in headline_lines:
    draw.text((64, y), line, font=headline_font, fill=WHITE)
    y += 74

# Subheadline
sub_font = ImageFont.truetype(FONT_BOLD, 28)
sub_lines = wrap_text(
    draw,
    "The travel phrasebook you write as you go. Free, offline, no account.",
    sub_font,
    640,
)
y += 18
for line in sub_lines:
    draw.text((64, y), line, font=sub_font, fill=(255, 214, 236))
    y += 40

# Phone card on the right, zoomed into the money shot of a real screenshot
shot = Image.open(f"{SCREENSHOTS}/Screenshot 4.jpg").convert("RGB")
card_w, card_h = 380, 560
target_ratio = card_w / card_h
# hand-picked crop box (source is 2160x3840): zoomed on the pronunciation
# circle + phrase + speed toggle, centered on the circle horizontally
crop_y0, crop_h = 560, 1420
crop_w = int(crop_h * target_ratio)
crop_x0 = (shot.width - crop_w) // 2
shot_cropped = shot.crop((crop_x0, crop_y0, crop_x0 + crop_w, crop_y0 + crop_h))
shot_resized = shot_cropped.resize((card_w, card_h), Image.LANCZOS)

card_x, card_y = 756, 35
radius = 28

# soft shadow behind the card
shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
sd = ImageDraw.Draw(shadow)
sd.rounded_rectangle(
    [card_x - 6, card_y + 14, card_x + card_w + 6, card_y + card_h + 22],
    radius=radius,
    fill=(0, 0, 0, 90),
)
shadow = shadow.filter(ImageFilter.GaussianBlur(18))
og = Image.alpha_composite(og.convert("RGBA"), shadow).convert("RGB")
draw = ImageDraw.Draw(og)

mask = rounded_mask((card_w, card_h), radius)
og.paste(shot_resized, (card_x, card_y), mask)

# thin border for definition
border = Image.new("RGBA", (W, H), (0, 0, 0, 0))
bd = ImageDraw.Draw(border)
bd.rounded_rectangle(
    [card_x, card_y, card_x + card_w, card_y + card_h],
    radius=radius,
    outline=(255, 255, 255, 60),
    width=2,
)
og = Image.alpha_composite(og.convert("RGBA"), border).convert("RGB")

og.save(f"{ASSETS}/og-image.jpg", quality=90)

# ---------- Web-sized, compressed copies of the screenshots ----------
SHOTS_OUT = f"{ASSETS}/shots"
os.makedirs(SHOTS_OUT, exist_ok=True)
WEB_WIDTH = 760

names = [f"Screenshot {i}" for i in range(1, 9)] + ["Screenshot final"]
slugs = [f"shot-{i}" for i in range(1, 9)] + ["shot-9"]
for name, slug in zip(names, slugs):
    src = Image.open(f"{SCREENSHOTS}/{name}.jpg").convert("RGB")
    ratio = WEB_WIDTH / src.width
    web = src.resize((WEB_WIDTH, int(src.height * ratio)), Image.LANCZOS)
    web.save(f"{SHOTS_OUT}/{slug}.jpg", quality=78, optimize=True, progressive=True)

print("done")
