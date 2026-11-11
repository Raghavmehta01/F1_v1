"""Convert strength / predicted-finish scores into win & podium probabilities."""

from __future__ import annotations

import numpy as np


def softmax(x: np.ndarray, temperature: float = 1.0) -> np.ndarray:
    t = max(float(temperature), 1e-6)
    z = (x - np.max(x)) / t
    e = np.exp(z)
    s = e.sum()
    return e / s if s > 0 else np.full_like(e, 1.0 / max(len(e), 1))


def win_and_podium_from_strength(
    strength: np.ndarray,
    *,
    temperature: float = 1.8,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Plackett–Luce with soft removal → win + P(top-3), plus rank order.

    Soft removal avoids the hard-argmax bug that pushed some podium probs to ~1.0.
    """
    n = len(strength)
    if n == 0:
        return (
            np.array([], dtype=float),
            np.array([], dtype=float),
            np.array([], dtype=int),
        )

    win = softmax(strength, temperature=temperature)
    podium = np.zeros(n, dtype=float)
    remaining = np.ones(n, dtype=float)

    for _ in range(3):
        masked = strength.copy()
        masked[remaining <= 1e-12] = -1e9
        slot = softmax(masked, temperature=temperature) * remaining
        total = slot.sum()
        if total <= 1e-12:
            break
        slot = slot / total
        podium += slot
        remaining = np.clip(remaining * (1.0 - slot), 0.0, 1.0)

    # Cap: cannot exceed 1; also cannot be below win prob.
    podium = np.clip(np.maximum(podium, win), 0.0, 0.999)

    order = np.argsort(-strength)
    ranks = np.empty(n, dtype=int)
    ranks[order] = np.arange(1, n + 1)
    return win, podium, ranks
