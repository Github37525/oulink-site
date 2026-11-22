#!/usr/bin/env python3
"""
Upgrade all 20 editorial industrial photographs in public/assets/editorial/*.jpg
to ultra-high-resolution Hasselblad-grade commercial catalog macro & documentary photos.

- Preserves exact original aspect ratios (zero CLS / zero layout shift with App.jsx width/height attributes).
- Category macro cards: 1104px - 1190px wide (3.89x - 5.33x linear resolution upgrade).
- Hero, panorama & engineering scenes: 1440px - 1920px wide (up to 4.00x linear resolution upgrade).
- Outputs optimized Progressive JPEGs (quality 88-92, ~80KB-300KB).
"""

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import io
import json
import os
from pathlib import Path
import subprocess
import sys
from PIL import Image, ImageFilter

REPO_ROOT = Path(r"e:\官网\oulink-site")
EDITORIAL_DIR = REPO_ROOT / "public" / "assets" / "editorial"
IMAGE_GATEWAY = Path(r"e:\官网\tools\image_gateway.py")
DEFAULT_SCRATCH = Path(
    r"C:\Users\lth\.gemini\antigravity\brain\b134a70d-b22f-44ef-a8f4-2961c240dbf5\scratch"
)

COMMON_STYLE_SUFFIX = (
    "Soft diffused commercial studio daylight and overhead softbox lighting, "
    "warm neutral matte stone-gray / off-white work surface harmonizing with #F6F5F1 warm paper canvas, "
    "subtle understated deep forest green (#084732) industrial fixture accent only where natural. "
    "Shot on Hasselblad H6D-100c medium format camera with HC Macro 120mm f/4 II lens, "
    "authentic industrial catalog photography, crisp micro-textures, natural contact shadows, "
    "deep tack-sharp focal plane. "
    "STRICTLY NO text, NO letters, NO numbers, NO serial codes, NO brand logos, NO watermarks, "
    "NO neon lights, NO cyberpunk glow, NO sci-fi laser lines, NO toy-like plastic."
)

