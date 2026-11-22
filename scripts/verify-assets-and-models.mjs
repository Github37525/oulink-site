import assert from "node:assert/strict";
import { access, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CAD_MODELS_BY_CATEGORY, getCadModelForCategory } from "../src/content/cadModelsMeta.js";
import { PRODUCT_CATEGORIES } from "../src/content/productsCatalog.js";

const rootDir = fileURLToPath(new URL("..", import.meta.url));

/**
 * Parse JPEG binary buffer to extract exact pixel dimensions and progressive encoding flag.
 */
export function parseJpegHeader(buf, label = "jpeg") {
  assert.ok(buf.length > 24, `${label}: file buffer too small (${buf.length} bytes)`);
  assert.equal(buf[0], 0xff, `${label}: missing JPEG SOI marker 0xFF`);
  assert.equal(buf[1], 0xd8, `${label}: missing JPEG SOI marker 0xD8`);
  assert.equal(buf[buf.length - 2], 0xff, `${label}: missing JPEG EOI marker 0xFF`);
  assert.equal(buf[buf.length - 1], 0xd9, `${label}: missing JPEG EOI marker 0xD9`);

  let offset = 2;
  while (offset < buf.length - 8) {
    if (buf[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (offset < buf.length && buf[offset] === 0xff) {
      offset += 1;
    }
    if (offset >= buf.length) break;
    const marker = buf[offset];
    offset += 1;

    // Standalone markers without payload length
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      continue;
    }

    if (offset + 2 > buf.length) break;
    const segLen = buf.readUInt16BE(offset);
    assert.ok(segLen >= 2, `${label}: invalid JPEG segment length ${segLen}`);

    // SOF0 (Baseline), SOF1 (Extended Sequential), SOF2 (Progressive)
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      const precision = buf[offset + 2];
      const height = buf.readUInt16BE(offset + 3);
      const width = buf.readUInt16BE(offset + 5);
      const components = buf[offset + 7];
      return {
        width,
        height,
        precision,
        components,
        progressive: marker === 0xc2,
      };
    }

    offset += segLen;
  }

  throw new Error(`${label}: could not locate SOF0/SOF1/SOF2 frame header`);
}

/**
 * Parse binary glTF 2.0 (.glb) header & JSON chunk to verify integrity and named sub-meshes.
 */
export function parseGlbBinary(buf, label = "glb") {
  assert.ok(buf.length > 28, `${label}: GLB buffer too small (${buf.length} bytes)`);
  const magic = buf.readUInt32LE(0);
  const version = buf.readUInt32LE(4);
  const totalLength = buf.readUInt32LE(8);

  assert.equal(magic, 0x46546c67, `${label}: invalid GLB magic header (expected 'glTF')`);
  assert.equal(version, 2, `${label}: expected glTF version 2, got ${version}`);
  assert.equal(totalLength, buf.length, `${label}: GLB header length (${totalLength}) != file size (${buf.length})`);

  const jsonChunkLen = buf.readUInt32LE(12);
  const jsonChunkType = buf.readUInt32LE(16);
  assert.equal(jsonChunkType, 0x4e4f534a, `${label}: first GLB chunk must be JSON (0x4E4F534A)`);
  assert.ok(20 + jsonChunkLen <= buf.length, `${label}: JSON chunk exceeds GLB buffer length`);

  const jsonText = buf.subarray(20, 20 + jsonChunkLen).toString("utf8");
  const gltf = JSON.parse(jsonText);

  const binChunkOffset = 20 + jsonChunkLen;
  assert.ok(binChunkOffset + 8 <= buf.length, `${label}: missing BIN chunk in GLB`);
  const binChunkLen = buf.readUInt32LE(binChunkOffset);
  const binChunkType = buf.readUInt32LE(binChunkOffset + 4);
  assert.equal(binChunkType, 0x004e4942, `${label}: second GLB chunk must be BIN (0x004E4942)`);
  assert.equal(binChunkOffset + 8 + binChunkLen, buf.length, `${label}: BIN chunk end does not match GLB EOF`);

  const nodeNames = (gltf.nodes || []).map((n) => n.name).filter(Boolean);
  const meshNames = (gltf.meshes || []).map((m) => m.name).filter(Boolean);

  return {
    version,
    totalLength,
    nodeNames,
    meshNames,
    nodesCount: (gltf.nodes || []).length,
    meshesCount: (gltf.meshes || []).length,
    materialsCount: (gltf.materials || []).length,
  };
}

