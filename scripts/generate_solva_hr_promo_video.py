from __future__ import annotations

import math
from pathlib import Path

import imageio.v2 as imageio
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "docs" / "marketing-video"
OUT_DIR.mkdir(parents=True, exist_ok=True)

WIDTH = 1080
HEIGHT = 1350
FPS = 20
DURATION = 30
TOTAL_FRAMES = FPS * DURATION

WHITE = (247, 250, 255)
PAPER = (235, 242, 252)
INK = (17, 28, 53)
INK_SOFT = (68, 86, 116)
BLUE = (17, 65, 150)
BLUE_2 = (38, 104, 225)
BLUE_3 = (121, 180, 255)
BLUE_DARK = (9, 30, 72)
TEAL = (119, 211, 255)
MINT = (196, 243, 255)
SUCCESS = (82, 184, 126)
WARNING = (251, 180, 86)
SHADOW = (15, 38, 89, 30)

LOGO_PATH = ROOT / "public" / "tenant-logos" / "solva-hr-logo.jpg"
PAYROLL_SCREEN_PATH = ROOT / "docs" / "app-directory-screenshots" / "exports-706" / "payroll-summary.jpg"
EMPLOYEE_SCREEN_PATH = ROOT / "docs" / "app-directory-screenshots" / "exports-706" / "employee-profile.jpg"
APPROVAL_SCREEN_PATH = ROOT / "docs" / "app-directory-screenshots" / "exports-706" / "pending-approvals.jpg"

