import os
from PIL import Image, ImageDraw, ImageFont

ASSETS_DIR = r"C:\Users\Love Chauhan\Desktop\StockMe\presentation_assets"
os.makedirs(ASSETS_DIR, exist_ok=True)

# Helper for font loading with fallback
def get_font(size, bold=False):
    font_names = [
        "C:\\Windows\\Fonts\\segoeuib.ttf" if bold else "C:\\Windows\\Fonts\\segoeui.ttf",
        "C:\\Windows\\Fonts\\calibrib.ttf" if bold else "C:\\Windows\\Fonts\\calibri.ttf",
        "C:\\Windows\\Fonts\\arialbd.ttf" if bold else "C:\\Windows\\Fonts\\arial.ttf",
    ]
    for fn in font_names:
        if os.path.exists(fn):
            try:
                return ImageFont.truetype(fn, size)
            except Exception:
                pass
    return ImageFont.load_default()

# -------------------------------------------------------------
# GRAPHIC 1 (SLIDE 2): Smart FIFO Multi-Batch Auto-Split Engine
# -------------------------------------------------------------
def make_fifo_diagram():
    w, h = 1400, 750
    img = Image.new("RGBA", (w, h), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)

    # Main Card container
    draw.rounded_rectangle([10, 10, w - 10, h - 10], radius=20, fill=(248, 250, 252, 255), outline=(226, 232, 240, 255), width=3)

    # Header bar
    draw.rounded_rectangle([10, 10, w - 10, 80], radius=20, fill=(31, 73, 125, 255))
    draw.rectangle([10, 50, w - 10, 80], fill=(31, 73, 125, 255))
    draw.text((35, 28), "SMART FIFO ALLOCATION ENGINE • MULTI-BATCH AUTO-SPLIT", fill=(255, 255, 255), font=get_font(24, bold=True))

    # Left: Indent Request Box
    draw.rounded_rectangle([40, 110, 360, 420], radius=16, fill=(255, 255, 255, 255), outline=(203, 213, 225, 255), width=2)
    draw.text((60, 130), "INDENT DEMAND", fill=(100, 116, 139), font=get_font(15, bold=True))
    draw.text((60, 160), "FPS-101 Ration Kendra", fill=(15, 23, 42), font=get_font(22, bold=True))
    draw.text((60, 195), "Commodity: Wheat (A-Grade)", fill=(71, 85, 105), font=get_font(16))
    
    # Big Number Badge
    draw.rounded_rectangle([60, 240, 340, 340], radius=12, fill=(238, 242, 255, 255), outline=(199, 210, 254, 255), width=2)
    draw.text((80, 255), "100 Quintals", fill=(31, 73, 125), font=get_font(36, bold=True))
    draw.text((80, 305), "Single Indent Order", fill=(99, 102, 241), font=get_font(15, bold=True))
    draw.text((60, 365), "Constraint: Oldest batch only has 40 Q", fill=(225, 29, 72), font=get_font(14, bold=True))

    # Center: The Engine Arrow & Process
    draw.text((400, 240), "Auto-Split", fill=(31, 73, 125), font=get_font(20, bold=True))
    draw.text((400, 270), "FIFO Engine", fill=(71, 85, 105), font=get_font(15))
    draw.polygon([(520, 270), (550, 270), (550, 255), (580, 280), (550, 305), (550, 290), (520, 290)], fill=(31, 73, 125))

    # Right: Batch Priority Queues
    # Batch 1 (Oldest, 85d) -> Allocated 40 Q (100%)
    draw.rounded_rectangle([600, 110, 1350, 270], radius=14, fill=(240, 253, 244, 255), outline=(187, 247, 208, 255), width=2)
    draw.rounded_rectangle([620, 125, 780, 155], radius=8, fill=(22, 163, 74, 255))
    draw.text((635, 130), "SPLIT #1: 100% EXHAUSTED", fill=(255, 255, 255), font=get_font(12, bold=True))
    draw.text((620, 165), "Batch BATCH-WHT-101 • Bay A-1", fill=(15, 23, 42), font=get_font(20, bold=True))
    draw.text((620, 200), "Age: 85 Days in Storage (Oldest Eligible Stock)", fill=(21, 128, 61), font=get_font(15, bold=True))
    draw.text((620, 230), "Stock: 40 Q available  ->  DISPATCHED: 40 QUINTALS  ->  Remaining: 0 Q (Cleaned)", fill=(51, 65, 85), font=get_font(14))

    # Batch 2 (Next Oldest, 35d) -> Allocated 60 Q (Partial)
    draw.rounded_rectangle([600, 290, 1350, 450], radius=14, fill=(239, 246, 255, 255), outline=(191, 219, 254, 255), width=2)
    draw.rounded_rectangle([620, 305, 800, 335], radius=8, fill=(37, 99, 235, 255))
    draw.text((635, 310), "SPLIT #2: PARTIAL RESIDUAL", fill=(255, 255, 255), font=get_font(12, bold=True))
    draw.text((620, 345), "Batch BATCH-WHT-102 • Bay A-2", fill=(15, 23, 42), font=get_font(20, bold=True))
    draw.text((620, 380), "Age: 35 Days in Storage (Next In-Line Eligible Stock)", fill=(29, 78, 216), font=get_font(15, bold=True))
    draw.text((620, 410), "Stock: 150 Q available ->  DISPATCHED: 60 QUINTALS  ->  Remaining: 90 Q Balance", fill=(51, 65, 85), font=get_font(14))

    # Bottom Special Case Box: Fumigation Skip & Exception Security
    draw.rounded_rectangle([40, 480, 1350, 720], radius=16, fill=(255, 255, 255, 255), outline=(226, 232, 240, 255), width=2)
    
    # Left sub-box: Fumigation Bypass
    draw.rounded_rectangle([60, 500, 680, 700], radius=12, fill=(254, 243, 199, 255), outline=(252, 211, 77, 255), width=1)
    draw.text((80, 515), "LEGAL FUMIGATION SKIP (NO AUDIT PENALTY)", fill=(180, 83, 9), font=get_font(14, bold=True))
    draw.text((80, 545), "Batch BATCH-RIC-098 • Under ALP Gas Cover", fill=(15, 23, 42), font=get_font(17, bold=True))
    draw.text((80, 580), "The engine detects 'Under Fumigation' status and automatically", fill=(120, 53, 15), font=get_font(14))
    draw.text((80, 605), "skips to next eligible batch without operator manual bypass.", fill=(120, 53, 15), font=get_font(14))
    draw.text((80, 645), "Status: Zero Spoilage • Compliant With Central Warehousing Manual", fill=(22, 101, 52), font=get_font(13, bold=True))

    # Right sub-box: Gate-Pass & Verification
    draw.rounded_rectangle([710, 500, 1330, 700], radius=12, fill=(241, 245, 249, 255), outline=(203, 213, 225, 255), width=1)
    draw.text((730, 515), "OUTCOME: 100% STATUTORY AUDIT COMPLIANCE", fill=(31, 73, 125), font=get_font(14, bold=True))
    draw.text((730, 545), "Official Delivery Challan (Form PDS-DC-04)", fill=(15, 23, 42), font=get_font(17, bold=True))
    draw.text((730, 580), "• Total Dispatched: 40 Q + 60 Q = 100 Quintals strictly fulfilled", fill=(51, 65, 85), font=get_font(14))
    draw.text((730, 605), "• Embedded Vector QR Gate-Pass scanned at exit gate", fill=(51, 65, 85), font=get_font(14))
    draw.text((730, 645), "Status: Verified Multi-Batch Dispatch • Traceable to FPS-101", fill=(31, 73, 125), font=get_font(13, bold=True))

    out_path = os.path.join(ASSETS_DIR, "slide2_fifo_diagram.png")
    img.save(out_path, "PNG")
    print(f"Generated {out_path}")

