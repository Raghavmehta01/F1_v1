"""Convert strength / predicted-finish scores into win & podium probabilities."""

from __future__ import annotations

import numpy as np


def softmax(x: np.ndarray, temperature: float = 1.0) -> np.ndarray:
    t = max(float(temperature), 1e-6)
    z = (x - np.max(x)) / t
    e = np.exp(z)
    s = e.sum()
    return e / s if s > 0 else np.full_like(e, 1.0 / max(len(e), 1))


def _scale_strength(strength: np.ndarray) -> np.ndarray:
    """Z-score so temperature is scale-invariant across model / heuristic."""
    s = np.asarray(strength, dtype=float)
    if len(s) == 0:
        return s
    std = float(np.std(s))
    if std < 1e-6:
        return np.zeros_like(s)
    return (s - float(np.mean(s))) / std


def _cap_and_renorm(probs: np.ndarray, cap: float) -> np.ndarray:
    """Clip any mass above `cap` and redistribute to uncapped entries."""
    out = np.asarray(probs, dtype=float).copy()
    if len(out) == 0:
        return out
    cap = float(cap)
    for _ in range(len(out) + 2):
        over = out > cap + 1e-12
        if not np.any(over):
            break
        excess = float(out[over].sum() - cap * int(over.sum()))
        out[over] = cap
        under = ~over
        if not np.any(under) or excess <= 1e-12:
            break
        out[under] += excess * (out[under] / out[under].sum())
    s = float(out.sum())
    return out / s if s > 0 else out


def win_and_podium_from_strength(
    strength: np.ndarray,
    *,
    temperature: float = 1.65,
    max_win: float = 0.42,
    max_podium: float = 0.72,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Plackett–Luce with soft removal → win + P(top-3), plus rank order.

    Strength is z-scored before softmax so raw finish gaps cannot push
    podium probabilities to ~100% (a common board-looking bug).
    """
    n = len(strength)
    if n == 0:
        return (
            np.array([], dtype=float),
            np.array([], dtype=float),
            np.array([], dtype=int),
        )

    scaled = _scale_strength(strength)
    win = softmax(scaled, temperature=temperature)
    podium = np.zeros(n, dtype=float)
    remaining = np.ones(n, dtype=float)

    for _ in range(3):
        masked = scaled.copy()
        masked[remaining <= 1e-12] = -1e9
        slot = softmax(masked, temperature=temperature) * remaining
        total = slot.sum()
        if total <= 1e-12:
            break
        slot = slot / total
        podium += slot
        remaining = np.clip(remaining * (1.0 - slot), 0.0, 1.0)

    # Soft caps: F1 fields are noisy; never show near-certainty pre-race.
    win = _cap_and_renorm(win, max_win)
    podium = np.clip(np.maximum(podium, win), 0.0, max_podium)

    order = np.argsort(-strength)
    ranks = np.empty(n, dtype=int)
    ranks[order] = np.arange(1, n + 1)
    return win, podium, ranks
