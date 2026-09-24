#!/usr/bin/env python3
"""Build QC video catalog entries and local public media from the IWC Videos folder."""

from __future__ import annotations

import json
import os
import re
import shutil
import struct
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path("/Users/alichafai/Downloads/IWC Videos")
PRODUCTS_PATH = Path("/tmp/iwc-products-for-qc.json")
MEDIA_DIR = ROOT / "public" / "qc-videos-media"
DATA_FILE = ROOT / "src" / "data" / "qc-videos.ts"
PUBLIC_PREFIX = "/qc-videos-media"

COLOR_WORDS = (
    "white",
    "black",
    "blue",
    "green",
    "brown",
    "gold",
    "rose",
    "ceramic",
    "salmon",
    "silver",
    "moon",
    "phase",
    "perpetual",
    "calendar",
    "chronograph",
    "automatic",
    "portofino",
    "portugieser",
    "portuguese",
    "pilot",
    "mark",
)

REF_IW = re.compile(r"(iw\d{6})", re.I)
TIMESTAMP_NAME = re.compile(r"^\d{14}$")

# Timestamp-only filenames have no reference in the title; map them by inspection.
TIMESTAMP_MATCHES = {
    "20171205125705": {
        "slug": None,
        "title": "IWC replica quality-check video",
        "reference": None,
    },
    "20230320010056": {
        "slug": "iwc-spitfire-replica-iw387902",
        "title": None,
        "reference": "IW387902",
    },
    "20230320101756": {
        "slug": "iwc-da-vinci-replica-iw393402",
        "title": None,
        "reference": "IW393402",
    },
    "20250928021931": {
        "slug": "iwc-ingenieur-replica-iw328907-blue-dial",
        "title": None,
        "reference": "IW328907",
    },
}


def mp4_duration_seconds(path: Path) -> int | None:
    data = path.read_bytes()
    offset = 0
    length = len(data)
    while offset + 8 <= length:
        size = struct.unpack(">I", data[offset : offset + 4])[0]
        atom = data[offset + 4 : offset + 8]
        if size == 1 and offset + 16 <= length:
            size = struct.unpack(">Q", data[offset + 8 : offset + 16])[0]
            header = 16
        elif size == 0:
            size = length - offset
            header = 8
        else:
            header = 8
        if size < header:
            break
        if atom == b"moov":
            return _duration_from_moov(data[offset + header : offset + size])
        offset += size
    return None


def _duration_from_moov(moov: bytes) -> int | None:
    offset = 0
    length = len(moov)
    while offset + 8 <= length:
        size = struct.unpack(">I", moov[offset : offset + 4])[0]
        atom = moov[offset + 4 : offset + 8]
        if size < 8:
            break
        if atom == b"mvhd":
            payload = moov[offset + 8 : offset + size]
            version = payload[0]
            if version == 1:
                timescale = struct.unpack(">I", payload[20:24])[0]
                duration = struct.unpack(">Q", payload[24:32])[0]
            else:
                timescale = struct.unpack(">I", payload[12:16])[0]
                duration = struct.unpack(">I", payload[16:20])[0]
            if timescale:
                return max(1, round(duration / timescale))
            return None
        offset += size
    return None


def slugify(value: str) -> str:
    value = value.lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")[:80]


def extract_ref(stem: str) -> str | None:
    match = REF_IW.search(stem.replace("_", "-"))
    return match.group(1).upper() if match else None