# -------------------------------------------------------------
# GRAPHIC 2 (SLIDE 3): Technical Architecture & Data Pipeline
# -------------------------------------------------------------
def make_architecture_diagram():
    w, h = 1400, 750
    img = Image.new("RGBA", (w, h), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)

    # Background container
    draw.rounded_rectangle([10, 10, w - 10, h - 10], radius=20, fill=(248, 250, 252, 255), outline=(226, 232, 240, 255), width=3)

    # Title
    draw.rounded_rectangle([10, 10, w - 10, 80], radius=20, fill=(31, 73, 125, 255))
    draw.rectangle([10, 50, w - 10, 80], fill=(31, 73, 125, 255))
    draw.text((35, 28), "TECHNICAL ARCHITECTURE & SECURE SUPPLY CHAIN DATA PIPELINE", fill=(255, 255, 255), font=get_font(24, bold=True))

    # 4 Pipeline Stage Columns
    stages = [
        {
            "num": "01",
            "title": "INWARD DESK",
            "sub": "Receipt & Verification",
            "points": [
                "Moisture % Lab Check",
                "12-Bay Mapping (A-1 to B-6)",
                "Batch ID Auto-Generator",
                "Printable QR Stack Card",
                "Stack Card No (Form SC-01)",
            ],
            "color": (59, 130, 246),
            "bg": (239, 246, 255),
        },
        {
            "num": "02",
            "title": "FIFO CORE ENGINE",
            "sub": "Realtime Queue & Rules",
            "points": [
                "Age Tracking (<30d, 60d, 90d)",
                "Monsoon Humidity Priority (>75%)",
                "ALP Fumigation Status Lock",
                "In-Situ Driage/Spillage Deduction",
                "Eliminates Phantom Balances",
            ],
            "color": (99, 102, 241),
            "bg": (238, 242, 255),
        },
        {
            "num": "03",
            "title": "DISPATCH GATE",
            "sub": "Multi-Batch Slicing",
            "points": [
                "Greedy Oldest-First Slicing",
                "Auto-Split Multi-Batch Orders",
                "Mandatory Exception Modal",
                "AGO Officer Sign-off Gate",
                "Form PDS-DC-04 Challan",
            ],
            "color": (16, 185, 129),
            "bg": (236, 253, 245),
        },
        {
            "num": "04",
            "title": "TRACEABILITY",
            "sub": "Downstream Integrity",
            "points": [
                "Gate-Pass QR Verification",
                "Batch-to-FPS Supply Mapping",
                "Single-Click Emergency Recall",
                "Distribution Halt Advisory",
                "Immutable Audit Trail",
            ],
            "color": (217, 119, 6),
            "bg": (254, 243, 199),
        },
    ]

    col_w = 300
    gap = 35
    start_x = 40

    for i, s in enumerate(stages):
        x = start_x + i * (col_w + gap)
        # Card
        draw.rounded_rectangle([x, 110, x + col_w, 530], radius=16, fill=s["bg"], outline=s["color"], width=2)
        
        # Stage Number Badge
        draw.rounded_rectangle([x + 20, 130, x + 70, 165], radius=8, fill=s["color"])
        draw.text((x + 30, 135), s["num"], fill=(255, 255, 255), font=get_font(16, bold=True))

        draw.text((x + 85, 135), s["title"], fill=s["color"], font=get_font(17, bold=True))
        draw.text((x + 20, 175), s["sub"], fill=(15, 23, 42), font=get_font(18, bold=True))
        draw.line([x + 20, 215, x + col_w - 20, 215], fill=(203, 213, 225), width=1)

        # Bullet points
        py = 230
        for pt in s["points"]:
            draw.text((x + 20, py), "•", fill=s["color"], font=get_font(18, bold=True))
            draw.text((x + 38, py), pt, fill=(51, 65, 85), font=get_font(14))
            py += 45

        # Arrow between cards
        if i < 3:
            ax = x + col_w + 8
            ay = 310
            draw.polygon([(ax, ay), (ax + 18, ay), (ax + 18, ay - 8), (ax + 28, ay + 6), (ax + 18, ay + 20), (ax + 18, ay + 12), (ax, ay + 12)], fill=(148, 163, 184))

    # Bottom Tech Stack Badges
    draw.rounded_rectangle([40, 560, w - 40, 710], radius=16, fill=(255, 255, 255, 255), outline=(226, 232, 240, 255), width=2)
    draw.text((60, 580), "CORE TECHNOLOGY STACK IMPLEMENTATION:", fill=(31, 73, 125), font=get_font(16, bold=True))

    tech_badges = [
        ("React 19 + TypeScript", "High-performance reactive frontend", (31, 73, 125)),
        ("HeroUI v3 + Tailwind v4", "Pure Light-Mode accessible UI", (16, 185, 129)),
        ("Firebase Realtime DB", "Sub-50ms multi-terminal sync", (234, 88, 12)),
        ("Vector SVG QR Engine", "Zero-dependency scannable passes", (139, 92, 246)),
        ("Offline Memory Buffer", "Zero disruption during rural network drops", (2, 132, 199)),
    ]

    bx = 60
    for title, desc, col in tech_badges:
        draw.rounded_rectangle([bx, 615, bx + 235, 685], radius=10, fill=(248, 250, 252), outline=(203, 213, 225), width=1)
        draw.text((bx + 12, 625), title, fill=col, font=get_font(13, bold=True))
        draw.text((bx + 12, 650), desc, fill=(100, 116, 139), font=get_font(11))
        bx += 255

    out_path = os.path.join(ASSETS_DIR, "slide3_architecture.png")
    img.save(out_path, "PNG")
    print(f"Generated {out_path}")