# All 20 editorial photo seats with exact original aspect-ratio preserving HD dimensions
PHOTO_SPECS = [
    # --- 6 Category Macro Shots (1000px - 1200px wide) ---
    {
        "file": "cat-housing.jpg",
        "old_size": (306, 198),
        "target_size": (1190, 770),  # exact 17:11 = 1.5455
        "gen_size": "1536x1024",
        "prompt": (
            "Ultra-sharp commercial industrial catalog macro photograph of automotive multi-pin electrical connector housings "
            "on a warm light stone-gray studio surface (#EAE8E1). Featured in a clean 3/4 studio arrangement: "
            "one matte black 12-pin PBT-GF30 30% glass-fiber reinforced automotive female plug housing with precision keying ribs "
            "and terminal cavities, alongside a matching natural cream-white 6-pin automotive receptacle housing showing crisp "
            "internal pin partitions and mechanical locking tabs. " + COMMON_STYLE_SUFFIX
        ),
    },
    {
        "file": "cat-heavy.jpg",
        "old_size": (222, 204),
        "target_size": (1110, 1020),  # exact 37:34 = 1.0882
        "gen_size": "1536x1024",
        "prompt": (
            "Centered horizontal-band macro studio photograph (keep the entire connector assembly compactly framed within the middle 55% "
            "vertical band with generous clean warm light stone-gray studio surface above and below) of an IP6K9K heavy-duty sealed "
            "automotive commercial-vehicle multipole connector. Rugged matte black glass-fiber reinforced polyamide housing, "
            "visible brick-orange silicone peripheral flange seal ring, heavy-duty slide-lock lever and hybrid high-current power "
            "plus signal cavities in a 3/4 front-isometric view. " + COMMON_STYLE_SUFFIX
        ),
    },
    {
        "file": "cat-terminal.jpg",
        "old_size": (294, 198),
        "target_size": (1176, 792),  # exact 49:33 = 1.4848
        "gen_size": "1536x1024",
        "prompt": (
            "Extreme macro industrial catalog photograph of precision stamped-and-formed automotive crimp terminals neatly arrayed "
            "on a clean warm light warm-gray matte surface (#EAE8E1). Includes a precision carrier strip of tin-plated copper-alloy "
            "box-type female receptacle contacts alongside loose selective gold-plated and bright tin-plated male blade and pin crimp "
            "terminals, clearly revealing dual-beam contact springs, insulation crimp barrels, and conductor serrations. "
            + COMMON_STYLE_SUFFIX
        ),
    },
    {
        "file": "cat-seal.jpg",
        "old_size": (291, 198),
        "target_size": (1164, 792),  # exact 97:66 = 1.4697
        "gen_size": "1536x1024",
        "prompt": (
            "Tack-sharp macro industrial catalog photograph of automotive silicone single-wire seals (SWS) and solid cavity blind plugs "
            "neatly arranged in small clusters on a warm light off-white matte surface (#ECEAE3). Terracotta-orange, rust-red, and "
            "muted slate-blue molded fluorosilicone ribbed cylindrical wire seals showing crisp triple-ribbed umbrella sealing lips "
            "and precision central wire bores, paired with smooth white solid silicone cavity plugs. " + COMMON_STYLE_SUFFIX
        ),
    },
    {
        "file": "cat-lock.jpg",
        "old_size": (291, 198),
        "target_size": (1164, 792),  # exact 97:66 = 1.4697
        "gen_size": "1536x1024",
        "prompt": (
            "Macro commercial catalog photograph of 4 compact standalone automotive connector secondary locking clips "
            "(TPA terminal position assurance wedges and CPA connector position assurance retainers) neatly centered in the middle 60% "
            "of the frame with wide generous empty margins of clean warm light stone-gray surface (#E9E7E0) on all four sides. "
            "Precision injection-molded cool light-gray, natural ivory, and muted crimson PBT plastic wedge locks and snap retainers "
            "displaying sharp molded guide ribs and snap hooks; no cables, no hoses, nothing touching image borders. " + COMMON_STYLE_SUFFIX
        ),
    },
    {
        "file": "cat-seal-lock.jpg",
        "old_size": (207, 204),
        "target_size": (1104, 1088),  # exact 69:68 = 1.0147
        "gen_size": "1024x1024",
        "prompt": (
            "Square 1:1 studio knolling macro photograph with wide clean margins on all four sides (keep all parts compactly grouped "
            "within the central 55% area of the square frame so nothing is near any edge, surrounded by clean warm off-white matte surface #ECEAE3): "
            "three ribbed terracotta-orange silicone single-wire seals, two white solid cavity blind plugs, and two small precision molded "
            "light-gray and dark forest-green (#084732) TPA/CPA secondary locking clips arranged neatly in two compact rows. " + COMMON_STYLE_SUFFIX
        ),
    },
    # --- 14 Page Heroes, Panoramas & Engineering Documentary Photos (1440px - 1920px wide) ---
    {
        "file": "home-hero-connector.jpg",
        "old_size": (480, 504),
        "target_size": (1440, 1512),  # exact 20:21 = 0.9524
        "gen_size": "1024x1536",
        "prompt": (
            "Flagship editorial commercial studio photograph for an automotive connector supplier homepage hero, composed in a balanced "
            "near-square vertical frame. On a refined warm light limestone-gray architectural surface (#ECEAE3): a hero mated pair of "
            "precision black PBT-GF30 automotive sealed multi-pin connectors (showing internal cream insulator face and subtle dark forest-green "
            "#084732 silicone seal gasket), accompanied in the foreground by four gleaming tin-and-gold-plated precision crimp terminals and "
            "three ribbed orange silicone wire seals arranged with Swiss editorial precision. " + COMMON_STYLE_SUFFIX
        ),
    },
    {
        "file": "home-harness.jpg",
        "old_size": (513, 267),
        "target_size": (1710, 890),  # exact 171:89 = 1.9213
        "gen_size": "1536x1024",
        "prompt": (
            "Wide horizontal editorial industrial photograph (1.92:1 composition focused in the horizontal center band) of a professionally "
            "manufactured multi-branch automotive low-voltage wire harness assembly resting on a clean warm light-gray engineering workbench. "
            "Main trunk neatly wrapped in black abrasion-resistant fleece tape and split corrugated loom tubing, branching cleanly via molded "
            "junction clips into colored thin-wall automotive wires terminated with multiple black and gray sealed multi-pin automotive connectors. "
            + COMMON_STYLE_SUFFIX
        ),
    },
    {
        "file": "products-hero.jpg",
        "old_size": (627, 339),
        "target_size": (1672, 904),  # exact 209:113 = 1.8496
        "gen_size": "1536x1024",
        "prompt": (
            "Wide horizontal 1.85:1 commercial catalog hero photograph with generous clean margins at top, bottom, left, and right "
            "(keep all objects wholly inside the central 60% horizontal band on a warm off-white surface #F0EFEA, nothing touching any frame edge): "
            "a standalone matte-black 6-pin sealed automotive waterproof connector housing featuring a crisp bright-ochre/yellow TPA front "
            "secondary lock insert, displayed side-by-side with four gleaming stamped metal crimp terminals and four ribbed terracotta-orange "
            "silicone single-wire seals in a balanced horizontal studio arrangement; no loose wires exiting the frame. " + COMMON_STYLE_SUFFIX
        ),
    },
    {
        "file": "solutions-hero.jpg",
        "old_size": (642, 570),
        "target_size": (1498, 1330),  # exact 107:95 = 1.1263
        "gen_size": "1536x1024",
        "prompt": (
            "Editorial engineering studio photograph (composed comfortably inside a 1.13:1 central frame) on a warm matte gray inspection bench: "
            "an automotive wire harness sub-assembly with mated multi-way sealed connectors placed next to a brushed satin stainless-steel "
            "mechanical vernier caliper (pure blank brushed metal beam without any numbers or digital LCD screen) and cylindrical steel pin gauges, "
            "conveying precision interface selection and dimensional verification. " + COMMON_STYLE_SUFFIX
        ),
    },
    {
        "file": "solutions-bom-kit.jpg",
        "old_size": (669, 330),
        "target_size": (1784, 880),  # exact 223:110 = 2.0273
        "gen_size": "1536x1024",
        "prompt": (
            "Wide 2:1 panoramic flat-lay knolling studio photograph (all components strictly aligned along the horizontal middle band with generous "
            "clean warm ivory-gray surface #F1EFEA above and below) illustrating a complete 4-part kitted automotive connector BOM from left to right: "
            "(1) matte black multi-pin PBT-GF30 connector housing, (2) light-gray molded TPA secondary locking wedge, (3) a neat row of gleaming "
            "stamped metal crimp terminals, and (4) a neat row of ribbed terracotta-orange silicone wire seals and white cavity plugs. "
            + COMMON_STYLE_SUFFIX
        ),
    },
    {
        "file": "solutions-caliper.jpg",
        "old_size": (678, 405),
        "target_size": (1808, 1080),  # exact 226:135 = 1.6741
        "gen_size": "1536x1024",
        "prompt": (
            "Close-up industrial engineering metrology photograph (1.67:1 horizontal composition) on a warm light-gray anti-static mat: "
            "two matching multi-pin automotive connector housings—one matte black original housing and one natural cream-white PBT prototype sample—"
            "placed side by side for Pin-to-Pin cross-reference verification, while the precision steel jaws of a brushed stainless-steel mechanical "
            "caliper (no digital LCD screen, no readable numbers) measure the mating shroud width of the connector. " + COMMON_STYLE_SUFFIX
        ),
    },
    {
        "file": "solutions-system-latch.jpg",
        "old_size": (453, 321),
        "target_size": (1510, 1070),  # exact 151:107 = 1.4112
        "gen_size": "1536x1024",
        "prompt": (
            "Macro 3/4 studio photograph of an automotive powertrain-grade sealed wire-to-board / wire-to-wire multi-pin connector assembly "
            "on a warm stone-gray anodized plate. Matte charcoal-black glass-filled nylon housing featuring a prominent crimson-red CPA "
            "(Connector Position Assurance) sliding secondary lock latch engaged on top, ribbed rear strain-relief boot, and neatly bundled "
            "black automotive harness sheath. Crisp mechanical detail on the red CPA lock mechanism. " + COMMON_STYLE_SUFFIX
        ),
    },
    {
        "file": "quality-hero-lot.jpg",
        "old_size": (619, 624),
        "target_size": (1486, 1498),  # 0.9920 (~1:1 square)
        "gen_size": "1024x1024",
        "prompt": (
            "Square 1:1 overhead-3/4 editorial quality-control studio photograph with wide clean margins on all four sides "
            "(all items completely contained within the central 68% of the square frame on a clean smooth warm light-gray inspection desk #E9E7E0, "
            "nothing touching or cut off at any border): one sealed translucent metallic-silver ESD moisture-barrier zip pouch containing "
            "gleaming tin-plated automotive crimp terminals (with a minimalist blank white sticker displaying ONLY pure vertical black barcode bars "
            "and zero letters or numbers), two black automotive connector housings beside the pouch, and a compact dark-charcoal handheld "
            "industrial barcode scanner resting neatly at the upper right. " + COMMON_STYLE_SUFFIX
        ),
    },
    {
        "file": "quality-iqc-loupe.jpg",
        "old_size": (519, 165),
        "target_size": (1730, 550),  # exact 173:55 = 3.1455 ultra-wide!
        "gen_size": "1536x1024",
        "prompt": (
            "Ultra-wide 3.15:1 letterbox center-band composition (keep all key subjects—gloved hands, optical loupe, and terminals—strictly "
            "within the narrow middle 32% horizontal strip of the frame, leaving soft out-of-focus warm light-gray studio background in the top 34% "
            "and bottom 34% for panoramic cropping): quality inspector hands wearing clean white lint-free nitrile ESD gloves holding a precision "
            "matte-black metal optical inspection loupe magnifier over a row of gleaming automotive metal crimp terminals and black housings on "
            "a light-gray inspection mat under bright neutral daylight. " + COMMON_STYLE_SUFFIX
        ),
    },
    {
        "file": "quality-warehouse.jpg",
        "old_size": (519, 165),
        "target_size": (1730, 550),  # exact 173:55 = 3.1455 ultra-wide!
        "gen_size": "1536x1024",
        "prompt": (
            "Ultra-wide 3.15:1 panoramic architectural industrial photograph (compose the main perspective corridor and storage bins cleanly across "
            "the middle 35% horizontal band of the frame for ultra-wide cropping): a spotless, brightly lit modern climate-controlled automotive "
            "electronic components warehouse aisle. Powder-coated light-gray steel modular shelving racks neatly holding uniform dark forest-green "
            "(#084732) and slate-gray ESD modular stacking tote bins and sealed moisture-proof component reel boxes in crisp geometric perspective, "
            "warm clean architectural LED lighting, zero clutter, strictly no text or signs. " + COMMON_STYLE_SUFFIX
        ),
    },
    {
        "file": "quality-barcode-scan.jpg",
        "old_size": (519, 165),
        "target_size": (1730, 550),  # exact 173:55 = 3.1455 ultra-wide!
        "gen_size": "1536x1024",
        "prompt": (
            "Ultra-wide 3.15:1 letterbox center-band documentary close-up (keep the scanner, gloved hand, barcode strip, and sealed component boxes "
            "strictly inside the middle 32% horizontal band of the image, with clean softly blurred warm-gray bench/background above and below): "
            "an outbound QC technician hand in a clean gray anti-static glove aiming an ergonomic dark-charcoal industrial handheld barcode scanner, "
            "projecting a thin realistic red optical aiming line onto a pure black-and-white vertical-stripe barcode sticker (zero text, zero numbers) "
            "on a sealed protective connector carton beside neatly packed trays of black automotive connectors. " + COMMON_STYLE_SUFFIX
        ),
    },
    {
        "file": "about-workbench-wide.jpg",
        "old_size": (1194, 522),
        "target_size": (1920, 840),  # 2.2857 wide panorama!
        "gen_size": "1536x1024",
        "prompt": (
            "Grand 2.29:1 wide panoramic editorial studio overhead-3/4 photograph (compose the entire workbench arrangement smoothly across the "
            "middle 65% horizontal band) of an automotive connector engineering & supply-chain workbench. Across a wide warm stone-gray matte table: "
            "an unlabelled pure geometric CAD line-art cross-section drawing (strictly no text or numbers), a gleaming copper-alloy stamped terminal "
            "carrier reel, an organized compartment tray of black/cream/gray automotive multi-pin connector housings and orange silicone wire seals, "
            "a neatly taped automotive wire harness branch, and a satin steel vernier caliper bathed in soft natural window daylight. "
            + COMMON_STYLE_SUFFIX
        ),
    },
    {
        "file": "contact-hero-connector.jpg",
        "old_size": (681, 438),
        "target_size": (1816, 1168),  # exact 227:146 = 1.5548
        "gen_size": "1536x1024",
        "prompt": (
            "Clean commercial industrial catalog macro photograph (1.55:1 horizontal framing) on a warm off-white paper-toned surface (#F2F0EB): "
            "a precision black 6-cavity automotive connector housing with a crisp natural cream-white front insulator insert angled at 3/4 view, "
            "neatly accompanied on the right by six gleaming tin-plated precision crimp terminals and six ribbed terracotta-red silicone single-wire "
            "seals ready for BOM kitting verification. " + COMMON_STYLE_SUFFIX
        ),
    },
    {
        "file": "contact-sidebar-connector.jpg",
        "old_size": (375, 354),
        "target_size": (1500, 1416),  # exact 125:118 = 1.0593
        "gen_size": "1024x1024",
        "prompt": (
            "Square 1:1 central-framed macro studio still-life with wide clean margins on all four sides "
            "(all items compactly grouped inside the central 62% of the square frame on a warm light stone-gray surface #ECEAE3, "
            "nothing touching or cut off by any border): two compact precision automotive sealed multi-pin connectors "
            "(matte black PBT-GF30 shells with subtle deep forest-green #084732 interfacial seal rings and crisp keying slots) "
            "paired in the foreground with five precision gold-and-tin-plated contact pins. " + COMMON_STYLE_SUFFIX
        ),
    },
]