def filename_haystack(stem: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", stem.lower())


def product_haystack(product: dict) -> str:
    return f"{product['title']} {product['slug']}".lower()


def has_ref(product: dict, ref: str) -> bool:
    blob = f"{product['title']} {product['slug']}".lower().replace("-", " ").replace("_", " ")
    return re.search(rf"(^|[^a-z0-9]){re.escape(ref.lower())}([^a-z0-9]|$)", blob) is not None


def score_product(product: dict, ref: str | None, hay: str) -> int:
    if not ref or not has_ref(product, ref):
        return -1
    blob = product_haystack(product).replace("-", " ")
    score = 20
    for word in COLOR_WORDS:
        in_file = word in hay
        in_prod = word in blob
        if in_file and in_prod:
            score += 4
        elif in_file and not in_prod:
            score -= 3
        elif in_prod and not in_file and word in {"moon", "phase", "perpetual", "calendar", "chronograph"}:
            score -= 3
    return score


def human_title(stem: str, reference: str | None) -> str:
    name = re.sub(r" copy$", "", stem, flags=re.I)
    name = re.sub(r"-?\d+$", "", name)
    name = name.replace("_", " ").replace("-", " ")
    name = re.sub(r"\s+", " ", name).strip()
    name = re.sub(r"\b(swiss clone|swiss fake|superclone|fake)\b", "Replica", name, flags=re.I)
    name = re.sub(r"\bSchaffhausen\b", "", name, flags=re.I)
    name = re.sub(r"\s+", " ", name).strip()
    if not re.search(r"\biwc\b", name, re.I):
        name = f"IWC {name}"
    if not re.search(r"replica", name, re.I):
        name = f"{name} Replica"
    name = name.title().replace("Iwc", "IWC")
    if reference and reference.lower() not in re.sub(r"[^a-z0-9]", "", name.lower()):
        name = f"{name} {reference}"
    return name[:140]


def generate_thumb(src: Path, dest: Path) -> bool:
    dest.parent.mkdir(parents=True, exist_ok=True)
    out_dir = dest.parent
    try:
        subprocess.run(
            ["qlmanage", "-t", "-s", "960", "-o", str(out_dir), str(src)],
            check=True,
            capture_output=True,
            text=True,
        )
    except (FileNotFoundError, subprocess.CalledProcessError):
        return False
    produced = out_dir / f"{src.name}.png"
    if not produced.exists():
        matches = list(out_dir.glob("*.png"))
        if not matches:
            return False
        produced = matches[0]
    try:
        subprocess.run(
            ["sips", "-s", "format", "jpeg", str(produced), "--out", str(dest)],
            check=True,
            capture_output=True,
            text=True,
        )
        produced.unlink(missing_ok=True)
        return dest.exists()
    except (FileNotFoundError, subprocess.CalledProcessError):
        shutil.copyfile(produced, dest.with_suffix(".png"))
        return False


def ts_literal(records: list[dict]) -> str:
    lines = ["import type { QcVideoRecord } from '../types/qc-video';", "", "export const qcVideos: QcVideoRecord[] = ["]
    for record in records:
        duration = "null" if record["durationSeconds"] is None else str(record["durationSeconds"])
        slug = "null" if record["productSlug"] is None else json.dumps(record["productSlug"])
        reference = "null" if record["reference"] is None else json.dumps(record["reference"])
        lines.append("  {")
        lines.append(f'    id: {json.dumps(record["id"])},')
        lines.append(f'    productName: {json.dumps(record["productName"])},')
        lines.append(f"    productSlug: {slug},")
        lines.append(f"    reference: {reference},")
        lines.append(f'    videoPath: {json.dumps(record["videoPath"])},')
        lines.append(f'    thumbnailPath: {json.dumps(record["thumbnailPath"])},')
        lines.append(f"    durationSeconds: {duration},")
        lines.append(f'    uploadDate: {json.dumps(record["uploadDate"])},')
        lines.append("  },")
    lines.append("];")
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    products = json.loads(PRODUCTS_PATH.read_text())
    products_by_slug = {item["slug"]: item for item in products}
    files = sorted(p for p in SOURCE.glob("*.mp4") if p.is_file())
    chosen: dict[str, dict] = {}

    for path in files:
        stem = path.stem
        if stem.lower().endswith(" copy"):
            continue
        timestamp_meta = TIMESTAMP_MATCHES.get(stem) if TIMESTAMP_NAME.match(stem) else None
        ref = extract_ref(stem)
        hay = filename_haystack(stem)
        scored = []
        for product in products:
            value = score_product(product, ref, hay)
            if value >= 20:
                scored.append((value, product))
        scored.sort(key=lambda item: item[0], reverse=True)
        product = None
        if scored:
            top = scored[0][0]
            tied = [item[1] for item in scored if item[0] == top]
            if len(tied) == 1 or top > 20:
                product = tied[0]
        if timestamp_meta:
            if timestamp_meta["slug"]:
                product = products_by_slug.get(timestamp_meta["slug"], product)
            ref = timestamp_meta["reference"] or ref

        video_id = slugify(product["slug"] if product and product["slug"] else stem)
        used_ids = {item["id"] for item in chosen.values()}
        if video_id in used_ids:
            video_id = slugify(f"{video_id}-{ref or path.stem[-8:]}")
            suffix = 2
            while video_id in used_ids:
                video_id = slugify(f"{video_id}-{suffix}")
                suffix += 1

        product_name = product["title"] if product else human_title(stem, ref)
        if timestamp_meta and timestamp_meta["title"]:
            product_name = timestamp_meta["title"]

        chosen[str(path)] = {
            "id": video_id,
            "source": str(path),
            "productName": product_name,
            "productSlug": product["slug"] if product else None,
            "reference": ref,
            "uploadDate": datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc).date().isoformat(),
        }

    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    records = []
    for record in sorted(chosen.values(), key=lambda item: item["productName"].lower()):
        src = Path(record["source"])
        folder = MEDIA_DIR / record["id"]
        folder.mkdir(parents=True, exist_ok=True)
        video_dest = folder / "video.mp4"
        thumb_dest = folder / "thumb.jpg"
        if not video_dest.exists():
            try:
                os.link(src, video_dest)
            except OSError:
                shutil.copy2(src, video_dest)
        if not thumb_dest.exists():
            ok = generate_thumb(src, thumb_dest)
            if not ok:
                raise SystemExit(f"Failed to generate thumbnail for {src.name}")
        duration = mp4_duration_seconds(src)
        records.append(
            {
                "id": record["id"],
                "productName": record["productName"],
                "productSlug": record["productSlug"],
                "reference": record["reference"],
                "videoPath": f"{PUBLIC_PREFIX}/{record['id']}/video.mp4",
                "thumbnailPath": f"{PUBLIC_PREFIX}/{record['id']}/thumb.jpg",
                "durationSeconds": duration,
                "uploadDate": record["uploadDate"],
            }
        )
        matched = "MATCH" if record["productSlug"] else "open"
        print(f"{matched:6} {record['reference'] or '-':12} {record['productName']}")

    DATA_FILE.write_text(ts_literal(records))
    print(f"wrote {len(records)} videos to {DATA_FILE}")


if __name__ == "__main__":
    main()
