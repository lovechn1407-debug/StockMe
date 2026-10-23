import os
from PIL import Image, ImageDraw, ImageFont

ASSETS_DIR = r"C:\Users\Love Chauhan\Desktop\StockMe\presentation_assets"
os.makedirs(ASSETS_DIR, exist_ok=True)

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
# GRAPHIC 4 (SLIDE 4): Feasibility, Challenges & Strategies Matrix
# -------------------------------------------------------------
def make_feasibility_diagram():
    w, h = 1400, 750
    img = Image.new("RGBA", (w, h), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)

    # Container
    draw.rounded_rectangle([10, 10, w - 10, h - 10], radius=20, fill=(248, 250, 252, 255), outline=(226, 232, 240, 255), width=3)

    # Title
    draw.rounded_rectangle([10, 10, w - 10, 80], radius=20, fill=(31, 73, 125, 255))
    draw.rectangle([10, 50, w - 10, 80], fill=(31, 73, 125, 255))
    draw.text((35, 28), "OPERATIONAL FEASIBILITY, RISK VULNERABILITIES & MITIGATION ARCHITECTURE", fill=(255, 255, 255), font=get_font(24, bold=True))

    cols = [
        {
            "tag": "FEASIBILITY ANALYSIS",
            "title": "Why FoodStock Succeeds",
            "color": (16, 185, 129),
            "bg": (236, 253, 245),
            "items": [
                ("100% Browser Native", "Runs seamlessly on any existing government desktop without installing software."),
                ("Zero Learning Curve", "Clean 3-step linear flow with native HeroUI light mode for warehouse operators."),
                ("Zero Hardware CapEx", "Utilizes existing PC terminals, standard USB laser printers, and 2D barcode scanners."),
                ("Statutory Alignment", "Matches 1:1 with DFPD godown operational manuals and NFSA legal standards."),
            ],
        },
        {
            "tag": "POTENTIAL CHALLENGES",
            "title": "Field Ground Realities",
            "color": (225, 29, 72),
            "bg": (255, 241, 242),
            "items": [
                ("Intermittent Connectivity", "Remote rural godowns experience severe broadband drops during storm seasons."),
                ("Physical Stack Obstruction", "Front stacks block physical forklift access to older eligible rear stacks."),
                ("Human Operator Resistance", "Habitual informal picking shortcuts bypassing official FIFO priorities."),
                ("Natural Storage Driage", "Moisture evaporation causing ledger-to-physical bag weight mismatches."),
            ],
        },
        {
            "tag": "STRATEGIC MITIGATIONS",
            "title": "Engineered Solutions",
            "color": (31, 73, 125),
            "bg": (239, 246, 255),
            "items": [
                ("Offline Buffer Cache", "In-memory persistence caches gate operations and auto-syncs when online."),
                ("Mandatory Exception Modal", "Formal justification signed by Assistant Godown Officer recorded permanently."),
                ("QR Gate-Pass Exit Audit", "Exit guards scan challan QR; trucks carrying unverified loads are halted."),
                ("In-Situ Driage Logging", "Single-click fractional balance adjustment prevents phantom stock jams."),
            ],
        },
    ]

    col_w = 415
    gap = 35
    start_x = 40

    for i, c in enumerate(cols):
        x = start_x + i * (col_w + gap)
        draw.rounded_rectangle([x, 110, x + col_w, 710], radius=16, fill=c["bg"], outline=c["color"], width=2)
        
        # Tag Badge
        draw.rounded_rectangle([x + 20, 130, x + 230, 165], radius=8, fill=c["color"])
        draw.text((x + 30, 137), c["tag"], fill=(255, 255, 255), font=get_font(13, bold=True))

        draw.text((x + 20, 185), c["title"], fill=(15, 23, 42), font=get_font(21, bold=True))
        draw.line([x + 20, 225, x + col_w - 20, 225], fill=(203, 213, 225), width=1)

        y = 245
        for header, detail in c["items"]:
            draw.text((x + 20, y), "✔" if i != 1 else "⚠", fill=c["color"], font=get_font(16, bold=True))
            draw.text((x + 45, y), header, fill=(15, 23, 42), font=get_font(16, bold=True))
            
            # detail wrapping
            y += 28
            words = detail.split()
            line = ""
            for w_word in words:
                test_line = line + " " + w_word if line else w_word
                if len(test_line) > 38:
                    draw.text((x + 45, y), line, fill=(71, 85, 105), font=get_font(13))
                    y += 22
                    line = w_word
                else:
                    line = test_line
            if line:
                draw.text((x + 45, y), line, fill=(71, 85, 105), font=get_font(13))
                y += 40

    out_path = os.path.join(ASSETS_DIR, "slide4_feasibility_matrix.png")
    img.save(out_path, "PNG")
    print(f"Generated {out_path}")