FONT_DIR = Path("C:/Windows/Fonts")


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        FONT_DIR / ("segoeuib.ttf" if bold else "segoeui.ttf"),
        FONT_DIR / ("arialbd.ttf" if bold else "arial.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size=size)
    return ImageFont.load_default()


FONT_HERO = load_font(74, True)
FONT_HERO_MED = load_font(62, True)
FONT_HERO_SOFT = load_font(56, True)
FONT_TITLE = load_font(50, True)
FONT_SUB = load_font(28, False)
FONT_BODY = load_font(26, False)
FONT_BODY_SMALL = load_font(22, False)
FONT_CAPTION = load_font(22, False)
FONT_LABEL = load_font(20, True)
FONT_SMALL = load_font(18, False)


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def ease_out_cubic(t: float) -> float:
    t = clamp(t)
    return 1 - pow(1 - t, 3)


def ease_in_out(t: float) -> float:
    t = clamp(t)
    return 3 * t * t - 2 * t * t * t


def scene_progress(t: float, start: float, end: float) -> float:
    return clamp((t - start) / (end - start))


def wrap_lines(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        probe = word if not current else f"{current} {word}"
        if draw.textlength(probe, font=font) <= max_width:
            current = probe
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def rounded_box(base: Image.Image, box: tuple[int, int, int, int], radius: int, fill, outline=None, width: int = 1, shadow: bool = True):
    x1, y1, x2, y2 = box
    if shadow:
        shadow_layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
        sdraw = ImageDraw.Draw(shadow_layer)
        sdraw.rounded_rectangle((x1 + 10, y1 + 16, x2 + 10, y2 + 16), radius=radius, fill=SHADOW)
        shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(14))
        base.alpha_composite(shadow_layer)
    draw = ImageDraw.Draw(base)
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def draw_gradient_background(img: Image.Image, t: float) -> None:
    draw = ImageDraw.Draw(img)
    for y in range(HEIGHT):
        blend = y / HEIGHT
        r = int(WHITE[0] * (1 - blend) + PAPER[0] * blend)
        g = int(WHITE[1] * (1 - blend) + PAPER[1] * blend)
        b = int(WHITE[2] * (1 - blend) + PAPER[2] * blend)
        draw.line((0, y, WIDTH, y), fill=(r, g, b))
    # clean diagonal bands
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    wave_shift = int(40 * math.sin(t * math.pi * 0.45))
    odraw.polygon([(700 + wave_shift, -40), (WIDTH + 40, -40), (WIDTH + 40, 520), (600 + wave_shift, 420)], fill=(17, 65, 150, 18))
    odraw.polygon([(-40, 980), (340, 860), (760, HEIGHT + 40), (-40, HEIGHT + 40)], fill=(38, 104, 225, 22))
    odraw.rounded_rectangle((60, 70, 1020, 180), radius=48, fill=(255, 255, 255, 155))
    img.alpha_composite(overlay)


def load_rgba_image(path: Path, size: tuple[int, int] | None = None) -> Image.Image | None:
    if not path.exists():
        return None
    image = Image.open(path).convert("RGBA")
    if size:
        image.thumbnail(size, Image.Resampling.LANCZOS)
    return image


LOGO = load_rgba_image(LOGO_PATH, (220, 220))
PAYROLL_SCREEN = load_rgba_image(PAYROLL_SCREEN_PATH, (680, 540))
EMPLOYEE_SCREEN = load_rgba_image(EMPLOYEE_SCREEN_PATH, (520, 760))
APPROVAL_SCREEN = load_rgba_image(APPROVAL_SCREEN_PATH, (680, 540))


def draw_brand_bar(img: Image.Image, subtitle: str) -> None:
    rounded_box(img, (54, 42, 1026, 168), 40, (255, 255, 255, 215), outline=(204, 220, 244, 255), width=2, shadow=False)
    draw = ImageDraw.Draw(img)
    if LOGO:
        logo = LOGO.copy()
        logo.thumbnail((92, 92), Image.Resampling.LANCZOS)
        img.alpha_composite(logo, (78, 60))
    draw.text((188, 68), "Solva HR", fill=BLUE_DARK, font=FONT_TITLE)
    draw.text((188, 122), subtitle, fill=INK_SOFT, font=FONT_CAPTION)


def draw_text_block(draw: ImageDraw.ImageDraw, x: int, y: int, width: int, title: str, body: str, kicker: str | None = None) -> int:
    return draw_text_block_custom(draw, x, y, width, title, body, kicker, FONT_HERO, 82, FONT_SUB, 42)


def draw_text_block_custom(
    draw: ImageDraw.ImageDraw,
    x: int,
    y: int,
    width: int,
    title: str,
    body: str,
    kicker: str | None,
    title_font: ImageFont.ImageFont,
    title_line_height: int,
    body_font: ImageFont.ImageFont,
    body_line_height: int,
) -> int:
    cursor = y
    if kicker:
        draw.text((x, cursor), kicker.upper(), fill=BLUE_2, font=FONT_LABEL)
        cursor += 34
    for line in wrap_lines(draw, title, title_font, width):
        draw.text((x, cursor), line, fill=BLUE_DARK, font=title_font)
        cursor += title_line_height
    cursor += 12
    for line in wrap_lines(draw, body, body_font, width):
        draw.text((x, cursor), line, fill=INK_SOFT, font=body_font)
        cursor += body_line_height
    return cursor


def draw_bullet_list(draw: ImageDraw.ImageDraw, x: int, y: int, width: int, items: list[str], color=INK) -> int:
    return draw_bullet_list_custom(draw, x, y, width, items, FONT_BODY, 34, color)


def draw_bullet_list_custom(
    draw: ImageDraw.ImageDraw,
    x: int,
    y: int,
    width: int,
    items: list[str],
    font: ImageFont.ImageFont,
    line_height: int,
    color=INK,
) -> int:
    cursor = y
    for item in items:
        lines = wrap_lines(draw, item, font, width - 34)
        draw.rounded_rectangle((x, cursor + 9, x + 14, cursor + 23), radius=7, fill=BLUE_2)
        line_y = cursor
        for line in lines:
            draw.text((x + 28, line_y), line, fill=color, font=font)
            line_y += line_height
        cursor = line_y + 12
    return cursor


def draw_device_frame(img: Image.Image, pos: tuple[int, int], size: tuple[int, int], screenshot: Image.Image | None, label: str) -> None:
    x, y = pos
    w, h = size
    rounded_box(img, (x, y, x + w, y + h), 34, BLUE_DARK)
    inset = (x + 18, y + 18, x + w - 18, y + h - 18)
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle(inset, radius=24, fill=(249, 251, 255))
    draw.rounded_rectangle((x + w // 2 - 44, y + 10, x + w // 2 + 44, y + 22), radius=8, fill=(230, 236, 245))
    if screenshot:
        shot = screenshot.copy()
        shot = ImageOps.fit(shot, (w - 36, h - 96), method=Image.Resampling.LANCZOS)
        mask = Image.new("L", shot.size, 255)
        img.alpha_composite(shot, (x + 18, y + 52))
    else:
        for idx, item in enumerate(["Latest payslip", "Leave balance", "Quick actions", "Notifications"]):
            card_y = y + 66 + idx * 84
            draw.rounded_rectangle((x + 34, card_y, x + w - 34, card_y + 62), radius=18, fill=(235, 243, 255))
            draw.text((x + 56, card_y + 17), item, fill=INK, font=FONT_CAPTION)
    draw.text((x + 28, y + h - 34), label, fill=INK_SOFT, font=FONT_SMALL)


def draw_scene_1(img: Image.Image, t: float) -> None:
    draw = ImageDraw.Draw(img)
    p = ease_out_cubic(scene_progress(t, 0, 5))
    draw_brand_bar(img, "Payroll, people, approvals, and growth in one calm system.")
    title_x = 80 - int((1 - p) * 70)
    text_bottom = draw_text_block_custom(
        draw,
        title_x,
        238,
        530,
        "HR and payroll should feel clear, not chaotic.",
        "Solva HR gives growing teams one elegant place to run payroll, approvals, employee self-service, and HR documents.",
        "The story starts here",
        FONT_HERO_MED,
        68,
        FONT_SUB,
        42,
    )
    draw_bullet_list(draw, title_x, text_bottom + 20, 510, [
        "Less back and forth. More control.",
        "Clean approvals, faster payroll, better records.",
        "A professional experience for both management and staff.",
    ])

    # before/after cards
    left_x = 650 - int((1 - p) * 90)
    rounded_box(img, (left_x, 240, 998, 564), 34, (255, 255, 255, 240), outline=(217, 226, 240, 255), width=2)
    draw.text((left_x + 28, 270), "Before Solva HR", fill=INK_SOFT, font=FONT_LABEL)
    draw_bullet_list(draw, left_x + 28, 318, 280, [
        "Scattered staff records",
        "Slow approvals",
        "Payroll pressure every month",
        "No clear employee self-service",
    ], color=INK_SOFT)
    rounded_box(img, (left_x + 34, 580, 998, 1160), 34, (17, 65, 150, 255))
    draw.text((left_x + 62, 624), "After Solva HR", fill=(255, 255, 255), font=FONT_HERO_SOFT)
    if PAYROLL_SCREEN:
        shot = ImageOps.fit(PAYROLL_SCREEN.copy(), (270, 180), Image.Resampling.LANCZOS)
        img.alpha_composite(shot, (left_x + 58, 734))
    draw_bullet_list(draw, left_x + 62, 948, 290, [
        "Live payroll visibility and premium reports",
        "Approvals everyone can actually track",
        "Self-service employees actually use",
    ], color=(243, 248, 255))


def draw_scene_2(img: Image.Image, t: float) -> None:
    draw = ImageDraw.Draw(img)
    p = ease_out_cubic(scene_progress(t, 5, 10))
    draw_brand_bar(img, "Step 1: create your organization and go live in minutes.")
    draw_text_block(
        draw,
        80,
        232,
        470,
        "Create your organization on Solva HR.",
        "A clean setup flow helps you register the company, add branding, choose your admin, and start building your team.",
        "Quick guide",
    )
    steps = [
        ("1", "Enter your company details", "Company name, email, contact person, and country."),
        ("2", "Upload your logo", "Make the system feel like your organization from day one."),
        ("3", "Choose your admin and modules", "Payroll, ESS, approvals, leave, performance, and more."),
    ]
    base_x = 560
    for idx, (num, head, detail) in enumerate(steps):
        offset = int((1 - ease_out_cubic(clamp(p * 1.4 - idx * 0.14))) * 90)
        top = 220 + idx * 214 + offset
        rounded_box(img, (base_x, top, 1000, top + 170), 30, (255, 255, 255, 244), outline=(210, 224, 244, 255), width=2)
        draw.rounded_rectangle((base_x + 24, top + 24, base_x + 90, top + 90), radius=24, fill=BLUE_2)
        draw.text((base_x + 46, top + 34), num, fill=(255, 255, 255), font=FONT_TITLE)
        draw.text((base_x + 116, top + 30), head, fill=BLUE_DARK, font=FONT_BODY)
        for line_idx, line in enumerate(wrap_lines(draw, detail, FONT_CAPTION, 290)):
            draw.text((base_x + 116, top + 76 + line_idx * 30), line, fill=INK_SOFT, font=FONT_CAPTION)

    # signup panel
    rounded_box(img, (82, 760, 472, 1160), 32, BLUE_DARK)
    draw.text((114, 804), "New organization", fill=(255, 255, 255), font=FONT_TITLE)
    fields = ["Company name", "Company email", "Admin contact", "Logo upload", "Start free trial"]
    for idx, field in enumerate(fields):
        y = 892 + idx * 56
        fill = (235, 242, 252) if idx < 4 else BLUE_3
        text_fill = INK_SOFT if idx < 4 else BLUE_DARK
        draw.rounded_rectangle((112, y, 440, y + 40), radius=14, fill=fill)
        draw.text((132, y + 10), field, fill=text_fill, font=FONT_SMALL)


def draw_scene_3(img: Image.Image, t: float) -> None:
    draw = ImageDraw.Draw(img)
    p = ease_out_cubic(scene_progress(t, 10, 15))
    draw_brand_bar(img, "Run the core of your organization from one premium workspace.")
    draw_text_block_custom(
        draw,
        80,
        232,
        470,
        "Payroll, approvals, ESS, and HR documents all in one place.",
        "From setup to real daily operations, Solva HR keeps the essentials in one calm workspace.",
        "What the team gets",
        FONT_HERO_SOFT,
        62,
        FONT_CAPTION,
        34,
    )
    cursor = draw_bullet_list_custom(draw, 80, 630, 450, [
        "Polished payroll exports and payslips",
        "Approvals with clear ownership and replies",
        "ESS for documents, leave, and profile updates",
        "HR letters and contracts in one record",
    ], FONT_BODY_SMALL, 30)
    draw.text((80, cursor + 12), "This is where the system starts saving time every single month.", fill=BLUE_2, font=FONT_CAPTION)
    if PAYROLL_SCREEN:
        card = Image.new("RGBA", (430, 620), (255, 255, 255, 0))
        rounded_box(card, (0, 0, 430, 620), 36, (255, 255, 255, 248), outline=(210, 224, 244, 255), width=2)
        shot = ImageOps.fit(PAYROLL_SCREEN.copy(), (382, 446), method=Image.Resampling.LANCZOS)
        card.alpha_composite(shot, (24, 92))
        cdraw = ImageDraw.Draw(card)
        cdraw.text((28, 26), "Live payroll visibility", fill=BLUE_DARK, font=FONT_BODY)
        cdraw.text((28, 58), "Clean reports, totals, and decision-ready summaries.", fill=INK_SOFT, font=FONT_SMALL)
        img.alpha_composite(card, (604, 278))
    if APPROVAL_SCREEN:
        card = Image.new("RGBA", (340, 260), (255, 255, 255, 0))
        rounded_box(card, (0, 0, 340, 260), 28, (17, 65, 150, 248))
        shot = ImageOps.fit(APPROVAL_SCREEN.copy(), (300, 160), method=Image.Resampling.LANCZOS)
        card.alpha_composite(shot, (20, 76))
        cdraw = ImageDraw.Draw(card)
        cdraw.text((22, 22), "Approvals that stay visible", fill=(255, 255, 255), font=FONT_BODY)
        img.alpha_composite(card, (656, 924 - int((1 - p) * 40)))


def draw_scene_4(img: Image.Image, t: float) -> None:
    draw = ImageDraw.Draw(img)
    p = ease_out_cubic(scene_progress(t, 15, 20))
    draw_brand_bar(img, "Employees get a premium experience too.")
    draw_text_block_custom(
        draw,
        80,
        230,
        430,
        "Give staff a self-service experience that actually feels modern.",
        "Payslips, leave, profile updates, and company documents stay within easy reach on phone or desktop.",
        "ESS matters",
        FONT_TITLE,
        56,
        FONT_CAPTION,
        34,
    )
    draw_bullet_list_custom(draw, 80, 700, 430, [
        "View payslips and employee documents instantly",
        "Track leave balances and requests",
        "See letters, notices, and approval replies",
    ], FONT_BODY_SMALL, 30)
    draw_device_frame(img, (618, 228 - int((1 - p) * 40)), (340, 680), EMPLOYEE_SCREEN, "Employee Self Service")
    rounded_box(img, (580, 870, 992, 1162), 26, (255, 255, 255, 244), outline=(210, 224, 244, 255), width=2)
    draw.text((612, 944), "Why it helps", fill=BLUE_DARK, font=FONT_BODY)
    draw_bullet_list(draw, 612, 990, 320, [
        "Cuts repetitive HR follow-ups",
        "Builds trust through visibility",
    ], color=INK_SOFT)


def draw_scene_5(img: Image.Image, t: float) -> None:
    draw = ImageDraw.Draw(img)
    p = ease_out_cubic(scene_progress(t, 20, 25))
    draw_brand_bar(img, "Use the built-in referral path to grow the network.")
    draw_text_block_custom(
        draw,
        80,
        228,
        430,
        "Know another company that needs a better HR system?",
        "Use the built-in referral flow to recommend another organization and help them register faster.",
        "Referral guide",
        FONT_TITLE,
        56,
        FONT_CAPTION,
        34,
    )
    draw_bullet_list_custom(draw, 80, 632, 420, [
        "Open: Refer Another Company",
        "Add company name, contact person, phone or email",
        "Include the industry and any useful notes",
        "Submit the referral and let Solva HR follow through",
    ], FONT_BODY_SMALL, 30)
    rounded_box(img, (586, 254, 996, 1048), 34, BLUE_DARK)
    title_y = 314
    for line in wrap_lines(draw, "Refer Another Company", FONT_TITLE, 300):
        draw.text((620, title_y), line, fill=(255, 255, 255), font=FONT_TITLE)
        title_y += 52
    form_fields = [
        "Company name",
        "Contact person",
        "Phone / email",
        "Industry",
        "Notes",
    ]
    for idx, field in enumerate(form_fields):
        y = 520 + idx * 86
        h = 54 if field != "Notes" else 130
        draw.rounded_rectangle((620, y, 962, y + h), radius=18, fill=(241, 246, 255))
        draw.text((642, y + 16), field, fill=INK_SOFT, font=FONT_SMALL)
    draw.rounded_rectangle((620, 944, 962, 1008), radius=22, fill=TEAL)
    draw.text((704, 962), "Send referral", fill=BLUE_DARK, font=FONT_BODY)
    rounded_box(img, (80, 1048, 540, 1178), 28, (255, 255, 255, 238), outline=(208, 224, 247, 255), width=2)
    draw.text((112, 1088), "Tell them one thing first:", fill=BLUE_DARK, font=FONT_LABEL)
    for idx, line in enumerate(wrap_lines(draw, "If they already have a CV or HR data, update it first before uploading or importing.", FONT_CAPTION, 386)):
        draw.text((112, 1128 + idx * 28), line, fill=INK_SOFT, font=FONT_CAPTION)


def draw_scene_6(img: Image.Image, t: float) -> None:
    draw = ImageDraw.Draw(img)
    p = ease_out_cubic(scene_progress(t, 25, 30))
    draw_brand_bar(img, "Create your organization. Run it beautifully. Refer another business.")
    rounded_box(img, (88, 238, 992, 1140), 44, BLUE_DARK)
    if LOGO:
        logo = LOGO.copy()
        logo.thumbnail((180, 180), Image.Resampling.LANCZOS)
        img.alpha_composite(logo, (451, 314))
    title_lines = wrap_lines(draw, "Solva HR", FONT_HERO, 500)
    y = 536
    for line in title_lines:
        x = (WIDTH - int(draw.textlength(line, font=FONT_HERO))) // 2
        draw.text((x, y), line, fill=(255, 255, 255), font=FONT_HERO)
        y += 84
    body = "From first setup to payroll, employee self-service, approvals, and referrals — build a calmer HR operation that looks as strong as your business."
    for line in wrap_lines(draw, body, FONT_SUB, 760):
        x = (WIDTH - int(draw.textlength(line, font=FONT_SUB))) // 2
        draw.text((x, y), line, fill=(231, 240, 255), font=FONT_SUB)
        y += 42
    draw.rounded_rectangle((312, 930, 768, 1016), radius=28, fill=TEAL)
    cta = "Register at solvahr.co.ke"
    x = (WIDTH - int(draw.textlength(cta, font=FONT_BODY))) // 2
    draw.text((x, 958), cta, fill=BLUE_DARK, font=FONT_BODY)
    for idx, item in enumerate(["Create your organization", "Empower your team", "Refer another company"]):
        pill_w = 240 if idx != 1 else 220
        pill_x = 120 + idx * 290
        draw.rounded_rectangle((pill_x, 1050, pill_x + pill_w, 1106), radius=22, fill=(255, 255, 255, 210), outline=(205, 225, 255, 255), width=2)
        draw.text((pill_x + 18, 1068), item, fill=BLUE_DARK, font=FONT_SMALL)
    draw.text((222, 1170), "Solva HR | Smart payroll and people operations for modern teams", fill=(220, 232, 252), font=FONT_CAPTION)


SCENES = [
    draw_scene_1,
    draw_scene_2,
    draw_scene_3,
    draw_scene_4,
    draw_scene_5,
    draw_scene_6,
]


def render_frame(frame_index: int) -> Image.Image:
    t = frame_index / FPS
    img = Image.new("RGBA", (WIDTH, HEIGHT), WHITE + (255,))
    draw_gradient_background(img, t)
    scene_index = min(int(t // 5), len(SCENES) - 1)
    SCENES[scene_index](img, t)

    # cinematic bottom caption
    draw = ImageDraw.Draw(img)
    captions = [
        (0, 5, "Running HR and payroll should feel clear."),
        (5, 10, "Create your organization in minutes."),
        (10, 15, "Run payroll, ESS, approvals, and HR documents in one place."),
        (15, 20, "Give employees a premium self-service experience."),
        (20, 25, "Refer another company from inside Solva HR."),
        (25, 30, "Register today at solvahr.co.ke."),
    ]
    active_caption = next((text for start, end, text in captions if start <= t < end), captions[-1][2])
    rounded_box(img, (84, 1210, 996, 1290), 28, (255, 255, 255, 216), outline=(208, 223, 247, 255), width=2, shadow=False)
    tw = int(draw.textlength(active_caption, font=FONT_CAPTION))
    draw.text(((WIDTH - tw) // 2, 1238), active_caption, fill=INK, font=FONT_CAPTION)
    return img.convert("RGB")


def main() -> None:
    mp4_path = OUT_DIR / "solva-hr-facebook-promo-30s.mp4"
    preview_path = OUT_DIR / "solva-hr-facebook-promo-preview.png"
    script_path = OUT_DIR / "solva-hr-facebook-promo-script.txt"

    with imageio.get_writer(mp4_path, fps=FPS, codec="libx264", quality=8, macro_block_size=None) as writer:
        for frame_index in range(TOTAL_FRAMES):
            frame = render_frame(frame_index)
            writer.append_data(np.asarray(frame))
            if frame_index == FPS * 14:
                frame.save(preview_path, format="PNG")

    script_path.write_text(
        "\n".join(
            [
                "0-5s: Running HR and payroll should feel clear, not chaotic.",
                "5-10s: Create your organization on Solva HR in minutes.",
                "10-15s: Run payroll, ESS, approvals, and HR documents in one place.",
                "15-20s: Give employees a premium self-service experience.",
                "20-25s: Use Refer Another Company to recommend another business.",
                "25-30s: Register today at solvahr.co.ke.",
            ]
        ),
        encoding="utf-8",
    )

    print(mp4_path)
    print(preview_path)
    print(script_path)


if __name__ == "__main__":
    main()
