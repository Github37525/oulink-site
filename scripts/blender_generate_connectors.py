#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Parametric Automotive Connector 3D CAD Generator for Blender 5.3+
Generates 5 high-precision multi-part automotive connector assemblies (.glb),
verifies GLTF node/mesh hierarchy and triangle budgets (4,000 - 20,000 tris),
writes models-manifest.json, and renders wireframe QA previews.

Usage:
  "C:\\Program Files\\Blender Foundation\\Blender 5.3\\blender.exe" --background --python scripts/blender_generate_connectors.py
"""

import json
import math
import os
import struct
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
MODELS_OUT_DIR = os.path.join(PROJECT_ROOT, "public", "assets", "models")
PREVIEW_OUT_DIR = os.path.join(PROJECT_ROOT, "qa", "blender-preview")
MANIFEST_PATH = os.path.join(MODELS_OUT_DIR, "models-manifest.json")

TARGET_ENVELOPE = 2.40  # Normalized max bounding box dimension in scene units


# ==============================================================================
# 1. Scene & PBR Material Utilities
# ==============================================================================

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def make_pbr_material(name, base_color, metallic=0.08, roughness=0.45):
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name=name)
    if mat.node_tree is None:
        mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    if bsdf is None:
        bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = (
        base_color[0],
        base_color[1],
        base_color[2],
        1.0,
    )
    bsdf.inputs["Metallic"].default_value = float(metallic)
    bsdf.inputs["Roughness"].default_value = float(roughness)
    return mat


def get_industrial_palette():
    return {
        # Deep charcoal PBT-GF30 engineering polymer
        "pbt_charcoal": make_pbr_material("PBT_GF30_Charcoal", (0.095, 0.110, 0.106), metallic=0.06, roughness=0.46),
        # Deep forest PA66-GF35 high-temp nylon
        "pa66_forest": make_pbr_material("PA66_GF35_Forest", (0.038, 0.155, 0.112), metallic=0.07, roughness=0.42),
        # Ivory / natural dielectric insert nylon
        "pa66_ivory": make_pbr_material("PA66_Dielectric_Ivory", (0.76, 0.74, 0.68), metallic=0.04, roughness=0.48),
        # Warm brass / selective gold-plated terminals & secondary locks
        "brass_gold": make_pbr_material("CuSn_Selective_Gold", (0.79, 0.61, 0.23), metallic=0.88, roughness=0.25),
        # Amber engineering lock polymer (CPA / TPA / Wedge)
        "lock_amber": make_pbr_material("PBT_Lock_AmberGold", (0.76, 0.56, 0.18), metallic=0.22, roughness=0.36),
        # Silver-plated high-current copper contacts
        "silver_contact": make_pbr_material("Ag_Plated_Copper", (0.84, 0.85, 0.87), metallic=0.93, roughness=0.20),
        # CuNiSi spring bronze / tin-brass transition
        "spring_bronze": make_pbr_material("CuNiSi_Spring_Alloy", (0.66, 0.52, 0.30), metallic=0.85, roughness=0.29),
        # Terracotta / rust-red FVMQ fluorosilicone seal
        "seal_terracotta": make_pbr_material("FVMQ_Seal_Terracotta", (0.69, 0.21, 0.14), metallic=0.02, roughness=0.37),
        # Petrol-teal self-lubricating LSR silicone seal
        "seal_teal": make_pbr_material("LSR_Seal_Teal", (0.08, 0.37, 0.36), metallic=0.02, roughness=0.35),
        # Die-cast aluminum alloy housing
        "alu_diecast": make_pbr_material("AlSi12_Diecast", (0.63, 0.66, 0.68), metallic=0.86, roughness=0.31),
    }


# ==============================================================================
# 2. Parametric BMesh CAD Topology Kernel (Clean Quads / Regular Triangulation)
# ==============================================================================

def sample_line_2d(p0, p1, divs):
    """Return points from p0 (inclusive) to p1 (exclusive) divided into `divs` segments."""
    pts = []
    for i in range(divs):
        t = i / float(divs)
        pts.append((p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t))
    return pts


def rounded_rect_2d(w, h, r, corner_segs=6, divs_w=6, divs_h=4, cx=0.0, cz=0.0):
    """
    Generate CCW 2D loop [(x, z), ...] for a rounded rectangle with subdivided straight edges
    so lofted surfaces have uniform CAD quad grids instead of stretched polygons.
    """
    hw = max(w * 0.5, 1e-4)
    hh = max(h * 0.5, 1e-4)
    rad = min(max(r, 1e-4), hw * 0.95, hh * 0.95)

    pts = []
    # Bottom straight: (-hw+rad, -hh) -> (hw-rad, -hh)
    if hw - rad > 1e-4 and divs_w > 0:
        pts.extend(sample_line_2d((cx - hw + rad, cz - hh), (cx + hw - rad, cz - hh), divs_w))
    # Bottom-right arc: -pi/2 -> 0
    for i in range(corner_segs):
        ang = -math.pi * 0.5 + (math.pi * 0.5) * (i / float(corner_segs))
        pts.append((cx + hw - rad + rad * math.cos(ang), cz - hh + rad + rad * math.sin(ang)))
    # Right straight: (hw, -hh+rad) -> (hw, hh-rad)
    if hh - rad > 1e-4 and divs_h > 0:
        pts.extend(sample_line_2d((cx + hw, cz - hh + rad), (cx + hw, cz + hh - rad), divs_h))
    # Top-right arc: 0 -> pi/2
    for i in range(corner_segs):
        ang = 0.0 + (math.pi * 0.5) * (i / float(corner_segs))
        pts.append((cx + hw - rad + rad * math.cos(ang), cz + hh - rad + rad * math.sin(ang)))
    # Top straight: (hw-rad, hh) -> (-hw+rad, hh)
    if hw - rad > 1e-4 and divs_w > 0:
        pts.extend(sample_line_2d((cx + hw - rad, cz + hh), (cx - hw + rad, cz + hh), divs_w))
    # Top-left arc: pi/2 -> pi
    for i in range(corner_segs):
        ang = math.pi * 0.5 + (math.pi * 0.5) * (i / float(corner_segs))
        pts.append((cx - hw + rad + rad * math.cos(ang), cz + hh - rad + rad * math.sin(ang)))
    # Left straight: (-hw, hh-rad) -> (-hw, -hh+rad)
    if hh - rad > 1e-4 and divs_h > 0:
        pts.extend(sample_line_2d((cx - hw, cz + hh - rad), (cx - hw, cz - hh + rad), divs_h))
    # Bottom-left arc: pi -> 3*pi/2
    for i in range(corner_segs):
        ang = math.pi + (math.pi * 0.5) * (i / float(corner_segs))
        pts.append((cx - hw + rad + rad * math.cos(ang), cz - hh + rad + rad * math.sin(ang)))
    return pts


def stadium_2d(w, h, arc_segs=18, divs_straight=8, cx=0.0, cz=0.0):
    """Horizontal stadium (pill shape, w >= h) CCW loop [(x, z), ...]."""
    rad = h * 0.5
    half_flat = max(w * 0.5 - rad, 0.0)
    pts = []
    if half_flat > 1e-4 and divs_straight > 0:
        pts.extend(sample_line_2d((cx - half_flat, cz - rad), (cx + half_flat, cz - rad), divs_straight))
    for i in range(arc_segs):
        ang = -math.pi * 0.5 + math.pi * (i / float(arc_segs))
        pts.append((cx + half_flat + rad * math.cos(ang), cz + rad * math.sin(ang)))
    if half_flat > 1e-4 and divs_straight > 0:
        pts.extend(sample_line_2d((cx + half_flat, cz + rad), (cx - half_flat, cz + rad), divs_straight))
    for i in range(arc_segs):
        ang = math.pi * 0.5 + math.pi * (i / float(arc_segs))
        pts.append((cx - half_flat + rad * math.cos(ang), cz + rad * math.sin(ang)))
    return pts


def circle_2d(r, segs=32, cx=0.0, cz=0.0, phase=0.0):
    return [
        (cx + r * math.cos(phase + 2.0 * math.pi * i / segs), cz + r * math.sin(phase + 2.0 * math.pi * i / segs))
        for i in range(segs)
    ]


def loop_xz_at_y(pts_2d, y_val):
    return [(p[0], y_val, p[1]) for p in pts_2d]


def interp_loops_3d(loop_a, loop_b, steps):
    """Interpolate intermediate 3D loops between loop_a and loop_b (`steps` >= 1 segments)."""
    if steps <= 1:
        return [loop_a, loop_b]
    out = []
    n = len(loop_a)
    for s in range(steps + 1):
        t = s / float(steps)
        out.append([
            (
                loop_a[i][0] + (loop_b[i][0] - loop_a[i][0]) * t,
                loop_a[i][1] + (loop_b[i][1] - loop_a[i][1]) * t,
                loop_a[i][2] + (loop_b[i][2] - loop_a[i][2]) * t,
            )
            for i in range(n)
        ])
    return out


def add_lofted_loops(bm, loops_3d, close_ring=True, close_length=False, cap_start=False, cap_end=False):
    """
    Create quad strip topology across a list of 3D vertex rings of equal vertex count.
    """
    vert_rings = [[bm.verts.new(co) for co in ring] for ring in loops_3d]
    m = len(vert_rings)
    n = len(vert_rings[0])

    ring_pairs = m if close_length else (m - 1)
    seg_pairs = n if close_ring else (n - 1)

    for r in range(ring_pairs):
        r0 = vert_rings[r]
        r1 = vert_rings[(r + 1) % m]
        for i in range(seg_pairs):
            i1 = (i + 1) % n
            try:
                bm.faces.new((r0[i], r0[i1], r1[i1], r1[i]))
            except ValueError:
                pass

    if cap_start and close_ring and not close_length:
        # Cap start with concentric inner ring + center fan for clean topology
        c = Vector((0.0, 0.0, 0.0))
        for v in vert_rings[0]:
            c += v.co
        c /= float(n)
        mid_ring = [bm.verts.new(c.lerp(v.co, 0.52)) for v in vert_rings[0]]
        cv = bm.verts.new(c)
        for i in range(n):
            i1 = (i + 1) % n
            bm.faces.new((vert_rings[0][i1], vert_rings[0][i], mid_ring[i], mid_ring[i1]))
            bm.faces.new((mid_ring[i1], mid_ring[i], cv))

    if cap_end and close_ring and not close_length:
        c = Vector((0.0, 0.0, 0.0))
        for v in vert_rings[-1]:
            c += v.co
        c /= float(n)
        mid_ring = [bm.verts.new(c.lerp(v.co, 0.52)) for v in vert_rings[-1]]
        cv = bm.verts.new(c)
        for i in range(n):
            i1 = (i + 1) % n
            bm.faces.new((vert_rings[-1][i], vert_rings[-1][i1], mid_ring[i1], mid_ring[i]))
            bm.faces.new((mid_ring[i], mid_ring[i1], cv))

    return vert_rings


def add_hollow_tube_along_y(bm, outer_fn, inner_fn, y_stations, bevel_lip=0.018):
    """
    Build a watertight hollow shroud/collar along Y with smooth beveled front/back rims
    using pure quad rings (outer wall + front lip + inner wall + back lip).
    `outer_fn(y)` and `inner_fn(y)` return matching-count 2D XZ loops.
    `y_stations`: sorted list of Y coordinates from front (min Y) to back (max Y).
    """
    y_min = y_stations[0]
    y_max = y_stations[-1]

    loops = []
    # Outer wall from front to back
    for idx, y in enumerate(y_stations):
        loops.append(loop_xz_at_y(outer_fn(y), y))

    # Back rim transition (outer -> mid bevel -> inner)
    o_back = outer_fn(y_max)
    i_back = inner_fn(y_max)
    mid_back = [((o_back[k][0] + i_back[k][0]) * 0.5, (o_back[k][1] + i_back[k][1]) * 0.5) for k in range(len(o_back))]
    loops.append(loop_xz_at_y(mid_back, y_max + bevel_lip))
    loops.append(loop_xz_at_y(i_back, y_max))

    # Inner wall from back to front
    for y in reversed(y_stations[:-1]):
        loops.append(loop_xz_at_y(inner_fn(y), y))

    # Front rim mid bevel
    o_front = outer_fn(y_min)
    i_front = inner_fn(y_min)
    mid_front = [((o_front[k][0] + i_front[k][0]) * 0.5, (o_front[k][1] + i_front[k][1]) * 0.5) for k in range(len(o_front))]
    loops.append(loop_xz_at_y(mid_front, y_min - bevel_lip))

    add_lofted_loops(bm, loops, close_ring=True, close_length=True)


def add_revolved_profile_y(bm, profile_ry, segs=36, cx=0.0, cz=0.0, close_profile=True):
    """
    Revolve a 2D profile [(r, y), ...] 360 degrees around an axis parallel to Y at (cx, cz).
    If `close_profile=True`, connects last profile point back to first (ideal for hollow seals/sleeves).
    If `close_profile=False`, first/last points with r == 0 act as pole caps.
    """
    rings = []
    has_start_pole = (not close_profile) and abs(profile_ry[0][0]) < 1e-6
    has_end_pole = (not close_profile) and abs(profile_ry[-1][0]) < 1e-6

    body_pts = profile_ry[1 if has_start_pole else 0 : -1 if has_end_pole else len(profile_ry)]
    for r, y in body_pts:
        ring = []
        for s in range(segs):
            ang = 2.0 * math.pi * s / float(segs)
            ring.append((cx + r * math.cos(ang), y, cz + r * math.sin(ang)))
        rings.append(ring)

    vert_rings = add_lofted_loops(bm, rings, close_ring=True, close_length=close_profile)

    if has_start_pole:
        pv = bm.verts.new((cx, profile_ry[0][1], cz))
        r0 = vert_rings[0]
        for s in range(segs):
            s1 = (s + 1) % segs
            bm.faces.new((pv, r0[s1], r0[s]))

    if has_end_pole:
        pv = bm.verts.new((cx, profile_ry[-1][1], cz))
        rl = vert_rings[-1]
        for s in range(segs):
            s1 = (s + 1) % segs
            bm.faces.new((rl[s], rl[s1], pv))


def add_swept_closed_ring_xz(bm, path_2d, section_uy):
    """
    Sweep a closed 2D cross-section [(u_outward, y_axial), ...] along a closed CCW 2D path [(x, z), ...].
    Produces ultra-clean corrugated perimeter seals and gaskets!
    """
    n_path = len(path_2d)
    rings_3d = []
    for i in range(n_path):
        p_prev = path_2d[(i - 1) % n_path]
        p_curr = path_2d[i]
        p_next = path_2d[(i + 1) % n_path]

        tx = p_next[0] - p_prev[0]
        tz = p_next[1] - p_prev[1]
        tlen = max(math.hypot(tx, tz), 1e-6)
        tx /= tlen
        tz /= tlen
        # Outward normal in XZ plane for CCW loop is (+tz, -tx)
        nx = tz
        nz = -tx

        ring = []
        for u, y in section_uy:
            ring.append((p_curr[0] + nx * u, y, p_curr[1] + nz * u))
        rings_3d.append(ring)

    add_lofted_loops(bm, rings_3d, close_ring=True, close_length=True)


def add_subdivided_box(bm, cx, cy, cz, sx, sy, sz, nx=3, ny=3, nz=2, bevel_w=0.015, bevel_segs=2):
    """
    Create a clean subdivided & beveled CAD block merged into `bm`.
    """
    tmp = bmesh.new()
    bmesh.ops.create_cube(tmp, size=1.0)
    bmesh.ops.scale(tmp, vec=(sx, sy, sz), verts=tmp.verts)

    if bevel_w > 0 and bevel_segs > 0:
        bmesh.ops.bevel(
            tmp,
            geom=list(tmp.edges),
            offset=min(bevel_w, min(sx, sy, sz) * 0.28),
            offset_type='OFFSET',
            segments=bevel_segs,
            profile=0.5,
            clamp_overlap=True,
        )

    # Subdivide long spans if requested for crisp regular CAD grid
    sub_cuts = max(nx, ny, nz) - 1
    if sub_cuts > 0:
        long_edges = [
            e for e in tmp.edges
            if e.calc_length() > min(sx, sy, sz) * 0.65
        ]
        if long_edges:
            bmesh.ops.subdivide_edges(tmp, edges=long_edges, cuts=min(sub_cuts, 4), use_grid_fill=True)

    bmesh.ops.translate(tmp, vec=(cx, cy, cz), verts=tmp.verts)

    vmap = {}
    for v in tmp.verts:
        vmap[v.index] = bm.verts.new(v.co)
    for f in tmp.faces:
        try:
            bm.faces.new([vmap[v.index] for v in f.verts])
        except ValueError:
            pass
    tmp.free()


def add_sheet_strip_along_yz(bm, centerline_yz, half_width_fn, thickness, x_center=0.0, width_divs=4):
    """
    Extrude a stamped sheet-metal ribbon along a 2D (y, z) centerline with variable half-width `half_width_fn(t)`
    and constant `thickness`. Generates crisp quad grids ideal for springs, lances, and busbars!
    """
    m = len(centerline_yz)
    top_grid = []
    bot_grid = []

    for i in range(m):
        p_prev = centerline_yz[max(0, i - 1)]
        p_curr = centerline_yz[i]
        p_next = centerline_yz[min(m - 1, i + 1)]

        dy = p_next[0] - p_prev[0]
        dz = p_next[1] - p_prev[1]
        dlen = max(math.hypot(dy, dz), 1e-6)
        # Normal in YZ plane: (-dz, dy)
        ny = -dz / dlen
        nz = dy / dlen

        t_param = i / float(max(m - 1, 1))
        hw = half_width_fn(t_param)
        ht = thickness * 0.5

        row_top = []
        row_bot = []
        for j in range(width_divs + 1):
            u = -1.0 + 2.0 * (j / float(width_divs))
            x = x_center + u * hw
            row_top.append(bm.verts.new((x, p_curr[0] + ny * ht, p_curr[1] + nz * ht)))
            row_bot.append(bm.verts.new((x, p_curr[0] - ny * ht, p_curr[1] - nz * ht)))
        top_grid.append(row_top)
        bot_grid.append(row_bot)

    # Top & bottom faces
    for i in range(m - 1):
        for j in range(width_divs):
            bm.faces.new((top_grid[i][j], top_grid[i][j + 1], top_grid[i + 1][j + 1], top_grid[i + 1][j]))
            bm.faces.new((bot_grid[i][j + 1], bot_grid[i][j], bot_grid[i + 1][j], bot_grid[i + 1][j + 1]))

    # Left & right side walls
    for i in range(m - 1):
        bm.faces.new((bot_grid[i][0], top_grid[i][0], top_grid[i + 1][0], bot_grid[i + 1][0]))
        bm.faces.new((top_grid[i][-1], bot_grid[i][-1], bot_grid[i + 1][-1], top_grid[i + 1][-1]))

    # Start & end caps
    for j in range(width_divs):
        bm.faces.new((bot_grid[0][j], bot_grid[0][j + 1], top_grid[0][j + 1], top_grid[0][j]))
        bm.faces.new((top_grid[-1][j], top_grid[-1][j + 1], bot_grid[-1][j + 1], bot_grid[-1][j]))


def add_grid_cavity_block(
    bm,
    cols,
    rows,
    pitch_x,
    pitch_z,
    hole_w,
    hole_h,
    y_front,
    y_back,
    chamfer_depth=0.035,
    chamfer_flare=0.028,
    axial_segs=4,
    z_center=0.0,
):
    """
    Tiled Parametric Unit-Cell Manifold Generator:
    Creates a `cols x rows` multi-cavity rectangular housing core with 45-deg lead-in chamfers
    and zero boolean artifacts (100% quad topology!).
    """
    for r in range(rows):
        cz = z_center + (r - (rows - 1) * 0.5) * pitch_z
        for c in range(cols):
            cx = (c - (cols - 1) * 0.5) * pitch_x

            # Outer cell boundary (8 verts CCW)
            ox = pitch_x * 0.5
            oz = pitch_z * 0.5
            cell_outer = [
                (cx - ox, cz - oz),
                (cx, cz - oz),
                (cx + ox, cz - oz),
                (cx + ox, cz),
                (cx + ox, cz + oz),
                (cx, cz + oz),
                (cx - ox, cz + oz),
                (cx - ox, cz),
            ]

            def hole_loop(hw, hh):
                return [
                    (cx - hw, cz - hh),
                    (cx, cz - hh),
                    (cx + hw, cz - hh),
                    (cx + hw, cz),
                    (cx + hw, cz + hh),
                    (cx, cz + hh),
                    (cx - hw, cz + hh),
                    (cx - hw, cz),
                ]

            hw_in = hole_w * 0.5
            hh_in = hole_h * 0.5
            hw_flare = min(hw_in + chamfer_flare, ox * 0.90)
            hh_flare = min(hh_in + chamfer_flare, oz * 0.90)

            h_front_flare = hole_loop(hw_flare, hh_flare)
            h_inner = hole_loop(hw_in, hh_in)
            h_back_flare = hole_loop(hw_flare * 0.96, hh_flare * 0.96)

            # Front face annular quad ring (facing -Y)
            vo_f = [bm.verts.new((p[0], y_front, p[1])) for p in cell_outer]
            vf_flare = [bm.verts.new((p[0], y_front, p[1])) for p in h_front_flare]
            for k in range(8):
                k1 = (k + 1) % 8
                bm.faces.new((vo_f[k1], vo_f[k], vf_flare[k], vf_flare[k1]))

            # Back face annular quad ring (facing +Y)
            vo_b = [bm.verts.new((p[0], y_back, p[1])) for p in cell_outer]
            vb_flare = [bm.verts.new((p[0], y_back, p[1])) for p in h_back_flare]
            for k in range(8):
                k1 = (k + 1) % 8
                bm.faces.new((vo_b[k], vo_b[k1], vb_flare[k1], vb_flare[k]))

            # Internal bore from front flare -> chamfer -> axial segments -> back flare
            bore_rings = [vf_flare]
            y_c1 = y_front + chamfer_depth
            y_c2 = y_back - chamfer_depth
            for s in range(axial_segs + 1):
                ty = y_c1 + (y_c2 - y_c1) * (s / float(axial_segs))
                bore_rings.append([bm.verts.new((p[0], ty, p[1])) for p in h_inner])
            bore_rings.append(vb_flare)

            for s in range(len(bore_rings) - 1):
                r0 = bore_rings[s]
                r1 = bore_rings[s + 1]
                for k in range(8):
                    k1 = (k + 1) % 8
                    # Normals point inward toward cavity center!
                    bm.faces.new((r0[k], r1[k], r1[k1], r0[k1]))

            # Outer boundary walls ONLY on perimeter edges of the cols x rows matrix!
            y_steps = [y_front + (y_back - y_front) * (s / float(axial_segs + 2)) for s in range(axial_segs + 3)]

            def build_perimeter_wall(p_start, p_mid, p_end):
                wall_rows = []
                for idx_y, yy in enumerate(y_steps):
                    wall_rows.append([
                        bm.verts.new((p_start[0], yy, p_start[1])),
                        bm.verts.new((p_mid[0], yy, p_mid[1])),
                        bm.verts.new((p_end[0], yy, p_end[1])),
                    ])
                for sy in range(len(wall_rows) - 1):
                    for sx in range(2):
                        bm.faces.new((
                            wall_rows[sy][sx],
                            wall_rows[sy][sx + 1],
                            wall_rows[sy + 1][sx + 1],
                            wall_rows[sy + 1][sx],
                        ))

            if r == 0:  # Bottom outer wall
                build_perimeter_wall(cell_outer[0], cell_outer[1], cell_outer[2])
            if c == cols - 1:  # Right outer wall
                build_perimeter_wall(cell_outer[2], cell_outer[3], cell_outer[4])
            if r == rows - 1:  # Top outer wall
                build_perimeter_wall(cell_outer[4], cell_outer[5], cell_outer[6])
            if c == 0:  # Left outer wall
                build_perimeter_wall(cell_outer[6], cell_outer[7], cell_outer[0])

    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)


def finalize_bmesh_to_object(bm, name, material, sharp_deg=28.0):
    """
    Weld vertices, dissolve degenerate geometry, recalculate outward normals, convert quads
    with consistent FIXED diagonal for uniform architectural wireframe aesthetics, apply
    auto-smooth sharp edges, verify watertight manifold status, and link object.
    """
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.dissolve_degenerate(bm, dist=1e-6, edges=bm.edges)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bmesh.ops.triangulate(bm, faces=bm.faces, quad_method='FIXED', ngon_method='BEAUTY')

    boundary_edges = sum(1 for e in bm.edges if e.is_boundary)
    if boundary_edges > 0:
        print(f"[TOPOLOGY-WARN] {name} has {boundary_edges} open boundary edges!")

    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()

    mesh.shade_smooth()
    if hasattr(mesh, "set_sharp_from_angle"):
        mesh.set_sharp_from_angle(angle=math.radians(sharp_deg))

    mesh.materials.clear()
    mesh.materials.append(material)

    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def normalize_assembly_objects(objects, target_span=TARGET_ENVELOPE):
    """
    Center the entire multi-part assembly at world origin (0, 0, 0) and uniformly scale
    all part meshes in-place so max bounding dimension == `target_span` and all object
    transforms remain clean identity (0,0,0) / scale (1,1,1).
    """
    min_v = Vector((1e9, 1e9, 1e9))
    max_v = Vector((-1e9, -1e9, -1e9))

    for obj in objects:
        for v in obj.data.vertices:
            co = obj.matrix_world @ v.co
            min_v.x = min(min_v.x, co.x)
            min_v.y = min(min_v.y, co.y)
            min_v.z = min(min_v.z, co.z)
            max_v.x = max(max_v.x, co.x)
            max_v.y = max(max_v.y, co.y)
            max_v.z = max(max_v.z, co.z)

    center = (min_v + max_v) * 0.5
    dims = max_v - min_v
    max_dim = max(dims.x, dims.y, dims.z, 1e-5)
    scale = target_span / max_dim

    xform = Matrix.Scale(scale, 4) @ Matrix.Translation(-center)
    for obj in objects:
        obj.data.transform(xform @ obj.matrix_world)
        obj.matrix_world = Matrix.Identity(4)
        obj.data.update()

    return {
        "scaleApplied": round(scale, 5),
        "normalizedSizeBlender": [round(dims.x * scale, 4), round(dims.y * scale, 4), round(dims.z * scale, 4)],
    }


# ==============================================================================
# 3. Assembly 1: connector-housings.glb (16-Pole Dual-Lock Automotive Housing)
#    Parts: Housing_Body, CPA_Lock, TPA_Retainer, Terminal_Pins, Perimeter_Seal
#    Orientation: Front mating face = -Y (Three.js +Z), Rear wire entry = +Y (Three.js -Z), Top = +Z (Three.js +Y)
# ==============================================================================

def build_connector_housings(pal):
    objs = []
    cols, rows = 8, 2
    px, pz = 0.22, 0.26
    core_w = cols * px   # 1.76
    core_h = rows * pz   # 0.52

    # --- 1) Housing_Body ---
    bm = bmesh.new()
    # 16-cavity precision inner core: Y in [-0.62, +0.86]
    add_grid_cavity_block(
        bm, cols=cols, rows=rows, pitch_x=px, pitch_z=pz,
        hole_w=0.145, hole_h=0.175,
        y_front=-0.62, y_back=0.86,
        chamfer_depth=0.04, chamfer_flare=0.022, axial_segs=3, z_center=0.0
    )

    # Outer protective mating shroud & stepped seal collar around the core
    def shroud_outer(y):
        if y < -0.10:
            w, h = core_w + 0.36, core_h + 0.36
        elif y < 0.25:
            # Seal seat step
            w, h = core_w + 0.24, core_h + 0.24
        elif y < 0.42:
            # Flange stop collar
            w, h = core_w + 0.48, core_h + 0.46
        else:
            w, h = core_w + 0.28, core_h + 0.28
        return rounded_rect_2d(w, h, r=0.14, corner_segs=6, divs_w=8, divs_h=4)

    def shroud_inner(y):
        w, h = core_w + 0.14, core_h + 0.14
        return rounded_rect_2d(w, h, r=0.09, corner_segs=6, divs_w=8, divs_h=4)

    add_hollow_tube_along_y(
        bm, shroud_outer, shroud_inner,
        y_stations=[-0.82, -0.46, -0.12, -0.08, 0.23, 0.27, 0.40, 0.44, 0.68, 0.88],
        bevel_lip=0.018
    )

    # 4 Polarization Keying Ribs (left, right, and 2 bottom asymmetric coding ribs)
    add_subdivided_box(bm, -(core_w * 0.5 + 0.21), -0.35, 0.08, 0.08, 0.82, 0.12, nx=2, ny=4, nz=2, bevel_w=0.014)
    add_subdivided_box(bm, +(core_w * 0.5 + 0.21), -0.35, -0.06, 0.08, 0.82, 0.12, nx=2, ny=4, nz=2, bevel_w=0.014)
    add_subdivided_box(bm, -0.52, -0.38, -(core_h * 0.5 + 0.21), 0.09, 0.76, 0.08, nx=2, ny=4, nz=2, bevel_w=0.014)
    add_subdivided_box(bm, +0.34, -0.38, -(core_h * 0.5 + 0.21), 0.09, 0.76, 0.08, nx=2, ny=4, nz=2, bevel_w=0.014)

    # Top Latch Protection Guard Bridge (side pillars + anti-snag arch) & Cantilever Latch Beam
    z_top = core_h * 0.5 + 0.18
    for side in (-1.0, 1.0):
        add_subdivided_box(bm, side * 0.44, 0.08, z_top + 0.16, 0.10, 1.08, 0.30, nx=2, ny=5, nz=2, bevel_w=0.015)
    # Front & rear protective bridge arches
    add_subdivided_box(bm, 0.0, -0.36, z_top + 0.28, 0.98, 0.16, 0.07, nx=5, ny=2, nz=1, bevel_w=0.012)
    add_subdivided_box(bm, 0.0, +0.52, z_top + 0.28, 0.98, 0.18, 0.07, nx=5, ny=2, nz=1, bevel_w=0.012)

    # Primary cantilever latch ramp + release button
    latch_cl = [
        (-0.52, z_top + 0.04),
        (-0.34, z_top + 0.09),
        (-0.22, z_top + 0.19),  # Latch catch tooth peak
        (-0.16, z_top + 0.12),
        (+0.12, z_top + 0.13),
        (+0.38, z_top + 0.17),
        (+0.62, z_top + 0.20),
    ]
    add_sheet_strip_along_yz(bm, latch_cl, lambda t: 0.24 if t < 0.65 else 0.30, thickness=0.055, width_divs=5)

    objs.append(finalize_bmesh_to_object(bm, "Housing_Body", pal["pbt_charcoal"]))

    # --- 2) CPA_Lock (Top secondary slider behind latch bridge) ---
    bm = bmesh.new()
    z_cpa = z_top + 0.16
    # Slider carriage body + side dovetail guide rails
    add_subdivided_box(bm, 0.0, 0.68, z_cpa + 0.08, 0.62, 0.36, 0.14, nx=4, ny=3, nz=2, bevel_w=0.016)
    for side in (-1.0, 1.0):
        add_subdivided_box(bm, side * 0.33, 0.56, z_cpa - 0.02, 0.09, 0.56, 0.09, nx=2, ny=4, nz=2, bevel_w=0.012)
    # Forward locking wedge tongue sliding under primary latch
    wedge_cl = [
        (0.06, z_cpa - 0.02),
        (0.22, z_cpa + 0.02),
        (0.42, z_cpa + 0.03),
        (0.56, z_cpa + 0.06),
    ]
    add_sheet_strip_along_yz(bm, wedge_cl, lambda t: 0.16 + 0.05 * t, thickness=0.06, width_divs=4)
    # Ergonomic rear thumb-push tab with 3 grip ribs
    add_subdivided_box(bm, 0.0, 0.86, z_cpa + 0.15, 0.68, 0.10, 0.24, nx=4, ny=2, nz=3, bevel_w=0.015)
    for r_idx in range(3):
        add_subdivided_box(bm, 0.0, 0.74 + r_idx * 0.055, z_cpa + 0.18, 0.52, 0.025, 0.03, nx=3, ny=1, nz=1, bevel_w=0.005)

    objs.append(finalize_bmesh_to_object(bm, "CPA_Lock", pal["lock_amber"]))

    # --- 3) TPA_Retainer (Front 2x8 terminal position assurance cap) ---
    bm = bmesh.new()
    # Front 2x8 slotted face cap seated at Y in [-0.88, -0.63]
    add_grid_cavity_block(
        bm, cols=cols, rows=rows, pitch_x=px, pitch_z=pz,
        hole_w=0.125, hole_h=0.145,
        y_front=-0.88, y_back=-0.66,
        chamfer_depth=0.035, chamfer_flare=0.030, axial_segs=2, z_center=0.0
    )
    # Side retention latch arms reaching back into housing slots
    for side in (-1.0, 1.0):
        arm_cl = [
            (-0.86, 0.0),
            (-0.70, 0.0),
            (-0.52, 0.0),
            (-0.42, 0.03 * side if False else 0.0),
        ]
        add_subdivided_box(bm, side * (core_w * 0.5 + 0.04), -0.66, 0.0, 0.055, 0.42, 0.26, nx=1, ny=3, nz=2, bevel_w=0.010)
        add_subdivided_box(bm, side * (core_w * 0.5 + 0.065), -0.46, 0.0, 0.06, 0.08, 0.24, nx=1, ny=1, nz=2, bevel_w=0.010)
    # Top & bottom alignment lips
    add_subdivided_box(bm, 0.0, -0.82, +(core_h * 0.5 + 0.035), core_w * 0.86, 0.12, 0.05, nx=6, ny=2, nz=1, bevel_w=0.008)
    add_subdivided_box(bm, 0.0, -0.82, -(core_h * 0.5 + 0.035), core_w * 0.86, 0.12, 0.05, nx=6, ny=2, nz=1, bevel_w=0.008)

    objs.append(finalize_bmesh_to_object(bm, "TPA_Retainer", pal["lock_amber"]))

    # --- 4) Terminal_Pins (2x8 array of 16 precision stamped & formed contacts) ---
    bm = bmesh.new()
    for r in range(rows):
        cz = (r - (rows - 1) * 0.5) * pz
        for c in range(cols):
            cx = (c - (cols - 1) * 0.5) * px
            # Precision stepped square/octagonal pin + retention collar + rear crimp barrel extending to +1.08
            pin_prof = [
                (0.0, -0.76),
                (0.024, -0.70),
                (0.034, -0.66),
                (0.034, -0.12),
                (0.056, -0.08),
                (0.056, +0.16),
                (0.038, +0.20),
                (0.038, +0.46),
                (0.058, +0.52),
                (0.058, +0.92),
                (0.042, +0.96),
                (0.042, +1.08),
                (0.0, +1.08),
            ]
            add_revolved_profile_y(bm, pin_prof, segs=12, cx=cx, cz=cz, close_profile=False)

    objs.append(finalize_bmesh_to_object(bm, "Terminal_Pins", pal["brass_gold"]))

    # --- 5) Perimeter_Seal (Triple-corrugated silicone interfacial seal seated at Y in [-0.08, +0.22]) ---
    bm = bmesh.new()
    seal_path = rounded_rect_2d(core_w + 0.25, core_h + 0.25, r=0.11, corner_segs=8, divs_w=10, divs_h=5)
    # Corrugated 3-rib radial profile [(u_outward, y_axial), ...]
    seal_sec = []
    n_sec = 28
    y_s0, y_s1 = -0.07, 0.22
    for i in range(n_sec):
        ang = 2.0 * math.pi * i / float(n_sec)
        # Parameterize oval loop around cross section with 3 outer sinusoidal ribs
        sy = 0.5 * (y_s0 + y_s1) + 0.5 * (y_s1 - y_s0) * math.cos(ang)
        t_norm = (sy - y_s0) / (y_s1 - y_s0)
        is_outer = math.sin(ang) >= 0.0
        if is_outer:
            rib = 0.034 * (0.5 + 0.5 * math.cos(6.0 * math.pi * (t_norm - 0.5)))
            su = 0.035 + 0.025 * math.sin(ang) + rib * math.sin(ang)
        else:
            su = -0.012 * math.sin(-ang)
        seal_sec.append((su, sy))

    add_swept_closed_ring_xz(bm, seal_path, seal_sec)
    objs.append(finalize_bmesh_to_object(bm, "Perimeter_Seal", pal["seal_terracotta"], sharp_deg=42.0))

    norm_info = normalize_assembly_objects(objs)
    return objs, norm_info


# ==============================================================================
# 4. Assembly 2: sealed-heavy-duty.glb (IP6K9K Engine-Bay Lever-Lock Connector)
#    Parts: Outer_Shroud, Lever_Cam_Latch, Triple_Rib_Seal, Cavity_Block, Power_Contacts
# ==============================================================================

def build_sealed_heavy_duty(pal):
    objs = []

    # --- 1) Outer_Shroud ---
    bm = bmesh.new()

    def hd_outer(y):
        if y < 0.28:
            return stadium_2d(1.92, 1.08, arc_segs=18, divs_straight=8)
        elif y < 0.52:
            return stadium_2d(2.06, 1.18, arc_segs=18, divs_straight=8)
        else:
            t = (y - 0.52) / 0.45
            return stadium_2d(1.76 - 0.36 * t, 0.98 - 0.18 * t, arc_segs=18, divs_straight=8)

    def hd_inner(y):
        if y < 0.45:
            return stadium_2d(1.68, 0.84, arc_segs=18, divs_straight=8)
        else:
            t = (y - 0.45) / 0.52
            return stadium_2d(1.48 - 0.30 * t, 0.74 - 0.14 * t, arc_segs=18, divs_straight=8)

    add_hollow_tube_along_y(
        bm, hd_outer, hd_inner,
        y_stations=[-0.62, -0.28, 0.05, 0.26, 0.30, 0.50, 0.55, 0.76, 0.95],
        bevel_lip=0.022
    )

    # 6 Heavy-duty external impact reinforcing ribs
    for x_rib in (-0.46, 0.0, 0.46):
        add_subdivided_box(bm, x_rib, -0.14, +0.57, 0.075, 0.86, 0.08, nx=2, ny=4, nz=1, bevel_w=0.014)
        add_subdivided_box(bm, x_rib, -0.14, -0.57, 0.075, 0.86, 0.08, nx=2, ny=4, nz=1, bevel_w=0.014)

    # Side cylindrical cam pivot bosses (along X axis) + shroud guard ears
    for side in (-1.0, 1.0):
        tmp = bmesh.new()
        # Revolve around Y then rotate 90 deg to point along X
        boss_prof = [
            (0.0, 0.0),
            (0.21, 0.0),
            (0.21, 0.09),
            (0.13, 0.10),
            (0.13, 0.22),
            (0.16, 0.24),
            (0.16, 0.27),
            (0.0, 0.27),
        ]
        add_revolved_profile_y(tmp, boss_prof, segs=32, close_profile=False)
        rot = Matrix.Rotation(side * math.pi * 0.5, 4, 'Z')
        bmesh.ops.transform(tmp, matrix=Matrix.Translation((side * 0.92, 0.08, 0.0)) @ rot, verts=tmp.verts)
        vmap = {v.index: bm.verts.new(v.co) for v in tmp.verts}
        for f in tmp.faces:
            bm.faces.new([vmap[v.index] for v in f.verts])
        tmp.free()

        # Protective cam guide lugs
        add_subdivided_box(bm, side * 0.98, -0.34, 0.22, 0.10, 0.36, 0.12, nx=2, ny=3, nz=2, bevel_w=0.014)
        add_subdivided_box(bm, side * 0.98, -0.34, -0.22, 0.10, 0.36, 0.12, nx=2, ny=3, nz=2, bevel_w=0.014)

    objs.append(finalize_bmesh_to_object(bm, "Outer_Shroud", pal["pa66_forest"]))

    # --- 2) Lever_Cam_Latch (U-shaped eccentric cam-assist lever straddling the pivot bosses) ---
    bm = bmesh.new()
    for side in (-1.0, 1.0):
        x_arm = side * 1.08
        # Circular cam sector disc with gear teeth around bottom arc + arm rising to top bridge
        tmp = bmesh.new()
        n_disc = 36
        r_inner = 0.135
        rings_x = []
        for x_off in (-0.045, +0.045):
            ring_out = []
            ring_in = []
            for i in range(n_disc):
                ang = 2.0 * math.pi * i / float(n_disc)
                # Add 6 cam gear teeth on lower hemisphere
                tooth = 0.045 * max(0.0, math.sin(6.0 * ang)) if math.sin(ang) < -0.15 else 0.0
                r_out = 0.34 + tooth
                ring_out.append((x_arm + x_off, 0.08 + r_out * math.cos(ang), r_out * math.sin(ang)))
                ring_in.append((x_arm + x_off, 0.08 + r_inner * math.cos(ang), r_inner * math.sin(ang)))
            rings_x.append((ring_out, ring_in))

        # Build front/back annular faces & outer/inner walls of cam disc
        vo0 = [bm.verts.new(p) for p in rings_x[0][0]]
        vi0 = [bm.verts.new(p) for p in rings_x[0][1]]
        vo1 = [bm.verts.new(p) for p in rings_x[1][0]]
        vi1 = [bm.verts.new(p) for p in rings_x[1][1]]
        for i in range(n_disc):
            i1 = (i + 1) % n_disc
            bm.faces.new((vo0[i1], vo0[i], vi0[i], vi0[i1]))
            bm.faces.new((vo1[i], vo1[i1], vi1[i1], vi1[i]))
            bm.faces.new((vo0[i], vo0[i1], vo1[i1], vo1[i]))
            bm.faces.new((vi0[i1], vi0[i], vi1[i], vi1[i1]))
        tmp.free()

        # Lever upright arm rising from cam disc to overhead crossbar
        arm_cl = [
            (0.08, 0.28),
            (0.02, 0.54),
            (-0.08, 0.78),
            (-0.14, 0.88),
        ]
        add_sheet_strip_along_yz(bm, arm_cl, lambda t: 0.048, thickness=0.22, x_center=x_arm, width_divs=3)

    # Overhead U-lever ergonomic crossbar + latching catch nose
    cross_cl = [
        (-0.26, 0.86),
        (-0.14, 0.90),
        (+0.02, 0.88),
    ]
    add_sheet_strip_along_yz(bm, cross_cl, lambda t: 1.13, thickness=0.085, x_center=0.0, width_divs=12)
    # Grip ribs & central retention snap catch on crossbar
    for k in range(5):
        xk = (k - 2) * 0.36
        add_subdivided_box(bm, xk, -0.14, 0.94, 0.22, 0.20, 0.04, nx=2, ny=2, nz=1, bevel_w=0.008)
    add_subdivided_box(bm, 0.0, +0.06, 0.80, 0.28, 0.12, 0.16, nx=3, ny=2, nz=2, bevel_w=0.014)

    objs.append(finalize_bmesh_to_object(bm, "Lever_Cam_Latch", pal["lock_amber"]))

    # --- 3) Triple_Rib_Seal (Radial 3-lip FVMQ environmental seal inside shroud) ---
    bm = bmesh.new()
    hd_seal_path = stadium_2d(1.58, 0.74, arc_segs=20, divs_straight=10)
    hd_seal_sec = []
    n_sec = 32
    ys0, ys1 = -0.22, 0.16
    for i in range(n_sec):
        ang = 2.0 * math.pi * i / float(n_sec)
        sy = 0.5 * (ys0 + ys1) + 0.5 * (ys1 - ys0) * math.cos(ang)
        tn = (sy - ys0) / (ys1 - ys0)
        if math.sin(ang) >= 0.0:
            rib = 0.048 * (0.5 + 0.5 * math.cos(6.0 * math.pi * (tn - 0.5)))
            su = 0.042 + 0.025 * math.sin(ang) + rib * math.sin(ang)
        else:
            rib_in = 0.016 * (0.5 + 0.5 * math.cos(4.0 * math.pi * (tn - 0.5)))
            su = -(0.020 + rib_in) * math.sin(-ang)
        hd_seal_sec.append((su, sy))

    add_swept_closed_ring_xz(bm, hd_seal_path, hd_seal_sec)
    objs.append(finalize_bmesh_to_object(bm, "Triple_Rib_Seal", pal["seal_terracotta"], sharp_deg=42.0))

    # --- 4) Cavity_Block (Multi-pole dielectric insert: 2 large power towers + 6 signal towers) ---
    bm = bmesh.new()
    # Dielectric base flange block seated at Y in [-0.26, +0.28]
    def blk_outer(y):
        if y < -0.18:
            return stadium_2d(1.62, 0.78, arc_segs=16, divs_straight=8)
        return stadium_2d(1.52, 0.68, arc_segs=16, divs_straight=8)

    blk_loops = [
        loop_xz_at_y(blk_outer(-0.26), -0.26),
        loop_xz_at_y(blk_outer(-0.19), -0.19),
        loop_xz_at_y(blk_outer(-0.16), -0.16),
        loop_xz_at_y(blk_outer(+0.06), +0.06),
        loop_xz_at_y(blk_outer(+0.28), +0.28),
    ]
    add_lofted_loops(bm, blk_loops, close_ring=True, close_length=False, cap_start=True, cap_end=True)

    # 2 High-power cylindrical isolation towers protruding forward to -0.78
    for side in (-1.0, 1.0):
        tower_prof = [
            (0.095, -0.24),
            (0.095, -0.75),
            (0.115, -0.78),
            (0.195, -0.78),
            (0.215, -0.74),
            (0.215, -0.24),
        ]
        add_revolved_profile_y(bm, tower_prof, segs=28, cx=side * 0.50, cz=0.0, close_profile=True)

    # 6 Signal isolation silos in central 2x3 matrix
    for rz in (-0.15, +0.15):
        for cx_sig in (-0.15, 0.0, +0.15):
            silo_prof = [
                (0.036, -0.24),
                (0.036, -0.72),
                (0.050, -0.75),
                (0.066, -0.75),
                (0.072, -0.71),
                (0.072, -0.24),
            ]
            add_revolved_profile_y(bm, silo_prof, segs=18, cx=cx_sig, cz=rz, close_profile=True)

    objs.append(finalize_bmesh_to_object(bm, "Cavity_Block", pal["pa66_ivory"]))

    # --- 5) Power_Contacts (2 heavy-duty silver-plated louvered socket contacts + 6 signal pins) ---
    bm = bmesh.new()
    for side in (-1.0, 1.0):
        cx_p = side * 0.50
        # Main turned silver socket body + retention shoulder + rear hex/round crimp barrel
        sock_prof = [
            (0.0, -0.10),
            (0.055, -0.10),
            (0.055, -0.62),
            (0.075, -0.66),
            (0.092, -0.66),
            (0.092, -0.14),
            (0.125, -0.10),
            (0.125, +0.34),
            (0.096, +0.40),
            (0.096, +0.56),
            (0.132, +0.62),
            (0.132, +1.12),
            (0.082, +1.12),
            (0.082, +0.64),
            (0.0, +0.60),
        ]
        add_revolved_profile_y(bm, sock_prof, segs=28, cx=cx_p, cz=0.0, close_profile=False)
        # 6 Crown contact spring fingers around mating socket hood
        for f_idx in range(6):
            fang = 2.0 * math.pi * f_idx / 6.0
            fx = cx_p + 0.076 * math.cos(fang)
            fz = 0.076 * math.sin(fang)
            add_subdivided_box(bm, fx, -0.52, fz, 0.026, 0.28, 0.026, nx=1, ny=3, nz=1, bevel_w=0.005)

    for rz in (-0.15, +0.15):
        for cx_sig in (-0.15, 0.0, +0.15):
            sig_prof = [
                (0.0, -0.68),
                (0.022, -0.63),
                (0.032, -0.58),
                (0.032, +0.35),
                (0.048, +0.42),
                (0.048, +1.04),
                (0.0, +1.04),
            ]
            add_revolved_profile_y(bm, sig_prof, segs=14, cx=cx_sig, cz=rz, close_profile=False)

    objs.append(finalize_bmesh_to_object(bm, "Power_Contacts", pal["silver_contact"]))

    norm_info = normalize_assembly_objects(objs)
    return objs, norm_info


# ==============================================================================
# 5. Assembly 3: terminals-contacts.glb (Stamped Box-Type Female Terminal MQS/MCP)
#    Parts: Contact_Box, Locking_Lance, Wire_Crimp_Barrel, Insulation_Crimp
#    Macro single-piece engineering view along Y: Front Contact_Box (-Y) -> Rear Insulation_Crimp (+Y)
# ==============================================================================

def build_terminals_contacts(pal):
    objs = []

    # --- 1) Contact_Box (Y in [-1.35, -0.32]) ---
    bm = bmesh.new()
    # Precision folded square protective shroud with flared entry bellmouth
    def box_outer(y):
        flare = max(0.0, (-1.22 - y) * 0.24)
        return rounded_rect_2d(0.46 + flare, 0.50 + flare, r=0.065, corner_segs=6, divs_w=6, divs_h=6)

    def box_inner(y):
        flare = max(0.0, (-1.20 - y) * 0.36)
        return rounded_rect_2d(0.35 + flare, 0.39 + flare, r=0.042, corner_segs=6, divs_w=6, divs_h=6)

    add_hollow_tube_along_y(
        bm, box_outer, box_inner,
        y_stations=[-1.35, -1.24, -1.12, -0.92, -0.72, -0.52, -0.32],
        bevel_lip=0.012
    )

    # Top dovetail seam interlock feature & side anti-overstress tabs
    add_subdivided_box(bm, 0.0, -0.84, +0.255, 0.14, 0.78, 0.028, nx=2, ny=5, nz=1, bevel_w=0.006)
    for side in (-1.0, 1.0):
        add_subdivided_box(bm, side * 0.24, -0.96, 0.0, 0.032, 0.24, 0.22, nx=1, ny=3, nz=2, bevel_w=0.006)

    # Internal Dual-Cantilever Curved Contact Springs (top & bottom arched beams with contact dimples!)
    for sign_z in (-1.0, 1.0):
        spring_cl = [
            (-0.34, sign_z * 0.175),
            (-0.52, sign_z * 0.155),
            (-0.74, sign_z * 0.105),
            (-0.94, sign_z * 0.058),  # High-pressure contact point apex!
            (-1.08, sign_z * 0.088),
            (-1.20, sign_z * 0.148),
        ]
        add_sheet_strip_along_yz(bm, spring_cl, lambda t: 0.125 - 0.015 * t, thickness=0.034, width_divs=5)

    objs.append(finalize_bmesh_to_object(bm, "Contact_Box", pal["brass_gold"]))

    # --- 2) Locking_Lance (Primary elastic retention lance & U-channel transition neck, Y in [-0.36, +0.24]) ---
    bm = bmesh.new()
    # U-shaped stamped transition channel (curved cross-section extruded along Y)
    u_stations = [-0.34, -0.20, -0.06, 0.08, 0.22]
    n_u = 22
    u_loops = []
    for yy in u_stations:
        # Outer U -> right rim -> inner U -> left rim closed cross-section
        t_neck = (yy + 0.34) / 0.56
        w_u = 0.44 - 0.06 * math.sin(math.pi * t_neck)
        h_u = 0.34 - 0.04 * t_neck
        th = 0.048
        pts = []
        # Outer U arc from top-left -> bottom -> top-right
        for k in range(n_u):
            s = k / float(n_u - 1)
            u_param = -1.0 + 2.0 * s
            px = u_param * (w_u * 0.5)
            pz = -0.22 + 0.26 * (u_param ** 4)
            pts.append((px, yy, pz))
        for k in reversed(range(n_u)):
            s = k / float(n_u - 1)
            u_param = -1.0 + 2.0 * s
            px = u_param * (w_u * 0.5 - th)
            pz = (-0.22 + th) + 0.24 * (u_param ** 4)
            pts.append((px, yy, pz))
        u_loops.append(pts)
    add_lofted_loops(bm, u_loops, close_ring=True, close_length=False, cap_start=True, cap_end=True)

    # Elastic angled primary locking lance tongue + TPA retention shoulder
    lance_cl = [
        (-0.32, +0.22),
        (-0.18, +0.29),
        (-0.02, +0.38),
        (+0.10, +0.44),  # Locking shoulder tip engaging cavity step
        (+0.14, +0.39),
    ]
    add_sheet_strip_along_yz(bm, lance_cl, lambda t: 0.14 - 0.02 * t, thickness=0.040, width_divs=5)
    # Bottom secondary TPA retention stop tab
    add_subdivided_box(bm, 0.0, -0.24, -0.25, 0.34, 0.10, 0.08, nx=3, ny=2, nz=2, bevel_w=0.012)

    objs.append(finalize_bmesh_to_object(bm, "Locking_Lance", pal["spring_bronze"]))

    # --- 3) Wire_Crimp_Barrel (Heart-shaped B-crimp wings with serrations + stranded wire core, Y in [+0.22, +0.86]) ---
    bm = bmesh.new()
    # Heart-shaped rolled B-crimp cross-section (classic automotive F-crimp double inward curl!)
    y_crimp_stations = [0.22 + 0.64 * (k / 16.0) for k in range(17)]
    n_wing = 28
    crimp_loops = []
    for idx_y, yy in enumerate(y_crimp_stations):
        tn = (yy - 0.22) / 0.64
        # Bellmouth flare at front and rear ends + 4 internal gas-tight serration ribs
        bell = 1.0 + 0.12 * (max(0.0, 0.18 - tn) / 0.18) ** 2 + 0.14 * (max(0.0, tn - 0.82) / 0.18) ** 2
        serr = 0.010 * math.sin(10.0 * math.pi * tn) if 0.18 < tn < 0.82 else 0.0

        def b_crimp_centerline_xz(u):
            """u in [-1, 1]: heart-shaped inward-curling wings."""
            au = abs(u)
            sgn = 1.0 if u >= 0 else -1.0
            if au < 0.35:
                # Flat/curved anvil base
                ang = (au / 0.35) * (math.pi * 0.38)
                x = sgn * 0.22 * math.sin(ang)
                z = -0.18 + 0.10 * (1.0 - math.cos(ang))
            elif au < 0.78:
                # Rising side wall curving over top
                s = (au - 0.35) / 0.43
                ang = math.pi * 0.38 + s * (math.pi * 0.82)
                x = sgn * (0.09 + 0.13 * math.sin(ang))
                z = -0.04 - 0.14 * math.cos(ang)
            else:
                # Inward curling tip plunging into conductor center!
                s = (au - 0.78) / 0.22
                x = sgn * (0.068 * (1.0 - 0.78 * s))
                z = 0.095 - 0.115 * s
            return x * bell, z * bell

        pts_sample = [b_crimp_centerline_xz(-1.0 + 2.0 * k / float(n_wing - 1)) for k in range(n_wing)]
        th_c = 0.046 + serr
        outer_pts = []
        inner_pts = []
        for k in range(n_wing):
            p0 = pts_sample[max(0, k - 1)]
            p1 = pts_sample[k]
            p2 = pts_sample[min(n_wing - 1, k + 1)]
            dx = p2[0] - p0[0]
            dz = p2[1] - p0[1]
            dl = max(math.hypot(dx, dz), 1e-6)
            nx, nz = dz / dl, -dx / dl
            outer_pts.append((p1[0] + nx * th_c * 0.5, yy, p1[1] + nz * th_c * 0.5))
            inner_pts.append((p1[0] - nx * th_c * 0.5, yy, p1[1] - nz * th_c * 0.5))

        crimp_loops.append(outer_pts + list(reversed(inner_pts)))

    add_lofted_loops(bm, crimp_loops, close_ring=True, close_length=False, cap_start=True, cap_end=True)

    # Compacted 7-strand copper wire bundle inside the B-crimp barrel (Y in [+0.14, +0.92])
    strand_offsets = [(0.0, -0.04)] + [
        (0.072 * math.cos(k * math.pi / 3.0), -0.04 + 0.068 * math.sin(k * math.pi / 3.0))
        for k in range(6)
    ]
    for sx, sz in strand_offsets:
        strand_prof = [
            (0.0, 0.14),
            (0.032, 0.16),
            (0.035, 0.24),
            (0.035, 0.90),
            (0.0, 0.90),
        ]
        add_revolved_profile_y(bm, strand_prof, segs=12, cx=sx, cz=sz, close_profile=False)

    objs.append(finalize_bmesh_to_object(bm, "Wire_Crimp_Barrel", pal["brass_gold"]))

    # --- 4) Insulation_Crimp (Wrap-around insulation strain-relief claws + FLRY wire sleeve, Y in [+0.88, +1.42]) ---
    bm = bmesh.new()
    # Overlapping circular insulation crimp claws (Y in [+0.88, +1.22])
    ins_stations = [0.88 + 0.34 * (k / 10.0) for k in range(11)]
    n_claw = 26
    claw_loops = []
    for yy in ins_stations:
        tn = (yy - 0.88) / 0.34
        r_mid = 0.235 + 0.025 * (tn - 0.5) ** 2
        th_i = 0.048
        outer_c = []
        inner_c = []
        for k in range(n_claw):
            # Wrap 310 degrees from top-left around bottom to top-right
            ang = -math.pi * 0.5 - (math.pi * 0.86) + (2.0 * math.pi * 0.86) * (k / float(n_claw - 1))
            outer_c.append(((r_mid + th_i * 0.5) * math.cos(ang), yy, 0.01 + (r_mid + th_i * 0.5) * math.sin(ang)))
            inner_c.append(((r_mid - th_i * 0.5) * math.cos(ang), yy, 0.01 + (r_mid - th_i * 0.5) * math.sin(ang)))
        claw_loops.append(outer_c + list(reversed(inner_c)))
    add_lofted_loops(bm, claw_loops, close_ring=True, close_length=False, cap_start=True, cap_end=True)

    # Stamped carrier strip cutoff tab at rear bottom
    add_subdivided_box(bm, 0.0, 1.25, -0.23, 0.20, 0.12, 0.05, nx=2, ny=2, nz=1, bevel_w=0.008)

    # FLRY thin-wall automotive wire insulation jacket segment gripped by the claws (Y in [+0.86, +1.42])
    wire_ins_prof = [
        (0.11, 0.86),
        (0.195, 0.88),
        (0.188, 1.05),  # Slight compression indentation under crimp claws
        (0.208, 1.22),
        (0.212, 1.40),
        (0.195, 1.42),
        (0.11, 1.42),
    ]
    add_revolved_profile_y(bm, wire_ins_prof, segs=32, cx=0.0, cz=0.01, close_profile=True)

    objs.append(finalize_bmesh_to_object(bm, "Insulation_Crimp", pal["silver_contact"]))

    norm_info = normalize_assembly_objects(objs)
    return objs, norm_info


# ==============================================================================
# 6. Assembly 4: seals-accessories.glb (Silicone 3-Lip SWS, Blind Plug, Wedge & Cap)
#    Parts: Triple_Lip_SWS, Cavity_Blind_Plug, Secondary_Wedge_Lock, Strain_Relief_Cap
# ==============================================================================

def build_seals_accessories(pal):
    objs = []
    # 4-way cavity pitch along X: [-0.69, -0.23, +0.23, +0.69]
    pitches_x = [-0.69, -0.23, +0.23, +0.69]

    # --- 1) Triple_Lip_SWS (3 precision triple-lip corrugated single-wire seals in cavities 1..3) ---
    bm = bmesh.new()
    for cx in pitches_x[:3]:
        # High-resolution revolved corrugated profile: front ferrule neck (-Y) + 3 sinusoidal outer lips + inner wire sealing ribs
        sws_prof = []
        # Outer profile from front (-0.42) to rear (+0.28)
        sws_prof.append((0.095, -0.42))
        sws_prof.append((0.145, -0.42))
        sws_prof.append((0.150, -0.25))  # Front crimp ferrule barrel
        sws_prof.append((0.132, -0.21))
        n_wave = 22
        for i in range(n_wave + 1):
            t = i / float(n_wave)
            yy = -0.20 + 0.44 * t
            # 3 pronounced sinusoidal sealing lips
            lip = 0.052 * (0.5 - 0.5 * math.cos(6.0 * math.pi * t))
            sws_prof.append((0.148 + lip, yy))
        sws_prof.append((0.162, +0.28))
        sws_prof.append((0.115, +0.28))
        # Inner wire bore with 2 internal wire-hugging ribs from rear (+0.28) to front (-0.42)
        for i in range(12):
            t = i / 11.0
            yy = 0.26 - 0.66 * t
            in_rib = 0.018 * (0.5 - 0.5 * math.cos(4.0 * math.pi * t))
            sws_prof.append((0.088 - in_rib, yy))

        add_revolved_profile_y(bm, sws_prof, segs=32, cx=cx, cz=0.0, close_profile=True)

    objs.append(finalize_bmesh_to_object(bm, "Triple_Lip_SWS", pal["seal_teal"], sharp_deg=40.0))

    # --- 2) Cavity_Blind_Plug (Multi-step solid waterproof blind plug in cavity 4 at X = +0.69) ---
    bm = bmesh.new()
    cx_plug = pitches_x[3]
    plug_prof = [
        (0.0, -0.48),
        (0.085, -0.44),
        (0.130, -0.32),
        (0.115, -0.24),
        (0.196, -0.16),  # Lip 1
        (0.138, -0.07),
        (0.202, +0.02),  # Lip 2
        (0.138, +0.11),
        (0.198, +0.20),  # Lip 3
        (0.145, +0.26),
        (0.215, +0.29),  # Rear Extraction Stop Head
        (0.215, +0.40),
        (0.185, +0.43),
        (0.0, +0.43),
    ]
    add_revolved_profile_y(bm, plug_prof, segs=36, cx=cx_plug, cz=0.0, close_profile=False)
    # Cross-shaped extraction grip ribs on rear cap of blind plug
    add_subdivided_box(bm, cx_plug, +0.43, 0.0, 0.34, 0.05, 0.055, nx=3, ny=1, nz=1, bevel_w=0.008)
    add_subdivided_box(bm, cx_plug, +0.43, 0.0, 0.055, 0.05, 0.34, nx=1, ny=1, nz=3, bevel_w=0.008)

    objs.append(finalize_bmesh_to_object(bm, "Cavity_Blind_Plug", pal["seal_terracotta"], sharp_deg=38.0))

    # --- 3) Secondary_Wedge_Lock (Front-insert wedge retainer at Y in [-0.96, -0.48]) ---
    bm = bmesh.new()
    # Front face plate with 4 arched terminal-Clearance scallops & extraction pull window
    add_grid_cavity_block(
        bm, cols=4, rows=1, pitch_x=0.46, pitch_z=0.46,
        hole_w=0.25, hole_h=0.25,
        y_front=-0.94, y_back=-0.74,
        chamfer_depth=0.03, chamfer_flare=0.03, axial_segs=2, z_center=0.0
    )
    # Tapered wedge locking blades extending rearward (-0.74 to -0.46) between contact rows
    for x_blade in (-0.46, 0.0, +0.46):
        blade_cl = [
            (-0.76, 0.0),
            (-0.60, 0.0),
            (-0.46, 0.0),
        ]
        add_sheet_strip_along_yz(bm, blade_cl, lambda t: 0.075 - 0.025 * t, thickness=0.34 - 0.12 * 0.5, x_center=x_blade, width_divs=3)

    # Side barbed snap-lock wings
    for side in (-1.0, 1.0):
        add_subdivided_box(bm, side * 0.96, -0.70, 0.0, 0.07, 0.44, 0.30, nx=1, ny=3, nz=2, bevel_w=0.012)
        add_subdivided_box(bm, side * 1.01, -0.52, 0.0, 0.08, 0.10, 0.28, nx=1, ny=1, nz=2, bevel_w=0.012)

    objs.append(finalize_bmesh_to_object(bm, "Secondary_Wedge_Lock", pal["lock_amber"]))

    # --- 4) Strain_Relief_Cap (Rear snap-on wire-dress backshell at Y in [+0.32, +1.05]) ---
    bm = bmesh.new()
    # 4-hole rear guide manifold (Y in [+0.32, +0.58])
    add_grid_cavity_block(
        bm, cols=4, rows=1, pitch_x=0.46, pitch_z=0.52,
        hole_w=0.31, hole_h=0.31,
        y_front=0.32, y_back=0.56,
        chamfer_depth=0.03, chamfer_flare=0.025, axial_segs=2, z_center=0.0
    )

    # Outer snap-on skirt shroud + corrugated conduit retention collar (Y in [+0.54, +1.05])
    def cap_outer(y):
        if y < 0.72:
            t = (y - 0.54) / 0.18
            return stadium_2d(1.94 - 0.48 * t, 0.62 + 0.12 * t, arc_segs=16, divs_straight=8)
        else:
            # Conduit retention ribs
            rib = 0.045 * (0.5 + 0.5 * math.cos(8.0 * math.pi * (y - 0.72) / 0.33))
            return stadium_2d(1.36 + rib, 0.72 + rib, arc_segs=16, divs_straight=8)

    def cap_inner(y):
        if y < 0.72:
            t = (y - 0.54) / 0.18
            return stadium_2d(1.74 - 0.52 * t, 0.44 + 0.10 * t, arc_segs=16, divs_straight=8)
        else:
            return stadium_2d(1.16, 0.54, arc_segs=16, divs_straight=8)

    add_hollow_tube_along_y(
        bm, cap_outer, cap_inner,
        y_stations=[0.54, 0.64, 0.72, 0.78, 0.84, 0.90, 0.96, 1.04],
        bevel_lip=0.016
    )

    # Side snap-lock windows / clips extending forward
    for side in (-1.0, 1.0):
        add_subdivided_box(bm, side * 0.98, +0.30, 0.0, 0.075, 0.46, 0.36, nx=1, ny=3, nz=2, bevel_w=0.012)
        add_subdivided_box(bm, side * 0.93, +0.11, 0.0, 0.09, 0.09, 0.34, nx=1, ny=1, nz=2, bevel_w=0.012)

    objs.append(finalize_bmesh_to_object(bm, "Strain_Relief_Cap", pal["pbt_charcoal"]))

    norm_info = normalize_assembly_objects(objs)
    return objs, norm_info


# ==============================================================================
# 7. Assembly 5: power-distribution.glb (High-Current Shielded Flange Connector)
#    Parts: Diecast_Flange_Housing, EMC_Shield_Collar, HVIL_Signal_Bridge,
#           High_Current_Busbars, Flange_Gasket
# ==============================================================================

def build_power_distribution(pal):
    objs = []

    # --- 1) Diecast_Flange_Housing (4-bolt aluminum flange + front shielded shroud + rear finned body) ---
    bm = bmesh.new()

    # Main oval shielded barrel + stepped flange plate + rear diecast chamber (all 56 verts per loop!)
    def pd_outer(y):
        if y < -0.22:
            # Front mating EMI shroud: 2 * (20 + 8) = 56 verts
            return stadium_2d(1.56, 0.96, arc_segs=20, divs_straight=8)
        elif y < -0.04:
            # Square/rounded 4-bolt mounting flange plate: 4*7 + 2*8 + 2*6 = 56 verts
            return rounded_rect_2d(2.12, 1.62, r=0.24, corner_segs=7, divs_w=8, divs_h=6)
        else:
            # Rear diecast enclosure body: 56 verts
            return rounded_rect_2d(1.62, 1.06, r=0.20, corner_segs=7, divs_w=8, divs_h=6)

    def pd_inner(y):
        if y < 0.0:
            return stadium_2d(1.34, 0.74, arc_segs=20, divs_straight=8)
        else:
            return stadium_2d(1.38, 0.78, arc_segs=20, divs_straight=8)

    add_hollow_tube_along_y(
        bm, pd_outer, pd_inner,
        y_stations=[-0.72, -0.45, -0.24, -0.20, -0.06, -0.02, 0.25, 0.52, 0.74],
        bevel_lip=0.020
    )

    # 4 Corner bolt-hole machined bosses on the mounting flange (at X = +-0.82, Z = +-0.58)
    bolt_coords = [(-0.82, -0.58), (+0.82, -0.58), (+0.82, +0.58), (-0.82, +0.58)]
    for bx, bz in bolt_coords:
        boss_prof = [
            (0.072, -0.24),
            (0.148, -0.24),
            (0.158, -0.21),
            (0.158, -0.03),
            (0.145, -0.01),
            (0.072, -0.01),
        ]
        add_revolved_profile_y(bm, boss_prof, segs=22, cx=bx, cz=bz, close_profile=True)

    # 5 Die-cast cooling / stiffening fins on top and bottom of rear housing
    for fx in (-0.48, -0.24, 0.0, +0.24, +0.48):
        add_subdivided_box(bm, fx, +0.36, +0.57, 0.055, 0.68, 0.09, nx=1, ny=4, nz=1, bevel_w=0.010)
        add_subdivided_box(bm, fx, +0.36, -0.57, 0.055, 0.68, 0.09, nx=1, ny=4, nz=1, bevel_w=0.010)

    # Dual rear cable gland collars
    for side in (-1.0, 1.0):
        gland_prof = [
            (0.16, +0.70),
            (0.25, +0.70),
            (0.25, +0.92),
            (0.22, +0.96),
            (0.16, +0.96),
        ]
        add_revolved_profile_y(bm, gland_prof, segs=24, cx=side * 0.40, cz=-0.04, close_profile=True)

    objs.append(finalize_bmesh_to_object(bm, "Diecast_Flange_Housing", pal["alu_diecast"]))

    # --- 2) Flange_Gasket (Planar conductive fluorosilicone panel gasket at Y in [-0.28, -0.21]) ---
    bm = bmesh.new()
    gasket_path = rounded_rect_2d(1.88, 1.38, r=0.20, corner_segs=7, divs_w=8, divs_h=6)
    # Planar gasket section with dual raised compression beads on front/rear faces
    gasket_sec = []
    n_gs = 20
    for i in range(n_gs):
        ang = 2.0 * math.pi * i / float(n_gs)
        su = 0.11 * math.cos(ang)
        bead = 0.012 * math.cos(4.0 * ang)
        sy = -0.245 + (0.028 + bead) * math.sin(ang)
        gasket_sec.append((su, sy))
    add_swept_closed_ring_xz(bm, gasket_path, gasket_sec)

    # 4 Bolt hole sealing rings on gasket corners
    for bx, bz in bolt_coords:
        ring_prof = [
            (0.075, -0.275),
            (0.135, -0.275),
            (0.135, -0.215),
            (0.075, -0.215),
        ]
        add_revolved_profile_y(bm, ring_prof, segs=18, cx=bx, cz=bz, close_profile=True)

    objs.append(finalize_bmesh_to_object(bm, "Flange_Gasket", pal["seal_teal"], sharp_deg=40.0))

    # --- 3) EMC_Shield_Collar (360-deg multi-finger crown EMI shielding collar at Y in [+0.20, +0.66]) ---
    bm = bmesh.new()
    # Front & rear continuous carrier bands (stadium shape)
    def emc_band_out(y):
        return stadium_2d(1.32, 0.72, arc_segs=16, divs_straight=8)

    def emc_band_in(y):
        return stadium_2d(1.24, 0.64, arc_segs=16, divs_straight=8)

    add_hollow_tube_along_y(bm, emc_band_out, emc_band_in, y_stations=[0.20, 0.28], bevel_lip=0.008)
    add_hollow_tube_along_y(bm, emc_band_out, emc_band_in, y_stations=[0.58, 0.66], bevel_lip=0.008)

    # 22 Curved outward-bowing EMC spring fingers spanning around the stadium perimeter!
    perim_pts = stadium_2d(1.28, 0.68, arc_segs=6, divs_straight=5)  # 2*(6+5) = 22 fingers!
    n_f = len(perim_pts)
    for i in range(n_f):
        p_prev = perim_pts[(i - 1) % n_f]
        p_curr = perim_pts[i]
        p_next = perim_pts[(i + 1) % n_f]
        tx, tz = p_next[0] - p_prev[0], p_next[1] - p_prev[1]
        tl = max(math.hypot(tx, tz), 1e-6)
        tx, tz = tx / tl, tz / tl
        nx, nz = tz, -tx  # Outward normal

        # Build arched spring finger strip along Y from 0.27 to 0.59
        f_rings = []
        for s in range(7):
            tn = s / 6.0
            yy = 0.27 + 0.32 * tn
            bow = 0.055 * math.sin(math.pi * tn)
            cx_f = p_curr[0] + nx * bow
            cz_f = p_curr[1] + nz * bow
            hw = 0.052
            hth = 0.016
            f_rings.append([
                (cx_f - tx * hw + nx * hth, yy, cz_f - tz * hw + nz * hth),
                (cx_f + tx * hw + nx * hth, yy, cz_f + tz * hw + nz * hth),
                (cx_f + tx * hw - nx * hth, yy, cz_f + tz * hw - nz * hth),
                (cx_f - tx * hw - nx * hth, yy, cz_f - tz * hw - nz * hth),
            ])
        add_lofted_loops(bm, f_rings, close_ring=True, close_length=False, cap_start=True, cap_end=True)

    objs.append(finalize_bmesh_to_object(bm, "EMC_Shield_Collar", pal["brass_gold"]))

    # --- 4) HVIL_Signal_Bridge (Top High-Voltage Interlock Loop shunt bridge, Z ≈ +0.22, Y in [-0.52, +0.18]) ---
    bm = bmesh.new()
    # Insulator carrier block
    add_subdivided_box(bm, 0.0, -0.06, +0.23, 0.34, 0.32, 0.14, nx=3, ny=3, nz=2, bevel_w=0.015)
    # U-shaped dual-blade gold-plated HVIL shorting jumper (shorter than main busbars for first-break safety!)
    for side in (-1.0, 1.0):
        pin_prof = [
            (0.0, -0.50),
            (0.022, -0.45),
            (0.030, -0.40),
            (0.030, +0.16),
            (0.0, +0.16),
        ]
        add_revolved_profile_y(bm, pin_prof, segs=14, cx=side * 0.085, cz=+0.23, close_profile=False)
    # Rear shorting U-bridge bar linking the two HVIL pins
    add_subdivided_box(bm, 0.0, +0.16, +0.23, 0.23, 0.05, 0.06, nx=3, ny=1, nz=1, bevel_w=0.010)

    objs.append(finalize_bmesh_to_object(bm, "HVIL_Signal_Bridge", pal["brass_gold"]))

    # --- 5) High_Current_Busbars (Dual-pole Ag-plated copper power pins + bent flat busbars + M6 bolt lugs) ---
    bm = bmesh.new()
    for side in (-1.0, 1.0):
        cx_b = side * 0.40
        cz_b = -0.04
        # Front Ø8mm high-ampacity cylindrical pin with louvered contact grooves & touch-safe tip chamfer
        bus_pin_prof = [
            (0.0, -0.68),
            (0.068, -0.64),
            (0.095, -0.58),
            (0.118, -0.52),
            (0.118, -0.36),
            (0.104, -0.33),  # Louvered spring band groove 1
            (0.104, -0.23),
            (0.118, -0.20),
            (0.118, -0.10),
            (0.104, -0.07),  # Groove 2
            (0.104, +0.03),
            (0.126, +0.06),
            (0.145, +0.10),  # Sealing collar flange
            (0.145, +0.28),
            (0.0, +0.28),
        ]
        add_revolved_profile_y(bm, bus_pin_prof, segs=28, cx=cx_b, cz=cz_b, close_profile=False)

        # S-bent heavy copper flat busbar transitioning from pin rear (+0.26) to rear bolt lug (+1.08)
        bar_cl = [
            (+0.26, cz_b),
            (+0.48, cz_b),
            (+0.68, cz_b - 0.08),
            (+0.88, cz_b - 0.08),
            (+0.98, cz_b - 0.08),
        ]
        add_sheet_strip_along_yz(bm, bar_cl, lambda t: 0.135, thickness=0.075, x_center=cx_b, width_divs=4)

        # Rear M6 circular bolt-on terminal lug (annular ring lying in XY plane, normal along Z)
        tmp = bmesh.new()
        lug_prof = [
            (0.072, -0.038),
            (0.168, -0.038),
            (0.175, -0.025),
            (0.175, +0.025),
            (0.168, +0.038),
            (0.072, +0.038),
        ]
        add_revolved_profile_y(tmp, lug_prof, segs=26, close_profile=True)
        rot_x = Matrix.Rotation(math.pi * 0.5, 4, 'X')
        bmesh.ops.transform(tmp, matrix=Matrix.Translation((cx_b, 1.08, cz_b - 0.08)) @ rot_x, verts=tmp.verts)
        vmap = {v.index: bm.verts.new(v.co) for v in tmp.verts}
        for f in tmp.faces:
            bm.faces.new([vmap[v.index] for v in f.verts])
        tmp.free()

    objs.append(finalize_bmesh_to_object(bm, "High_Current_Busbars", pal["silver_contact"]))

    norm_info = normalize_assembly_objects(objs)
    return objs, norm_info


# ==============================================================================
# 8. GLB Export, Binary Verification & Blueprint Wireframe Preview Renderer
# ==============================================================================

def inspect_glb_binary(glb_path):
    """Parse exported GLB header & JSON chunk to verify exact vertex/triangle counts and node names."""
    with open(glb_path, "rb") as f:
        raw = f.read()
    magic, version, total_len = struct.unpack("<4sII", raw[:12])
    assert magic == b"glTF" and version == 2, f"Invalid GLB header in {glb_path}"
    j_len, j_type = struct.unpack("<II", raw[12:20])
    gltf = json.loads(raw[20 : 20 + j_len].decode("utf-8"))

    accessors = gltf.get("accessors", [])
    meshes = gltf.get("meshes", [])
    nodes = gltf.get("nodes", [])

    total_verts = 0
    total_tris = 0
    part_stats = []

    for node in nodes:
        m_idx = node.get("mesh")
        if m_idx is None:
            continue
        m = meshes[m_idx]
        n_verts = 0
        n_tris = 0
        bbox_min = [1e9, 1e9, 1e9]
        bbox_max = [-1e9, -1e9, -1e9]
        for prim in m.get("primitives", []):
            pos_idx = prim["attributes"]["POSITION"]
            pos_acc = accessors[pos_idx]
            n_verts += pos_acc["count"]
            if "min" in pos_acc and "max" in pos_acc:
                for axis in range(3):
                    bbox_min[axis] = min(bbox_min[axis], pos_acc["min"][axis])
                    bbox_max[axis] = max(bbox_max[axis], pos_acc["max"][axis])
            if "indices" in prim:
                n_tris += accessors[prim["indices"]]["count"] // 3
            else:
                n_tris += pos_acc["count"] // 3
        total_verts += n_verts
        total_tris += n_tris
        part_stats.append({
            "nodeName": node.get("name"),
            "meshName": m.get("name"),
            "vertices": n_verts,
            "triangles": n_tris,
            "min": [round(v, 4) for v in bbox_min],
            "max": [round(v, 4) for v in bbox_max],
        })

    return {
        "fileSizeBytes": len(raw),
        "vertexCount": total_verts,
        "faceCount": total_tris,
        "parts": part_stats,
    }


def make_blueprint_preview_material(name, fill_rgb, wire_rgb, wire_px=1.25):
    """
    Create an EEVEE shader mixing warm paper-white matte fill with crisp `ShaderNodeWireframe`
    lines so QA renders show the exact CAD mesh topology!
    """
    mat = bpy.data.materials.new(name=name)
    if mat.node_tree is None:
        mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf_fill = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf_fill.inputs["Base Color"].default_value = (*fill_rgb, 1.0)
    bsdf_fill.inputs["Roughness"].default_value = 0.85
    bsdf_fill.inputs["Metallic"].default_value = 0.05

    bsdf_wire = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf_wire.inputs["Base Color"].default_value = (*wire_rgb, 1.0)
    bsdf_wire.inputs["Roughness"].default_value = 0.45

    wire_node = nt.nodes.new("ShaderNodeWireframe")
    wire_node.use_pixel_size = True
    wire_node.inputs["Size"].default_value = wire_px

    mix_sh = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(wire_node.outputs["Fac"], mix_sh.inputs["Fac"])
    nt.links.new(bsdf_fill.outputs["BSDF"], mix_sh.inputs[1])
    nt.links.new(bsdf_wire.outputs["BSDF"], mix_sh.inputs[2])
    nt.links.new(mix_sh.outputs["Shader"], out.inputs["Surface"])
    return mat


def render_wireframe_previews(objs, model_id, explode_map):
    """
    Render two crisp 1100x820 EEVEE CAD wireframe QA images (assembled + exploded)
    AFTER the clean GLB has already been exported.
    """
    scn = bpy.context.scene
    scn.render.engine = "BLENDER_EEVEE"
    scn.render.resolution_x = 1100
    scn.render.resolution_y = 820
    scn.render.film_transparent = False

    # Warm paper white world background (#F6F5F1 -> linear ~0.91, 0.90, 0.87)
    world = bpy.data.worlds.new(f"World_{model_id}")
    if world.node_tree is None:
        world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (0.89, 0.88, 0.84, 1.0)
        bg.inputs[1].default_value = 1.05
    scn.world = world

    # Three-point studio lighting
    for lname, loc, energy in [
        ("KeyLight", (3.6, -3.8, 4.2), 18.0),
        ("FillLight", (-3.5, -2.2, 2.0), 8.0),
        ("RimLight", (0.5, 4.0, 3.2), 10.0),
    ]:
        ld = bpy.data.lights.new(lname, type="AREA")
        ld.energy = energy
        ld.size = 3.5
        lo = bpy.data.objects.new(lname, ld)
        scn.collection.objects.link(lo)
        lo.location = loc
        direction = Vector((0.0, 0.0, 0.0)) - Vector(loc)
        lo.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()

    # Camera looking at origin from front-right-top (+X, -Y, +Z in Blender == +X, +Y, +Z in Three.js!)
    cam_d = bpy.data.cameras.new("PreviewCam")
    cam_d.lens = 34.0
    cam = bpy.data.objects.new("PreviewCam", cam_d)
    scn.collection.objects.link(cam)
    scn.camera = cam

    mat_housing = make_blueprint_preview_material("Prev_Housing", (0.91, 0.91, 0.88), (0.015, 0.14, 0.08), 1.15)
    mat_gold = make_blueprint_preview_material("Prev_Gold", (0.95, 0.90, 0.76), (0.52, 0.36, 0.05), 1.20)
    mat_seal = make_blueprint_preview_material("Prev_Seal", (0.84, 0.91, 0.87), (0.02, 0.24, 0.14), 1.15)

    for obj in objs:
        role = explode_map.get(obj.name, {}).get("role", "housing")
        obj.data.materials.clear()
        obj.data.materials.append(mat_gold if role == "gold" else mat_seal if role == "seal" else mat_housing)

    # 1) Assembled view
    cam.location = (2.75, -3.05, 1.95)
    cam.rotation_euler = (Vector((0.0, 0.0, 0.0)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    out_assembled = os.path.join(PREVIEW_OUT_DIR, f"{model_id}-wireframe.png")
    scn.render.filepath = out_assembled
    bpy.ops.render.render(write_still=True)

    # 2) Exploded view (convert Three.js [ox, oy, oz] -> Blender (ox, -oz, oy))
    for obj in objs:
        off = explode_map.get(obj.name, {}).get("offset", [0.0, 0.0, 0.0])
        obj.location = (off[0], -off[2], off[1])

    cam.location = (3.85, -4.35, 2.65)
    cam.rotation_euler = (Vector((0.0, 0.0, 0.05)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    out_exploded = os.path.join(PREVIEW_OUT_DIR, f"{model_id}-exploded.png")
    scn.render.filepath = out_exploded
    bpy.ops.render.render(write_still=True)


# ==============================================================================
# 9. Master Pipeline Execution
# ==============================================================================

MODEL_BUILD_SPECS = [
    {
        "id": "connector-housings",
        "filename": "connector-housings.glb",
        "builder": build_connector_housings,
        "parts": {
            "Housing_Body": {"offset": [0.0, 0.0, 0.0], "role": "housing"},
            "CPA_Lock": {"offset": [0.0, 0.56, -0.42], "role": "gold"},
            "TPA_Retainer": {"offset": [0.0, 0.0, 0.96], "role": "gold"},
            "Terminal_Pins": {"offset": [0.0, 0.0, -1.15], "role": "gold"},
            "Perimeter_Seal": {"offset": [0.0, 0.0, 0.96], "role": "seal"},
        },
    },
    {
        "id": "sealed-heavy-duty",
        "filename": "sealed-heavy-duty.glb",
        "builder": build_sealed_heavy_duty,
        "parts": {
            "Outer_Shroud": {"offset": [0.0, 0.0, -0.38], "role": "housing"},
            "Lever_Cam_Latch": {"offset": [0.0, 0.86, 0.12], "role": "gold"},
            "Triple_Rib_Seal": {"offset": [0.0, 0.0, 0.62], "role": "seal"},
            "Cavity_Block": {"offset": [0.0, 0.0, 1.18], "role": "housing"},
            "Power_Contacts": {"offset": [0.0, 0.0, -1.18], "role": "gold"},
        },
    },
    {
        "id": "terminals-contacts",
        "filename": "terminals-contacts.glb",
        "builder": build_terminals_contacts,
        "parts": {
            "Contact_Box": {"offset": [0.0, 0.0, 0.66], "role": "gold"},
            "Locking_Lance": {"offset": [0.0, 0.42, 0.15], "role": "housing"},
            "Wire_Crimp_Barrel": {"offset": [0.0, 0.0, -0.34], "role": "gold"},
            "Insulation_Crimp": {"offset": [0.0, 0.0, -0.84], "role": "housing"},
        },
    },
    {
        "id": "seals-accessories",
        "filename": "seals-accessories.glb",
        "builder": build_seals_accessories,
        "parts": {
            "Triple_Lip_SWS": {"offset": [-0.16, 0.0, 0.34], "role": "seal"},
            "Cavity_Blind_Plug": {"offset": [0.42, 0.32, 0.28], "role": "seal"},
            "Secondary_Wedge_Lock": {"offset": [0.0, 0.0, 0.88], "role": "gold"},
            "Strain_Relief_Cap": {"offset": [0.0, 0.0, -0.76], "role": "housing"},
        },
    },
    {
        "id": "power-distribution",
        "filename": "power-distribution.glb",
        "builder": build_power_distribution,
        "parts": {
            "Diecast_Flange_Housing": {"offset": [0.0, 0.0, 0.0], "role": "housing"},
            "EMC_Shield_Collar": {"offset": [0.0, 0.0, -0.88], "role": "gold"},
            "HVIL_Signal_Bridge": {"offset": [0.0, 0.68, 0.42], "role": "gold"},
            "High_Current_Busbars": {"offset": [0.0, 0.0, 0.96], "role": "gold"},
            "Flange_Gasket": {"offset": [0.0, 0.0, 0.78], "role": "seal"},
        },
    },
]


def main():
    os.makedirs(MODELS_OUT_DIR, exist_ok=True)
    os.makedirs(PREVIEW_OUT_DIR, exist_ok=True)

    manifest_models = []

    for spec in MODEL_BUILD_SPECS:
        reset_scene()
        pal = get_industrial_palette()
        objs, norm_info = spec["builder"](pal)

        glb_path = os.path.join(MODELS_OUT_DIR, spec["filename"])
        bpy.ops.export_scene.gltf(
            filepath=glb_path,
            export_format="GLB",
            export_yup=True,
            export_apply=True,
            export_materials="EXPORT",
        )

        glb_report = inspect_glb_binary(glb_path)
        tri_count = glb_report["faceCount"]
        print(
            f"[CAD-OK] {spec['filename']}: {glb_report['vertexCount']} verts, "
            f"{tri_count} tris, {glb_report['fileSizeBytes'] / 1024:.1f} KB"
        )
        assert 4000 <= tri_count <= 20000, (
            f"Triangle budget violation for {spec['filename']}: {tri_count} (expected 4,000..20,000)"
        )

        # Render wireframe QA previews (assembled + exploded)
        render_wireframe_previews(objs, spec["id"], spec["parts"])

        manifest_models.append({
            "id": spec["id"],
            "filename": spec["filename"],
            "glbPath": f"/assets/models/{spec['filename']}",
            "fileSizeBytes": glb_report["fileSizeBytes"],
            "vertexCount": glb_report["vertexCount"],
            "faceCount": glb_report["faceCount"],
            "envelopeTarget": TARGET_ENVELOPE,
            "normalizedSize": norm_info["normalizedSizeBlender"],
            "parts": glb_report["parts"],
        })

    manifest_data = {
        "generator": "Blender 5.3 Parametric Automotive CAD Pipeline",
        "exportSettings": {
            "export_format": "GLB",
            "export_yup": True,
            "export_apply": True,
            "normalizedEnvelope": TARGET_ENVELOPE,
        },
        "models": manifest_models,
    }
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest_data, f, ensure_ascii=False, indent=2)
    print(f"[MANIFEST-OK] Wrote {MANIFEST_PATH}")


if __name__ == "__main__":
    main()
