import math
import os
from PIL import Image, ImageDraw

def create_chronos_icon(size=512):
    # 创建高分画布
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    center = size / 2

    # 1. 绘制带有圆角的深邃底座（Squircle / 圆角矩形）
    corner_radius = size * 0.22
    base = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    base_draw = ImageDraw.Draw(base)
    base_draw.rounded_rectangle([size * 0.04, size * 0.04, size * 0.96, size * 0.96], radius=corner_radius, fill=(15, 23, 42, 255))
    
    # 绘制内部深蓝紫渐变光晕
    for i in range(int(size * 0.45), 0, -2):
        ratio = i / (size * 0.45)
        r = int(99 * (1 - ratio) + 15 * ratio)
        g = int(102 * (1 - ratio) + 23 * ratio)
        b = int(241 * (1 - ratio) + 42 * ratio)
        alpha = int(180 * (1 - ratio))
        glow_box = [center - i, center - i, center + i, center + i]
        base_draw.ellipse(glow_box, fill=(r, g, b, alpha))

    img = Image.alpha_composite(img, base)
    draw = ImageDraw.Draw(img)

    # 2. 绘制外层极简时钟刻度光环
    ring_radius = size * 0.35
    for deg in range(0, 360, 30):
        rad = math.radians(deg)
        x1 = center + (ring_radius - size * 0.02) * math.cos(rad)
        y1 = center + (ring_radius - size * 0.02) * math.sin(rad)
        x2 = center + (ring_radius + size * 0.02) * math.cos(rad)
        y2 = center + (ring_radius + size * 0.02) * math.sin(rad)
        color = (165, 180, 252, 220) if deg % 90 == 0 else (99, 102, 241, 120)
        width = max(2, int(size * 0.012 if deg % 90 == 0 else size * 0.007))
        draw.line([(x1, y1), (x2, y2)], fill=color, width=width)

    draw.ellipse(
        [center - ring_radius, center - ring_radius, center + ring_radius, center + ring_radius],
        outline=(99, 102, 241, 80),
        width=max(1, int(size * 0.006))
    )

    # 3. 核心：时流沙漏与无限心流流线 (Hourglass / Infinity Flow)
    hg_h = size * 0.22
    hg_w = size * 0.16

    p_top_l = (center - hg_w, center - hg_h)
    p_top_r = (center + hg_w, center - hg_h)
    p_mid = (center, center)
    p_bot_l = (center - hg_w, center + hg_h)
    p_bot_r = (center + hg_w, center + hg_h)

    # 绘制流畅沙漏轮廓
    draw.line([p_top_l, p_top_r], fill=(168, 85, 247, 240), width=int(size * 0.02))
    draw.line([p_top_r, p_mid], fill=(139, 92, 246, 230), width=int(size * 0.016))
    draw.line([p_top_l, p_mid], fill=(139, 92, 246, 230), width=int(size * 0.016))
    draw.line([p_mid, p_bot_r], fill=(99, 102, 241, 230), width=int(size * 0.016))
    draw.line([p_mid, p_bot_l], fill=(99, 102, 241, 230), width=int(size * 0.016))
    draw.line([p_bot_l, p_bot_r], fill=(99, 102, 241, 240), width=int(size * 0.02))

    # 内部沙漏沙流粒子与聚焦点（活在当下呼吸光点）
    core_dot_r = size * 0.035
    draw.ellipse(
        [center - core_dot_r, center - core_dot_r, center + core_dot_r, center + core_dot_r],
        fill=(56, 189, 248, 255)
    )
    core_inner = size * 0.018
    draw.ellipse(
        [center - core_inner, center - core_inner, center + core_inner, center + core_inner],
        fill=(255, 255, 255, 255)
    )

    # 下方已沉淀的时间沙堆（弧形）
    draw.pieslice(
        [center - hg_w * 0.85, center + hg_h * 0.35, center + hg_w * 0.85, center + hg_h * 0.95],
        start=0, end=180, fill=(99, 102, 241, 160)
    )

    return img

def main():
    res_dir = r"F:\AI Agent\时间管理\mobile\android\app\src\main\res"
    
    icon_master = create_chronos_icon(512)
    icon_master.save(r"F:\AI Agent\时间管理\mobile\public\chronos_icon_512.png")

    sizes = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }

    for folder, s in sizes.items():
        out_folder = os.path.join(res_dir, folder)
        os.makedirs(out_folder, exist_ok=True)
        resized = icon_master.resize((s, s), Image.Resampling.LANCZOS)
        
        # 1. 标准图标 ic_launcher.png
        resized.save(os.path.join(out_folder, "ic_launcher.png"))
        
        # 2. 圆形图标 ic_launcher_round.png
        mask = Image.new('L', (s, s), 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.ellipse([1, 1, s - 2, s - 2], fill=255)
        round_icon = Image.new('RGBA', (s, s), (0, 0, 0, 0))
        round_icon.paste(resized, (0, 0), mask)
        round_icon.save(os.path.join(out_folder, "ic_launcher_round.png"))
        
        # 3. 前景图 ic_launcher_foreground.png
        resized.save(os.path.join(out_folder, "ic_launcher_foreground.png"))
        print(f"Generated {folder} icon {s}x{s}")

if __name__ == "__main__":
    main()
