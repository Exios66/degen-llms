import hashlib
import secrets
from typing import Protocol, TypeVar

T = TypeVar("T")

# OS-backed cryptographically secure RNG for production shuffles.
SECURE_RANDOM = secrets.SystemRandom()


class RandomSource(Protocol):
    def randrange(self, start: int, stop: int) -> int: ...


def fisher_yates_shuffle(items: list[T], rng: RandomSource | None = None) -> None:
    """In-place Fisher-Yates shuffle."""
    source = rng or SECURE_RANDOM
    for i in range(len(items) - 1, 0, -1):
        j = source.randrange(0, i + 1)
        items[i], items[j] = items[j], items[i]


def shoe_fingerprint(cards: list[str]) -> str:
    """Short audit hash of shuffled shoe order (does not reveal future deals in play)."""
    digest = hashlib.sha256("|".join(cards).encode()).hexdigest()
    return digest[:16]