# -------------------------------------------------------------
# GRAPHIC 3 (SLIDE 5): Impact Metrics & Triple-Bottom-Line
# -------------------------------------------------------------
def make_impact_diagram():
    w, h = 1400, 750
    img = Image.new("RGBA", (w, h), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)

    # Container
    draw.rounded_rectangle([10, 10, w - 10, h - 10], radius=20, fill=(248, 250, 252, 255), outline=(226, 232, 240, 255), width=3)

    # Title
    draw.rounded_rectangle([10, 10, w - 10, 80], radius=20, fill=(31, 73, 125, 255))
    draw.rectangle([10, 50, w - 10, 80], fill=(31, 73, 125, 255))
    draw.text((35, 28), "QUANTIFIABLE IMPACT & BENEFICIARY ECOSYSTEM ADVANTAGES", fill=(255, 255, 255), font=get_font(24, bold=True))

    # 4 Big Stat Cards
    metrics = [
        {"num": "90%+", "label": "Grain Spoilage Reduction", "sub": "Eliminates aged grain rot past 60-90 days", "color": (16, 185, 129)},
        {"num": "100%", "label": "Statutory Audit Compliance", "sub": "Every dispatch logged with officer sign-off", "color": (31, 73, 125)},
        {"num": "5.4 LAKH", "label": "Fair Price Shops Connected", "sub": "Transparent digital batch gate passes", "color": (217, 119, 6)},
        {"num": "80+ CR", "label": "NFSA Citizens Protected", "sub": "Guarantees nutritious, insect-free rations", "color": (147, 51, 234)},
    ]

    card_w = 300
    gap = 35
    start_x = 40

    for i, m in enumerate(metrics):
        cx = start_x + i * (card_w + gap)
        draw.rounded_rectangle([cx, 110, cx + card_w, 290], radius=16, fill=(255, 255, 255), outline=(226, 232, 240), width=2)
        draw.rounded_rectangle([cx, 110, cx + card_w, 120], radius=16, fill=m["color"])
        draw.rectangle([cx, 115, cx + card_w, 120], fill=m["color"])
        
        draw.text((cx + 20, 140), m["num"], fill=m["color"], font=get_font(42, bold=True))
        draw.text((cx + 20, 205), m["label"], fill=(15, 23, 42), font=get_font(17, bold=True))
        draw.text((cx + 20, 240), m["sub"], fill=(100, 116, 139), font=get_font(13))

    # 3 Pillars: Economic, Social, Environmental
    pillars = [
        {
            "tag": "ECONOMIC IMPACT",
            "title": "Elimination of Buffer Losses",
            "color": (31, 73, 125),
            "bg": (239, 246, 255),
            "points": [
                "Saves thousands of crores lost to grain degradation and distress-auctioning as cattle feed.",
                "Reduces godown inventory audits from 5 working days to 3 seconds with real-time Firebase balances.",
                "Zero phantom inventory from unrecorded moisture loss or torn gunny bag spillage.",
            ],
        },
        {
            "tag": "SOCIAL IMPACT",
            "title": "Food Security & Dignity",
            "color": (16, 185, 129),
            "bg": (236, 253, 245),
            "points": [
                "Guarantees that Antyodaya and Priority Households receive safe, wholesome, fresh grain.",
                "Prevents distribution of moldy, clumped sugar or weevil-infested wheat at Ration Kendras.",
                "Single-click downstream batch recall protects community health within minutes of lab alert.",
            ],
        },
        {
            "tag": "ENVIRONMENTAL IMPACT",
            "title": "Ecological Sustainability",
            "color": (217, 119, 6),
            "bg": (254, 243, 199),
            "points": [
                "Prevents thousands of metric tons of organic food waste and landfill greenhouse emissions.",
                "Optimizes warehouse ventilation and reduces chemical pesticide/fumigation frequency.",
                "Conserves valuable agricultural water and energy embedded in every grain produced by farmers.",
            ],
        },
    ]

    px = 40
    pw = 415
    pgap = 35

    for p in pillars:
        draw.rounded_rectangle([px, 320, px + pw, 710], radius=16, fill=p["bg"], outline=p["color"], width=2)
        draw.rounded_rectangle([px + 20, 340, px + 180, 370], radius=8, fill=p["color"])
        draw.text((px + 30, 345), p["tag"], fill=(255, 255, 255), font=get_font(12, bold=True))

        draw.text((px + 20, 385), p["title"], fill=(15, 23, 42), font=get_font(20, bold=True))
        draw.line([px + 20, 425, px + pw - 20, 425], fill=(203, 213, 225), width=1)

        y = 445
        for pt in p["points"]:
            draw.text((px + 20, y), "•", fill=p["color"], font=get_font(18, bold=True))
            # Wrap text manually
            words = pt.split()
            line = ""
            for w_word in words:
                test_line = line + " " + w_word if line else w_word
                if len(test_line) > 36:
                    draw.text((px + 38, y), line, fill=(51, 65, 85), font=get_font(13))
                    y += 24
                    line = w_word
                else:
                    line = test_line
            if line:
                draw.text((px + 38, y), line, fill=(51, 65, 85), font=get_font(13))
                y += 35

        px += pw + pgap

    out_path = os.path.join(ASSETS_DIR, "slide5_impact_metrics.png")
    img.save(out_path, "PNG")
    print(f"Generated {out_path}")

if __name__ == "__main__":
    make_fifo_diagram()
    make_architecture_diagram()
    make_impact_diagram()