def crop_to_aspect(img: Image.Image, target_w: int, target_h: int, bias_y: float = 0.5) -> Image.Image:
    src_w, src_h = img.size
    target_ratio = target_w / target_h
    src_ratio = src_w / src_h

    if abs(src_ratio - target_ratio) < 1e-4:
        return img

    if src_ratio > target_ratio:
        # Source is wider than target -> crop left/right symmetrically
        new_w = int(round(src_h * target_ratio))
        left = max(0, (src_w - new_w) // 2)
        return img.crop((left, 0, left + new_w, src_h))
    else:
        # Source is taller than target -> crop top/bottom using bias_y
        new_h = int(round(src_w / target_ratio))
        top = int(round((src_h - new_h) * bias_y))
        top = max(0, min(src_h - new_h, top))
        return img.crop((0, top, src_w, top + new_h))


def encode_optimal_progressive_jpeg(img: Image.Image, min_kb: int = 80, max_kb: int = 300) -> tuple[bytes, int, int]:
    """
    Encode as Progressive JPEG within quality 88-92, selecting subsampling (0=4:4:4 vs 2=4:2:0)
    so file size cleanly lands in the ~80KB - 300KB sweet spot whenever possible.
    """
    candidates = [
        (92, 0),
        (90, 0),
        (88, 0),
        (92, 2),
        (90, 2),
        (88, 2),
    ]
    best_bytes = None
    best_q = 90
    best_sub = 2

    for q, sub in candidates:
        buf = io.BytesIO()
        img.save(
            buf,
            format="JPEG",
            quality=q,
            progressive=True,
            optimize=True,
            subsampling=sub,
        )
        data = buf.getvalue()
        kb = len(data) / 1024.0
        if min_kb <= kb <= max_kb:
            return data, q, sub
        best_bytes = data
        best_q = q
        best_sub = sub
        if kb < min_kb and q == 92 and sub == 0:
            # Highest fidelity in 88-92 already compact due to clean studio background
            return data, q, sub

    # If even (88, 2) > max_kb, apply ultra-gentle surface micro-noise smoothing while keeping crisp edges at q=88
    if best_bytes and len(best_bytes) / 1024.0 > max_kb:
        smoothed = img.filter(ImageFilter.SMOOTH_MORE)
        blended = Image.blend(img, smoothed, alpha=0.22).filter(
            ImageFilter.UnsharpMask(radius=0.9, percent=45, threshold=8)
        )
        buf = io.BytesIO()
        blended.save(buf, format="JPEG", quality=88, progressive=True, optimize=True, subsampling=2)
        data = buf.getvalue()
        if len(data) < len(best_bytes):
            return data, 88, 2

    return best_bytes, best_q, best_sub


def generate_single_raw(spec: dict, scratch_dir: Path, model: str) -> Path:
    slug = Path(spec["file"]).stem
    prompt_path = scratch_dir / "prompts" / f"{slug}.txt"
    raw_dir = scratch_dir / "raw" / slug
    prompt_path.parent.mkdir(parents=True, exist_ok=True)
    prompt_path.write_text(spec["prompt"], encoding="utf-8")

    # Check if already generated
    for ext in (".png", ".jpg", ".webp"):
        existing = raw_dir / f"image{ext}"
        if existing.exists() and existing.stat().st_size > 10_000:
            print(f"[SKIP-GEN] {spec['file']} already has raw image: {existing.name} ({existing.stat().st_size} B)")
            return existing

    # If raw_dir exists from an interrupted attempt with response.json, try --resume
    resp_json = raw_dir / "response.json"
    env = os.environ.copy()
    if not env.get("OPENAI_API_KEY") and env.get("ZAPI_API_KEY"):
        env["OPENAI_API_KEY"] = env["ZAPI_API_KEY"]

    if resp_json.exists():
        rec_dir = scratch_dir / "raw" / f"{slug}-recovered"
        cmd = [
            sys.executable,
            str(IMAGE_GATEWAY),
            "--resume",
            str(resp_json),
            "--out-dir",
            str(rec_dir),
        ]
        subprocess.run(cmd, env=env, check=True)
        for ext in (".png", ".jpg", ".webp"):
            p = rec_dir / f"image{ext}"
            if p.exists():
                return p

    cmd = [
        sys.executable,
        str(IMAGE_GATEWAY),
        "--prompt-file",
        str(prompt_path),
        "--out-dir",
        str(raw_dir),
        "--model",
        model,
        "--size",
        spec["gen_size"],
        "--quality",
        "high",
        "--generate",
    ]
    print(f"[GEN-START] {spec['file']} ({spec['gen_size']})...", flush=True)
    res = subprocess.run(cmd, env=env, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"Failed generating {spec['file']}: {res.stderr.strip()} | {res.stdout.strip()}")

    for ext in (".png", ".jpg", ".webp"):
        p = raw_dir / f"image{ext}"
        if p.exists():
            print(f"[GEN-DONE]  {spec['file']} -> {p.stat().st_size} bytes", flush=True)
            return p
    raise FileNotFoundError(f"No output image found in {raw_dir}")


def process_single_photo(spec: dict, scratch_dir: Path) -> dict:
    slug = Path(spec["file"]).stem
    raw_path = None
    for candidate_dir in (scratch_dir / "raw" / slug, scratch_dir / "raw" / f"{slug}-recovered"):
        for ext in (".png", ".jpg", ".webp"):
            p = candidate_dir / f"image{ext}"
            if p.exists():
                raw_path = p
                break
        if raw_path:
            break

    if not raw_path:
        raise FileNotFoundError(f"Missing raw image for {spec['file']} under {scratch_dir / 'raw'}")

    target_w, target_h = spec["target_size"]
    bias_y = spec.get("crop_bias_y", 0.5)

    with Image.open(raw_path) as im:
        rgb = im.convert("RGB")
        cropped = crop_to_aspect(rgb, target_w, target_h, bias_y=bias_y)
        resized = cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)
        # Subtle commercial macro sharpening for glass-fiber & metallic micro-texture
        sharpened = resized.filter(ImageFilter.UnsharpMask(radius=1.05, percent=58, threshold=3))

    jpg_bytes, used_q, used_sub = encode_optimal_progressive_jpeg(sharpened)
    dest_path = EDITORIAL_DIR / spec["file"]
    dest_path.write_bytes(jpg_bytes)

    old_w, old_h = spec["old_size"]
    return {
        "file": spec["file"],
        "old": f"{old_w}x{old_h}",
        "new": f"{target_w}x{target_h}",
        "scale_w": round(target_w / old_w, 2),
        "old_ratio": round(old_w / old_h, 4),
        "new_ratio": round(target_w / target_h, 4),
        "kb": round(len(jpg_bytes) / 1024.0, 1),
        "quality": used_q,
        "subsampling": "4:4:4" if used_sub == 0 else "4:2:0",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--step", choices=["all", "generate", "process"], default="all")
    parser.add_argument("--scratch-dir", type=Path, default=DEFAULT_SCRATCH)
    parser.add_argument("--model", default="gpt-image-2.5")
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--only", nargs="*", help="Optional subset of filenames to generate/process")
    args = parser.parse_args()

    selected = PHOTO_SPECS
    if args.only:
        only_set = set(args.only)
        selected = [s for s in PHOTO_SPECS if s["file"] in only_set or Path(s["file"]).stem in only_set]

    if args.step in ("all", "generate"):
        errors = []
        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            fut_map = {pool.submit(generate_single_raw, spec, args.scratch_dir, args.model): spec for spec in selected}
            for fut in as_completed(fut_map):
                spec = fut_map[fut]
                try:
                    fut.result()
                except Exception as exc:
                    print(f"[ERROR] {spec['file']}: {exc}", file=sys.stderr, flush=True)
                    errors.append((spec["file"], str(exc)))
        if errors:
            print(f"Generation had {len(errors)} error(s): {errors}", file=sys.stderr)
            sys.exit(1)

    if args.step in ("all", "process"):
        report = []
        for spec in selected:
            info = process_single_photo(spec, args.scratch_dir)
            report.append(info)
            print(
                f"[OK] {info['file']:30s} {info['old']:9s} -> {info['new']:9s} "
                f"({info['scale_w']:.2f}x) | {info['kb']:6.1f} KB (q={info['quality']}, {info['subsampling']})"
            )
        report_path = args.scratch_dir / "upgrade_report.json"
        report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"\nProcessed {len(report)} file(s). Report saved to {report_path}")


if __name__ == "__main__":
    main()
