#!/usr/bin/env python3
"""Fail CI if a training config references a dataset not cleared for training.

The dataset licence register (data/registry.yaml) is the source of truth. Only
datasets whose role is `train` may be named by a file under configs/train/.
Everything else — eval-only, cite-only, excluded, quarantined — is a build
failure the moment a training config points at it.

Exit 0 = clean. Exit 1 = a violation or a malformed registry.
"""
from __future__ import annotations

import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
REGISTRY = ROOT / "data" / "registry.yaml"
TRAIN_CONFIG_DIR = ROOT / "configs" / "train"

VALID_ROLES = {"train", "eval-only", "cite-only", "excluded", "quarantined"}
REQUIRED_FIELDS = {"name", "url", "licence", "role", "verified"}


def load_registry() -> list[dict]:
    if not REGISTRY.exists():
        fail(f"registry not found at {REGISTRY.relative_to(ROOT)}")
    data = yaml.safe_load(REGISTRY.read_text(encoding="utf-8"))
    datasets = data.get("datasets") if isinstance(data, dict) else None
    if not isinstance(datasets, list) or not datasets:
        fail("registry has no `datasets` list")
    for d in datasets:
        missing = REQUIRED_FIELDS - d.keys()
        if missing:
            fail(f"dataset {d.get('name', '?')} missing fields: {sorted(missing)}")
        if d["role"] not in VALID_ROLES:
            fail(f"dataset {d['name']} has invalid role {d['role']!r}")
    return datasets


def referenced_datasets() -> set[str]:
    """Every dataset name named by a training config."""
    names: set[str] = set()
    if not TRAIN_CONFIG_DIR.exists():
        return names
    for cfg in TRAIN_CONFIG_DIR.rglob("*.y*ml"):
        doc = yaml.safe_load(cfg.read_text(encoding="utf-8")) or {}
        ds = doc.get("datasets") or doc.get("dataset")
        if isinstance(ds, str):
            names.add(ds)
        elif isinstance(ds, list):
            names.update(str(x) for x in ds)
    return names


def fail(msg: str) -> None:
    print(f"check-licences: FAIL — {msg}", file=sys.stderr)
    sys.exit(1)


def main() -> None:
    datasets = load_registry()
    by_name = {d["name"]: d for d in datasets}
    trainable = {name for name, d in by_name.items() if d["role"] == "train"}

    referenced = referenced_datasets()
    violations = []
    for name in sorted(referenced):
        if name not in by_name:
            violations.append(f"{name}: not in registry")
        elif name not in trainable:
            violations.append(f"{name}: role is {by_name[name]['role']}, not train")

    if violations:
        for v in violations:
            print(f"check-licences: FAIL — training config uses {v}", file=sys.stderr)
        sys.exit(1)

    print(
        f"check-licences: OK — {len(datasets)} datasets, "
        f"{len(trainable)} trainable, {len(referenced)} referenced by train configs."
    )


if __name__ == "__main__":
    main()
