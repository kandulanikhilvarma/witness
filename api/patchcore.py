"""Stage-1 anomaly detector — a PatchCore-style memory bank.

PatchCore's idea, kept honest under Vercel's size limits: instead of a deep
timm backbone (torch alone blows the bundle), features are cheap local patch
statistics. The shape is the same — build a memory bank of "normal" patch
features from an enrolment's reference photos, then score a subject by each
patch's nearest-neighbour distance to that bank, taking the image score as the
max (the most anomalous patch). No torch, no network, no secrets: this function
is pure compute. The Next server owns all DB I/O under the tenant's RLS session
and calls this statelessly.

EfficientAD is deliberately not used (MVTec patent).
"""

from __future__ import annotations

import base64
import io
import json
from http.server import BaseHTTPRequestHandler

import numpy as np
from PIL import Image

SIZE = 96  # working edge, px
GRID = 8  # patches per side → 64 patches
BANK_CAP = 512  # max patches kept after coreset subsample
FEAT_DIMS = 5
# The calibration knob. Flag a subject when its worst patch sits this many times
# farther from normal than the worst reference patch did. Coreset subsampling and
# lighting spread push unseen-but-good parts above 1.0, so the floor is >1; a real
# fleet tunes this against its own false-positive tolerance.
THRESH_MARGIN = 2.0


def _decode(b64: str) -> np.ndarray:
    """base64 (optionally a data: URI) → greyscale float array at SIZE×SIZE."""
    if "," in b64 and b64.strip().startswith("data:"):
        b64 = b64.split(",", 1)[1]
    img = Image.open(io.BytesIO(base64.b64decode(b64))).convert("L").resize((SIZE, SIZE))
    return np.asarray(img, dtype=np.float64)


def extract_features(gray: np.ndarray) -> np.ndarray:
    """A GRID×GRID lattice of 5-dim patch descriptors → (GRID*GRID, 5)."""
    gy, gx = np.gradient(gray)
    step = SIZE // GRID
    feats = np.empty((GRID * GRID, FEAT_DIMS), dtype=np.float64)
    k = 0
    for r in range(GRID):
        for c in range(GRID):
            ys, xs = r * step, c * step
            p = gray[ys : ys + step, xs : xs + step]
            pgx = gx[ys : ys + step, xs : xs + step]
            pgy = gy[ys : ys + step, xs : xs + step]
            mag = np.hypot(pgx, pgy)
            feats[k] = (
                p.mean(),
                p.std(),
                np.abs(pgx).mean(),
                np.abs(pgy).mean(),
                float((mag > 15).mean()),
            )
            k += 1
    return feats


def _coreset(x: np.ndarray, cap: int) -> np.ndarray:
    """Greedy farthest-point subsample — PatchCore's coreset, deterministic."""
    n = len(x)
    if n <= cap:
        return np.arange(n)
    picked = [0]
    d = np.linalg.norm(x - x[0], axis=1)
    for _ in range(cap - 1):
        i = int(np.argmax(d))
        picked.append(i)
        d = np.minimum(d, np.linalg.norm(x - x[i], axis=1))
    return np.array(picked)


def _nn_dist(patches: np.ndarray, bank: np.ndarray) -> np.ndarray:
    """Per-patch nearest-neighbour distance to the bank → (n_patches,)."""
    d = np.sqrt(((patches[:, None, :] - bank[None, :, :]) ** 2).sum(-1))
    return d.min(axis=1)


