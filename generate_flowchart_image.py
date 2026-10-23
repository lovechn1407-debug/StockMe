import os
from PIL import Image, ImageDraw, ImageFont

OUTPUT_PATH = r"C:\Users\Love Chauhan\Desktop\StockMe\presentation_assets\foodstock_flowchart_white_bg.png"
os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

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

def draw_arrow(draw, start, end, color=(100, 116, 139), width=3, head_size=10, text=None, text_color=(15, 23, 42)):
    x1, y1 = start
    x2, y2 = end
    draw.line([start, end], fill=color, width=width)
    
    # Arrow head
    import math
    angle = math.atan2(y2 - y1, x2 - x1)
    
    x_tip = x2
    y_tip = y2
    
    x_left = x_tip - head_size * math.cos(angle - math.pi / 6)
    y_left = y_tip - head_size * math.sin(angle - math.pi / 6)
    
    x_right = x_tip - head_size * math.cos(angle + math.pi / 6)
    y_right = y_tip - head_size * math.sin(angle + math.pi / 6)
    
    draw.polygon([(x_tip, y_tip), (x_left, y_left), (x_right, y_right)], fill=color)

    if text:
        tx = (x1 + x2) / 2
        ty = (y1 + y2) / 2 - 16
        draw.text((tx, ty), text, fill=text_color, font=get_font(13, bold=True))

