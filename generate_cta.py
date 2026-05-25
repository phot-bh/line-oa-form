"""Generate Rich Message CTA image for JC Lead Form (1040x520 px)."""
from PIL import Image, ImageDraw, ImageFont
import os

# Canvas
W, H = 1040, 520
img = Image.new("RGB", (W, H), (11, 37, 69))  # JC navy
draw = ImageDraw.Draw(img)

# Vertical gradient navy -> deeper navy
for y in range(H):
    t = y / H
    r = int(11 + (19 - 11) * t)
    g = int(37 + (49 - 37) * t)
    b = int(69 + (92 - 69) * t)
    draw.line([(0, y), (W, y)], fill=(r, g, b))

# Find Thai-capable font
def find_font(size, bold=False):
    candidates = [
        r"C:\Windows\Fonts\tahomabd.ttf" if bold else r"C:\Windows\Fonts\tahoma.ttf",
        r"C:\Windows\Fonts\leelawdb.ttf" if bold else r"C:\Windows\Fonts\leelawad.ttf",
        r"C:\Windows\Fonts\browab.ttf" if bold else r"C:\Windows\Fonts\browa.ttf",
        r"C:\Windows\Fonts\arial.ttf",
    ]
    for f in candidates:
        if os.path.exists(f):
            try:
                return ImageFont.truetype(f, size)
            except Exception:
                pass
    return ImageFont.load_default()

f_logo = find_font(48, bold=True)
f_h1 = find_font(64, bold=True)
f_h2 = find_font(28, bold=False)
f_btn = find_font(36, bold=True)
f_sub = find_font(22, bold=False)

GOLD = (199, 147, 56)
GOLD_LIGHT = (232, 198, 106)
WHITE = (255, 255, 255)
SOFT = (200, 210, 230)

# Logo badge top-left
badge_x, badge_y, badge_size = 56, 56, 78
draw.rounded_rectangle(
    [badge_x, badge_y, badge_x + badge_size, badge_y + badge_size],
    radius=18, fill=(255, 255, 255, 0), outline=GOLD, width=3,
)
# Logo text "JC" centered in badge
logo_text = "JC"
bbox = draw.textbbox((0, 0), logo_text, font=f_logo)
tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
draw.text(
    (badge_x + (badge_size - tw) / 2 - bbox[0], badge_y + (badge_size - th) / 2 - bbox[1] - 4),
    logo_text, font=f_logo, fill=GOLD_LIGHT,
)

# "Jay Capital" wordmark next to badge
draw.text((badge_x + badge_size + 18, badge_y + 8), "JAY CAPITAL",
          font=f_h2, fill=GOLD_LIGHT)
draw.text((badge_x + badge_size + 18, badge_y + 44), "Financial Advisor",
          font=f_sub, fill=SOFT)

# Headline
draw.text((56, 180), "ลงทะเบียนรับคำปรึกษาฟรี",
          font=f_h1, fill=WHITE)

# Subheadline (services)
draw.text((56, 270), "IPO  •  M&A  •  Refinance  •  Restructuring",
          font=f_h2, fill=GOLD_LIGHT)

# Footer note
draw.text((56, 318), "ทีม RM ติดต่อกลับภายใน 24 ชั่วโมง",
          font=f_sub, fill=SOFT)

# CTA pill button (bottom-left)
btn_x, btn_y, btn_w, btn_h = 56, 400, 420, 78
draw.rounded_rectangle(
    [btn_x, btn_y, btn_x + btn_w, btn_y + btn_h],
    radius=39, fill=GOLD,
)
btn_text = "เริ่มกรอกข้อมูล  →"
bbox = draw.textbbox((0, 0), btn_text, font=f_btn)
tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
draw.text(
    (btn_x + (btn_w - tw) / 2 - bbox[0], btn_y + (btn_h - th) / 2 - bbox[1] - 6),
    btn_text, font=f_btn, fill=(11, 37, 69),
)

# Decorative diagonal stripe (subtle) bottom-right
for i in range(8):
    offset = i * 24
    draw.line(
        [(W - 320 + offset, H), (W, H - 320 + offset)],
        fill=(199, 147, 56, 30), width=2,
    )

out_path = os.path.join(os.path.dirname(__file__), "cta_richmessage.jpg")
img.save(out_path, "JPEG", quality=92)
print(f"Saved: {out_path}")
print(f"Size: {os.path.getsize(out_path) / 1024:.1f} KB")