def train(images_b64: list[str]) -> dict:
    per_image = [extract_features(_decode(b)) for b in images_b64]
    feats = np.concatenate(per_image, axis=0)
    mean = feats.mean(axis=0)
    std = feats.std(axis=0)
    std[std < 1e-6] = 1.0
    z = (feats - mean) / std
    bank = z[_coreset(z, BANK_CAP)]

    # Calibrate the threshold leave-one-image-out: score each reference against a
    # bank built WITHOUT its own patches. Scoring against the full bank would give
    # every reference patch a zero-distance self-match (the coreset keeps them
    # all when the set is small), collapsing the threshold to zero — after which
    # every subject reads anomalous. LOO measures the real spread of "normal".
    sizes = [len(p) for p in per_image]
    bounds = np.cumsum([0, *sizes])
    per_img_scores = []
    for i in range(len(per_image)):
        lo, hi = bounds[i], bounds[i + 1]
        others = np.delete(z, np.s_[lo:hi], axis=0)
        if len(others) == 0:
            continue
        bank_i = others[_coreset(others, BANK_CAP)]
        per_img_scores.append(_nn_dist(z[lo:hi], bank_i).max())
    per_img = np.array(per_img_scores)
    threshold = float(per_img.max() * THRESH_MARGIN) if len(per_img) else 1.0

    return {
        "size": SIZE,
        "grid": GRID,
        "mean": mean.tolist(),
        "std": std.tolist(),
        "bank": bank.tolist(),
        "threshold": threshold,
        "metrics": {
            "n_images": len(images_b64),
            "n_patches_seen": int(len(feats)),
            "n_bank": int(len(bank)),
            "ref_score_mean": float(per_img.mean()) if len(per_img) else 0.0,
            "ref_score_max": float(per_img.max()) if len(per_img) else 0.0,
        },
    }


def score(coreset: dict, image_b64: str) -> dict:
    mean = np.array(coreset["mean"])
    std = np.array(coreset["std"])
    bank = np.array(coreset["bank"])
    threshold = float(coreset["threshold"]) or 1.0
    patches = (extract_features(_decode(image_b64)) - mean) / std
    dpatch = _nn_dist(patches, bank)
    raw = float(dpatch.max())
    grid = int(coreset["grid"])
    return {
        "score": raw,
        "normalized": raw / threshold,
        "anomalous": raw > threshold,
        "threshold": threshold,
        "heatmap": np.round(dpatch.reshape(grid, grid), 3).tolist(),
    }


def _dispatch(payload: dict) -> dict:
    op = payload.get("op")
    if op == "train":
        imgs = payload.get("images") or []
        if not imgs:
            return {"error": "no reference images"}
        return train(imgs)
    if op == "score":
        cs = payload.get("coreset")
        img = payload.get("image")
        if not cs or not img:
            return {"error": "coreset and image required"}
        return score(cs, img)
    return {"error": f"unknown op {op!r}"}


class handler(BaseHTTPRequestHandler):  # noqa: N801 — Vercel Python entrypoint name
    def do_POST(self):  # noqa: N802
        length = int(self.headers.get("content-length", 0))
        try:
            payload = json.loads(self.rfile.read(length) or b"{}")
            body = _dispatch(payload)
            status = 400 if "error" in body else 200
        except Exception as exc:  # malformed request — report, do not crash the worker
            body, status = {"error": str(exc)}, 400
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


if __name__ == "__main__":
    # Self-check: a bank of smooth "normal" tiles should score another smooth
    # tile below threshold and a blob-defaced tile well above it.
    rng = np.random.default_rng(0)

    def tile(defect: bool) -> str:
        base = np.linspace(60, 190, SIZE, dtype=np.float64)
        g = np.tile(base, (SIZE, 1)) + rng.normal(0, 4, (SIZE, SIZE))
        if defect:
            g[20:44, 20:44] = 250  # bright gouge
        g = np.clip(g, 0, 255).astype(np.uint8)
        buf = io.BytesIO()
        Image.fromarray(g).save(buf, format="PNG")
        return base64.b64encode(buf.getvalue()).decode()

    cs = train([tile(False) for _ in range(24)])
    normal = score(cs, tile(False))
    defect = score(cs, tile(True))
    print("threshold", round(cs["threshold"], 3))
    print("normal", round(normal["normalized"], 3), "defect", round(defect["normalized"], 3))
    assert not normal["anomalous"], "clean tile flagged anomalous"
    assert defect["anomalous"], "defect tile missed"
    assert defect["normalized"] > normal["normalized"] * 1.5, "defect not separated"
    print("PASS patchcore")