def render_flowchart():
    W, H = 2600, 1600
    img = Image.new("RGB", (W, H), (255, 255, 255))
    draw = ImageDraw.Draw(img)

    # ---------------------------------------------------------
    # 1. HEADER SECTION (White Background with Crisp Typography)
    # ---------------------------------------------------------
    draw.rectangle([0, 0, W, 130], fill=(255, 255, 255))
    draw.line([50, 130, W - 50, 130], fill=(226, 232, 240), width=2)

    # Title Pill / Tag
    draw.rounded_rectangle([60, 25, 260, 58], radius=8, fill=(238, 242, 255), outline=(199, 210, 254), width=1)
    draw.text((75, 32), "GOVERNMENT iPDS GODOWN", fill=(31, 73, 125), font=get_font(14, bold=True))

    # Main Title
    draw.text((60, 68), "FoodStock: End-to-End Smart Commodity Stock Allocation & FIFO Workflow", fill=(15, 23, 42), font=get_font(32, bold=True))

    # Legend / Key on Top Right
    legend_items = [
        ("Automated Step", (2, 132, 199)),
        ("FIFO / Allocation Gate", (5, 150, 105)),
        ("Environmental Rule", (217, 119, 6)),
        ("Exception / Override Gate", (225, 29, 72)),
    ]
    lx = W - 780
    for label, col in legend_items:
        draw.rounded_rectangle([lx, 45, lx + 16, 61], radius=4, fill=col)
        draw.text((lx + 24, 43), label, fill=(71, 85, 105), font=get_font(14))
        lx += 185

    # ---------------------------------------------------------
    # 2. 5 SEQUENTIAL WORKFLOW PHASES (Columns)
    # ---------------------------------------------------------
    col_w = 460
    col_gap = 40
    start_x = 60
    top_y = 160

    phases = [
        {
            "num": "STAGE 1",
            "title": "INWARD & STACKING",
            "desc": "Receipt, Lab Testing & Bay Mapping",
            "color": (2, 132, 199),
            "bg": (240, 249, 255),
        },
        {
            "num": "STAGE 2",
            "title": "STORAGE & MONITORING",
            "desc": "Real-Time Ageing & Weather Rules",
            "color": (99, 102, 241),
            "bg": (245, 247, 255),
        },
        {
            "num": "STAGE 3",
            "title": "FIFO ALLOCATION ENGINE",
            "desc": "Multi-Batch Slicing & Auto-Split",
            "color": (5, 150, 105),
            "bg": (240, 253, 244),
        },
        {
            "num": "STAGE 4",
            "title": "DISPATCH & CHALLAN",
            "desc": "Statutory Gate-Pass & Verification",
            "color": (217, 119, 6),
            "bg": (255, 251, 235),
        },
        {
            "num": "STAGE 5",
            "title": "TRACEABILITY & RECALL",
            "desc": "Downstream FPS & Audit Ledger",
            "color": (225, 29, 72),
            "bg": (255, 241, 242),
        },
    ]

    for i, p in enumerate(phases):
        cx = start_x + i * (col_w + col_gap)
        
        # Column background container
        draw.rounded_rectangle([cx, top_y, cx + col_w, H - 70], radius=16, fill=(255, 255, 255), outline=(226, 232, 240), width=2)
        
        # Phase Header Banner
        draw.rounded_rectangle([cx, top_y, cx + col_w, top_y + 80], radius=16, fill=p["bg"], outline=p["color"], width=1)
        draw.rectangle([cx, top_y + 40, cx + col_w, top_y + 80], fill=p["bg"])
        
        draw.text((cx + 20, top_y + 16), p["num"], fill=p["color"], font=get_font(13, bold=True))
        draw.text((cx + 20, top_y + 36), p["title"], fill=(15, 23, 42), font=get_font(20, bold=True))
        draw.text((cx + 20, top_y + 60), p["desc"], fill=(100, 116, 139), font=get_font(12))

    # Helper function to draw a clean node box
    def draw_node(x, y, w, h, title, subtitle, points=[], border_col=(203, 213, 225), fill_col=(255, 255, 255), badge=None, badge_col=(2, 132, 199)):
        draw.rounded_rectangle([x, y, x + w, y + h], radius=12, fill=fill_col, outline=border_col, width=2)
        
        # Badge if present
        curr_y = y + 14
        if badge:
            draw.rounded_rectangle([x + 16, curr_y, x + 16 + len(badge)*8 + 14, curr_y + 22], radius=6, fill=badge_col)
            draw.text((x + 23, curr_y + 3), badge, fill=(255, 255, 255), font=get_font(10, bold=True))
            curr_y += 30

        # Title
        draw.text((x + 16, curr_y), title, fill=(15, 23, 42), font=get_font(17, bold=True))
        curr_y += 24

        # Subtitle
        if subtitle:
            draw.text((x + 16, curr_y), subtitle, fill=(100, 116, 139), font=get_font(13))
            curr_y += 20

        # Points
        if points:
            draw.line([x + 16, curr_y + 4, x + w - 16, curr_y + 4], fill=(241, 245, 249), width=1)
            curr_y += 12
            for pt in points:
                draw.text((x + 16, curr_y), "•", fill=border_col, font=get_font(14, bold=True))
                draw.text((x + 28, curr_y), pt, fill=(51, 65, 85), font=get_font(12))
                curr_y += 20

    # ---------------------------------------------------------
    # STAGE 1 NODES: INWARD & STACKING
    # ---------------------------------------------------------
    c1_x = start_x + 20
    c_w = col_w - 40

    # Node 1.1: Grain Consignment Arrival
    draw_node(c1_x, 260, c_w, 160, "1. Grain Consignment Arrival", "Depot truck arrives at godown gate", [
        "Commodity: Wheat, Rice, Sugar, Salt, Oil, Dals",
        "Source: FCI Railhead / State Buffer Depots",
        "Weighbridge gross tare verification",
    ], border_col=(2, 132, 199), badge="ENTRY GATE", badge_col=(2, 132, 199))

    # Node 1.2: Quality & Moisture Testing
    draw_node(c1_x, 460, c_w, 160, "2. Quality & Moisture Check", "Field laboratory inspection protocol", [
        "Moisture meter test (Max 12-14% ceiling)",
        "Foreign matter & insect infestation check",
        "Gunny bag intactness & batch stamping",
    ], border_col=(100, 116, 139), badge="QC LAB TEST", badge_col=(100, 116, 139))

    # Node 1.3: Bay Assignment & Registration
    draw_node(c1_x, 660, c_w, 180, "3. Physical Bay Allocation", "Assigned to 12-Bay Layout (A-1 to B-6)", [
        "Assigned to optimal warehouse stack bay",
        "Auto-generates Batch ID (e.g. BATCH-WHT-101)",
        "Syncs to Firebase Realtime Database",
        "Generates Printable Vector QR Stack Card",
    ], border_col=(5, 150, 105), badge="DIGITAL TWIN", badge_col=(5, 150, 105))

    # Connect Stage 1
    draw_arrow(draw, (c1_x + c_w//2, 420), (c1_x + c_w//2, 460), color=(2, 132, 199))
    draw_arrow(draw, (c1_x + c_w//2, 620), (c1_x + c_w//2, 660), color=(2, 132, 199))

    # ---------------------------------------------------------
    # STAGE 2 NODES: STORAGE & MONITORING
    # ---------------------------------------------------------
    c2_x = start_x + (col_w + col_gap) + 20

    # Node 2.1: Continuous Ageing Tracking
    draw_node(c2_x, 260, c_w, 170, "4. Real-Time Ageing Matrix", "Automated chronological queueing", [
        "Fresh Stock (<30 Days): Normal holding",
        "Ageing Notice (30-60 Days): Queued next",
        "Old Stock Alert (>60 Days): High priority",
        "Critical Expiry (>90 Days): Mandatory pick",
    ], border_col=(99, 102, 241), badge="FIFO ENGINE", badge_col=(99, 102, 241))

    # Node 2.2: Environmental Monsoon Trigger
    draw_node(c2_x, 470, c_w, 170, "5. Monsoon Weather Protocol", "Relative humidity sensor trigger (>75% RH)", [
        "Automated humidity threshold monitor",
        "Flags Sugar, Salt & Chana Dal for urgency",
        "Prevents caking, clump formation & fungus",
        "Auto-boosts queue rank ahead of dry grain",
    ], border_col=(217, 119, 6), badge="WEATHER RULE", badge_col=(217, 119, 6))

    # Node 2.3: Special Status & Driage Handling
    draw_node(c2_x, 680, c_w, 200, "6. Special Status Management", "Fumigation & Driage adjustments", [
        "Aluminium Phosphide (ALP) 7-day gas cover",
        "Status: 'Under Fumigation' -> Safe FIFO skip",
        "In-Situ Spillage & Evaporation Driage tool",
        "Adjusts ledger balance to stop phantom jams",
    ], border_col=(100, 116, 139), badge="STATUTORY LOCK", badge_col=(100, 116, 139))

    # Connect Stage 1 to 2
    draw_arrow(draw, (c1_x + c_w, 750), (c2_x, 345), color=(99, 102, 241), text="Realtime Sync")
    # Connect Stage 2 nodes
    draw_arrow(draw, (c2_x + c_w//2, 430), (c2_x + c_w//2, 470), color=(99, 102, 241))
    draw_arrow(draw, (c2_x + c_w//2, 640), (c2_x + c_w//2, 680), color=(99, 102, 241))

    # ---------------------------------------------------------
    # STAGE 3 NODES: FIFO ALLOCATION ENGINE
    # ---------------------------------------------------------
    c3_x = start_x + 2 * (col_w + col_gap) + 20

    # Node 3.1: Indent Demand Request
    draw_node(c3_x, 260, c_w, 160, "7. FPS Indent Requisition", "Fair Price Shop submits monthly quota", [
        "Dealer selects FPS (e.g. FPS-101)",
        "Selects Commodity (e.g. Wheat)",
        "Inputs Required Qty (e.g. 100 Quintals)",
        "System checks active godown balance",
    ], border_col=(5, 150, 105), badge="DEMAND INPUT", badge_col=(5, 150, 105))

    # Node 3.2: Algorithmic Multi-Batch Auto-Split
    draw_node(c3_x, 460, c_w, 250, "8. Multi-Batch Auto-Split", "Greedy oldest-first mathematical slicing", [
        "Filters Eligible & Unlocked batches",
        "Sorts batches strictly: receiptDate ASC",
        "Example Execution (100 Q Wheat Order):",
        "  • Split #1: BATCH-WHT-101 (85d old) -> 40 Q (100%)",
        "  • Split #2: BATCH-WHT-102 (35d old) -> 60 Q (Partial)",
        "Result: 100 Q fulfilled; zero aged grain left behind",
    ], border_col=(5, 150, 105), fill_col=(240, 253, 244), badge="CORE INNOVATION", badge_col=(5, 150, 105))

    # Node 3.3: Manual Override Route
    draw_node(c3_x, 750, c_w, 170, "9. Manual Override Gate", "Controlled exception bypass option", [
        "Operator toggles 'Manual Batch Override'",
        "Selecting newer batch triggers FIFO VIOLATION",
        "Blocks dispatch until Exception Form signed",
        "Mandates Reason Code + Officer Credentials",
    ], border_col=(225, 29, 72), badge="SECURITY GATE", badge_col=(225, 29, 72))

    # Connect Stage 2 to 3
    draw_arrow(draw, (c2_x + c_w, 345), (c3_x, 340), color=(5, 150, 105), text="Active Stocks")
    # Connect Stage 3 nodes
    draw_arrow(draw, (c3_x + c_w//2, 420), (c3_x + c_w//2, 460), color=(5, 150, 105))
    draw_arrow(draw, (c3_x + c_w//2, 710), (c3_x + c_w//2, 750), color=(225, 29, 72), text="If Override")

    # ---------------------------------------------------------
    # STAGE 4 NODES: DISPATCH & DELIVERY CHALLAN
    # ---------------------------------------------------------
    c4_x = start_x + 3 * (col_w + col_gap) + 20

    # Node 4.1: Exception Sign-off Modal
    draw_node(c4_x, 260, c_w, 180, "10. Statutory Exception Modal", "Formal approval for non-FIFO dispatch", [
        "Reason: Physical Blocked, Package Damaged",
        "Field remarks: 'Corridor maintenance aisle 4'",
        "Signed by: Assistant Godown Officer (AGO)",
        "Permanently logged in public audit register",
    ], border_col=(225, 29, 72), badge="AUDIT COMPLIANCE", badge_col=(225, 29, 72))

    # Node 4.2: Delivery Challan Generation
    draw_node(c4_x, 480, c_w, 200, "11. Delivery Challan (PDS-DC-04)", "Official Government Commodity Gate Pass", [
        "Auto-updates remaining batch quantities",
        "Itemizes all batch splits & bag lot numbers",
        "Embeds Vehicle No (DL-1LM-4402) & Driver",
        "Generates Scannable Gate-Pass Vector QR",
        "Printable for physical transporter handover",
    ], border_col=(217, 119, 6), badge="OFFICIAL GATE PASS", badge_col=(217, 119, 6))

    # Node 4.3: Physical Gate Check
    draw_node(c4_x, 720, c_w, 150, "12. Exit Gate Verification", "Physical truck release inspection", [
        "Security officer scans Challan QR code",
        "Validates bag count against digital ledger",
        "Truck released for road transit to FPS",
    ], border_col=(100, 116, 139), badge="PHYSICAL SECURITY", badge_col=(100, 116, 139))

    # Connect Stage 3 to 4
    draw_arrow(draw, (c3_x + c_w, 580), (c4_x, 580), color=(5, 150, 105), text="FIFO Approved")
    draw_arrow(draw, (c3_x + c_w, 835), (c4_x, 350), color=(225, 29, 72), text="Exception Path")
    draw_arrow(draw, (c4_x + c_w//2, 440), (c4_x + c_w//2, 480), color=(225, 29, 72))
    draw_arrow(draw, (c4_x + c_w//2, 680), (c4_x + c_w//2, 720), color=(217, 119, 6))

    # ---------------------------------------------------------
    # STAGE 5 NODES: TRACEABILITY & RECALL
    # ---------------------------------------------------------
    c5_x = start_x + 4 * (col_w + col_gap) + 20

    # Node 5.1: Downstream FPS Receipt
    draw_node(c5_x, 260, c_w, 160, "13. Fair Price Shop Receipt", "Point of sale arrival & distribution", [
        "Ration Kendra receives verified fresh bags",
        "Dealer confirms Challan QR code",
        "Biometric ePDS distribution to beneficiaries",
        "Zero moldy / weevil-damaged food grains",
    ], border_col=(5, 150, 105), badge="BENEFICIARY TRUST", badge_col=(5, 150, 105))

    # Node 5.2: Downstream Traceability
    draw_node(c5_x, 460, c_w, 180, "14. Batch-to-FPS Traceability", "End-to-end supply chain transparency", [
        "Select any Batch ID to see all recipient shops",
        "Displays dispatch dates, vehicle & quintals",
        "Permanent tamper-evident audit history",
        "Tracks every kilogram across the district",
    ], border_col=(2, 132, 199), badge="FULL AUDIT TRAIL", badge_col=(2, 132, 199))

    # Node 5.3: Emergency Recall Workflow
    draw_node(c5_x, 680, c_w, 220, "15. Statutory Food Recall", "Single-click containment mechanism", [
        "Triggered if QC lab reports defect or pest",
        "Action: 'Freeze & Recall Batch'",
        "  1. Freezes remaining godown stock to Quality Hold",
        "  2. Transmits emergency halt alert to all shops",
        "  3. Prevents consumption within minutes of alert",
    ], border_col=(225, 29, 72), fill_col=(255, 241, 242), badge="RECALL MECHANISM", badge_col=(225, 29, 72))

    # Connect Stage 4 to 5
    draw_arrow(draw, (c4_x + c_w, 795), (c5_x, 340), color=(5, 150, 105), text="Transit to FPS")
    draw_arrow(draw, (c5_x + c_w//2, 420), (c5_x + c_w//2, 460), color=(2, 132, 199))
    draw_arrow(draw, (c5_x + c_w//2, 640), (c5_x + c_w//2, 680), color=(225, 29, 72), text="On Quality Alert")

    # ---------------------------------------------------------
    # 3. BOTTOM SUMMARY STATS BAR (Pure White with Crisp Badges)
    # ---------------------------------------------------------
    bar_y = H - 145
    draw.rounded_rectangle([60, bar_y, W - 60, bar_y + 95], radius=14, fill=(248, 250, 252), outline=(203, 213, 225), width=2)
    
    stats = [
        ("90%+ GRAIN ROT REDUCTION", "Greedy FIFO eliminates stocks older than 60-90 days", (5, 150, 105)),
        ("100% AUDIT READY", "All non-FIFO movements require mandatory AGO officer sign-off", (31, 73, 125)),
        ("SUB-50ms REALTIME SYNC", "Firebase RTDB keeps Inward, Weighbridge, and Gates coordinated", (2, 132, 199)),
        ("ZERO PHANTOM STOCKS", "In-situ driage & spillage deductions keep ledger in physical balance", (217, 119, 6)),
        ("RAPID STATUTORY RECALL", "Single-click halts downstream distribution across all recipient shops", (225, 29, 72)),
    ]

    bx = 85
    bw = (W - 170) // 5
    for title, subtitle, col in stats:
        draw.rounded_rectangle([bx, bar_y + 12, bx + 12, bar_y + 83], radius=4, fill=col)
        draw.text((bx + 22, bar_y + 20), title, fill=col, font=get_font(14, bold=True))
        
        words = subtitle.split()
        l1, l2 = "", ""
        for w in words:
            if len(l1 + " " + w) < 32 and not l2:
                l1 += (" " + w if l1 else w)
            else:
                l2 += (" " + w if l2 else w)
        draw.text((bx + 22, bar_y + 44), l1, fill=(51, 65, 85), font=get_font(11))
        if l2:
            draw.text((bx + 22, bar_y + 62), l2, fill=(51, 65, 85), font=get_font(11))

        bx += bw

    # Save high-res PNG image
    img.save(OUTPUT_PATH, "PNG", quality=95)
    print(f"Flowchart successfully generated at: {OUTPUT_PATH}")

if __name__ == "__main__":
    render_flowchart()