export async function verifyEditorialPhotosAndCadModels({ checkDist = false } = {}) {
  const editorialDir = path.join(rootDir, "public", "assets", "editorial");
  const modelsDir = path.join(rootDir, "public", "assets", "models");
  const distClientDir = path.join(rootDir, "dist", "client");
  const specJson = JSON.parse(
    await readFile(path.join(rootDir, "docs", "image26-design-spec.json"), "utf8")
  );

  // 1. Verify all 20 high-resolution editorial photographs
  const expectedEditorialAssets = specJson.editorialAssets || [];
  assert.equal(
    expectedEditorialAssets.length,
    20,
    `Expected 20 editorial assets in docs/image26-design-spec.json, got ${expectedEditorialAssets.length}`
  );

  const dirFiles = (await readdir(editorialDir)).filter((f) => f.toLowerCase().endsWith(".jpg"));
  assert.equal(dirFiles.length, 20, `Expected exactly 20 .jpg files in public/assets/editorial, found ${dirFiles.length}`);

  const photoReport = [];
  for (const asset of expectedEditorialAssets) {
    const filename = path.basename(asset.publicPath);
    const fullPath = path.join(editorialDir, filename);
    const info = await stat(fullPath);
    const buf = await readFile(fullPath);
    const header = parseJpegHeader(buf, filename);

    const isCategoryThumb = filename.startsWith("cat-");
    const minRequiredWidth = isCategoryThumb ? 1000 : 1400;

    assert.ok(
      header.width >= minRequiredWidth,
      `${filename}: width ${header.width}px is below HD requirement (>= ${minRequiredWidth}px)`
    );
    assert.ok(
      header.height >= 500,
      `${filename}: height ${header.height}px is unexpectedly small`
    );
    assert.ok(
      info.size >= 80 * 1024,
      `${filename}: file size ${(info.size / 1024).toFixed(1)} KB is too small for HD studio photography`
    );
    assert.equal(
      header.progressive,
      true,
      `${filename}: expected Progressive JPEG (SOF2) encoding`
    );

    if (checkDist) {
      const distPhotoPath = path.join(distClientDir, asset.publicPath.replace(/^\/+/, ""));
      const distInfo = await stat(distPhotoPath);
      assert.equal(distInfo.size, info.size, `dist/client copy of ${filename} differs in size`);
    }

    photoReport.push({
      filename,
      width: header.width,
      height: header.height,
      sizeKB: Number((info.size / 1024).toFixed(1)),
      progressive: header.progressive,
    });
  }

  // 2. Verify all 5 Blender GLB models, models-manifest.json, and CAD_MODELS_BY_CATEGORY
  const manifestPath = path.join(modelsDir, "models-manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  assert.ok(Array.isArray(manifest.models), "models-manifest.json must contain a models[] array");
  assert.equal(manifest.models.length, 5, `Expected 5 GLB entries in models-manifest.json, got ${manifest.models.length}`);

  if (checkDist) {
    await access(path.join(distClientDir, "assets", "models", "models-manifest.json"));
  }

  const expectedGlbFiles = [
    "connector-housings.glb",
    "sealed-heavy-duty.glb",
    "terminals-contacts.glb",
    "seals-accessories.glb",
    "power-distribution.glb",
  ];

  const modelReport = [];
  for (const glbFilename of expectedGlbFiles) {
    const fullGlbPath = path.join(modelsDir, glbFilename);
    const glbStat = await stat(fullGlbPath);
    const glbBuf = await readFile(fullGlbPath);
    const parsedGlb = parseGlbBinary(glbBuf, glbFilename);

    const manifestEntry = manifest.models.find((m) => m.filename === glbFilename);
    assert.ok(manifestEntry, `models-manifest.json missing entry for ${glbFilename}`);
    assert.equal(manifestEntry.fileSizeBytes, glbStat.size, `${glbFilename} size mismatch vs models-manifest.json`);
    assert.ok(
      manifestEntry.faceCount >= 4000 && manifestEntry.faceCount <= 20000,
      `${glbFilename}: faceCount ${manifestEntry.faceCount} outside CAD target range [4000, 20000]`
    );
    assert.ok(manifestEntry.parts.length >= 4, `${glbFilename}: expected >= 4 independent sub-parts`);

    for (const part of manifestEntry.parts) {
      assert.ok(
        parsedGlb.nodeNames.includes(part.meshName) || parsedGlb.meshNames.includes(part.meshName),
        `${glbFilename}: sub-mesh "${part.meshName}" declared in manifest not found in GLB binary nodes/meshes`
      );
    }

    if (checkDist) {
      const distGlbInfo = await stat(path.join(distClientDir, "assets", "models", glbFilename));
      assert.equal(distGlbInfo.size, glbStat.size, `dist/client/assets/models/${glbFilename} size mismatch`);
    }

    modelReport.push({
      filename: glbFilename,
      sizeKB: Number((glbStat.size / 1024).toFixed(1)),
      vertexCount: manifestEntry.vertexCount,
      faceCount: manifestEntry.faceCount,
      subMeshes: manifestEntry.parts.map((p) => p.meshName),
    });
  }

  // 3. Verify CAD_MODELS_BY_CATEGORY covers all 6 PRODUCT_CATEGORIES and matches GLB sub-meshes
  assert.equal(PRODUCT_CATEGORIES.length, 6, "Expected 6 PRODUCT_CATEGORIES in productsCatalog.js");
  for (const cat of PRODUCT_CATEGORIES) {
    const meta = CAD_MODELS_BY_CATEGORY[cat.id];
    assert.ok(meta, `CAD_MODELS_BY_CATEGORY missing category "${cat.id}"`);
    assert.equal(getCadModelForCategory(cat.id), meta, `getCadModelForCategory("${cat.id}") mismatch`);
    assert.ok(meta.glbPath.startsWith("/assets/models/") && meta.glbPath.endsWith(".glb"));
    assert.ok(meta.nameZh && meta.nameEn && meta.code && meta.dimensions && meta.ipRating);
    assert.ok(Array.isArray(meta.parts) && meta.parts.length >= 4, `${cat.id}: expected >= 4 CAD sub-parts`);

    const glbFile = path.basename(meta.glbPath);
    const glbBuf = await readFile(path.join(modelsDir, glbFile));
    const parsedGlb = parseGlbBinary(glbBuf, glbFile);
    for (const part of meta.parts) {
      assert.ok(
        parsedGlb.nodeNames.includes(part.meshName) || parsedGlb.meshNames.includes(part.meshName),
        `Category "${cat.id}" part "${part.meshName}" missing from ${glbFile}`
      );
      assert.ok(Array.isArray(part.explodeOffset) && part.explodeOffset.length === 3);
    }
  }

  // Fallback check
  assert.equal(getCadModelForCategory("all"), CAD_MODELS_BY_CATEGORY["connector-housings"]);
  assert.equal(getCadModelForCategory("unknown"), CAD_MODELS_BY_CATEGORY["connector-housings"]);

  return {
    editorialCount: photoReport.length,
    glbModelCount: modelReport.length,
    photoReport,
    modelReport,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const result = await verifyEditorialPhotosAndCadModels({ checkDist: false });
  console.log(
    `Verified ${result.editorialCount} HD editorial photos and ${result.glbModelCount} Blender GLB CAD assemblies:`
  );
  for (const p of result.photoReport) {
    console.log(`  [JPG] ${p.filename.padEnd(30)} ${p.width}x${p.height} (${p.sizeKB} KB, progressive=${p.progressive})`);
  }
  for (const m of result.modelReport) {
    console.log(
      `  [GLB] ${m.filename.padEnd(26)} ${m.vertexCount} V / ${m.faceCount} T (${m.sizeKB} KB) -> [${m.subMeshes.join(", ")}]`
    );
  }
}