# -------------------------------------------------------------
# GRAPHIC 5 (SLIDE 6): Research & Statutory Reference Framework
# -------------------------------------------------------------
def make_research_diagram():
    w, h = 1400, 750
    img = Image.new("RGBA", (w, h), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)

    # Container
    draw.rounded_rectangle([10, 10, w - 10, h - 10], radius=20, fill=(248, 250, 252, 255), outline=(226, 232, 240, 255), width=3)

    # Title
    draw.rounded_rectangle([10, 10, w - 10, 80], radius=20, fill=(31, 73, 125, 255))
    draw.rectangle([10, 50, w - 10, 80], fill=(31, 73, 125, 255))
    draw.text((35, 28), "STATUTORY POLICY FRAMEWORK, GOVERNMENT GUIDELINES & RESEARCH REFERENCES", fill=(255, 255, 255), font=get_font(24, bold=True))

    refs = [
        {
            "tag": "STATUTORY MANDATE",
            "title": "National Food Security Act (NFSA), 2013",
            "color": (31, 73, 125),
            "points": [
                "Guarantees legal entitlement of 80+ Crore citizens to wholesome, unadulterated food grains.",
                "Mandates end-to-end computerization of the Targeted Public Distribution System (TPDS).",
                "Strict accountability on godown stocking norms and grain quality maintenance at FPS.",
            ],
        },
        {
            "tag": "GOVT OF INDIA BLUEPRINT",
            "title": "Ministry of Consumer Affairs & DFPD Guidelines",
            "color": (16, 185, 129),
            "points": [
                "Integrated Management of Public Distribution System (iPDS) supply chain automation charter.",
                "Standard Operating Procedure (SOP) for First-In, First-Out (FIFO) buffer stock issue.",
                "Electronic integration between Depot Online System (DOS) and Fair Price Shop e-PoS.",
            ],
        },
        {
            "tag": "TECHNICAL WAREHOUSING NORMS",
            "title": "FCI, CWC & Bureau of Indian Standards (BIS)",
            "color": (217, 119, 6),
            "points": [
                "IS 6151: Code of practice for design and storage of food grains in bagged godowns.",
                "IS 7247: Code of practice for Aluminium Phosphide (ALP) fumigation of agricultural food grains.",
                "Mandated moisture ceilings (Max 12-14% for Wheat/Rice; <0.1% for Refined Sugar).",
            ],
        },
        {
            "tag": "COMPLIANCE & AUDIT INTEGRITY",
            "title": "Comptroller & Auditor General (CAG) Reports",
            "color": (147, 51, 234),
            "points": [
                "CAG Performance Audit on Food Grain Storage Losses: Highlights risk of manual stock rot.",
                "Emphasizes urgent need for digital FIFO allocation to curtail multi-crore distress auctions.",
                "Recommends automated driage tracking to eradicate discrepancy in physical vs book stocks.",
            ],
        },
    ]

    card_w = 620
    card_h = 280
    positions = [
        (40, 110),
        (740, 110),
        (40, 420),
        (740, 420),
    ]

    for i, r in enumerate(refs):
        x, y = positions[i]
        draw.rounded_rectangle([x, y, x + card_w, y + card_h], radius=16, fill=(255, 255, 255), outline=r["color"], width=2)
        
        # Header Badge
        draw.rounded_rectangle([x + 20, y + 20, x + 250, y + 50], radius=8, fill=r["color"])
        draw.text((x + 30, y + 26), r["tag"], fill=(255, 255, 255), font=get_font(12, bold=True))

        draw.text((x + 20, y + 65), r["title"], fill=(15, 23, 42), font=get_font(19, bold=True))
        draw.line([x + 20, y + 105, x + card_w - 20, y + 105], fill=(226, 232, 240), width=1)

        py = y + 120
        for pt in r["points"]:
            draw.text((x + 20, py), "•", fill=r["color"], font=get_font(18, bold=True))
            # Wrap text
            words = pt.split()
            line = ""
            for w_word in words:
                test_line = line + " " + w_word if line else w_word
                if len(test_line) > 58:
                    draw.text((x + 40, py), line, fill=(51, 65, 85), font=get_font(13))
                    py += 22
                    line = w_word
                else:
                    line = test_line
            if line:
                draw.text((x + 40, py), line, fill=(51, 65, 85), font=get_font(13))
                py += 32

    out_path = os.path.join(ASSETS_DIR, "slide6_research_framework.png")
    img.save(out_path, "PNG")
    print(f"Generated {out_path}")

if __name__ == "__main__":
    make_feasibility_diagram()
    make_research_diagram()
