"""Lightweight anonymous tenant system — no auth, no database.

Each browser tab gets a UUID cookie (`vrl_tenant_id`). The middleware reads it
on every request, generates one if missing, and injects `request.state.tenant_id`
so all downstream code can scope data per tenant.

A deterministic human-friendly name is derived from the UUID for display.
"""
from __future__ import annotations

import hashlib
import uuid
from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

COOKIE_NAME = "vrl_tenant_id"
COOKIE_MAX_AGE = 60 * 60 * 24 * 30  # 30 days

# ── Human-friendly name generator ────────────────────────────────────────────
# Two word-lists produce ~2500 unique combinations (50 * 50).

_ADJECTIVES = [
    "amber", "bold", "calm", "coral", "crisp", "dusk", "fern", "frost",
    "gold", "haze", "iron", "jade", "keen", "lime", "mint", "navy",
    "opal", "pine", "plum", "quartz", "reed", "ruby", "sage", "silk",
    "teal", "vast", "warm", "wild", "zinc", "aqua", "blaze", "cedar",
    "dawn", "echo", "flint", "glow", "ivory", "lunar", "maple", "noble",
    "onyx", "pearl", "rapid", "swift", "terra", "ultra", "vivid", "wren",
    "zen", "bright",
]

_NOUNS = [
    "fox", "owl", "elk", "jay", "lynx", "ram", "bee", "cub", "eel",
    "fin", "gem", "hare", "ibis", "kite", "lark", "moth", "newt",
    "orca", "pike", "quail", "ray", "seal", "tern", "vole", "wasp",
    "yak", "wolf", "bear", "crow", "dove", "frog", "hawk", "isle",
    "koala", "lion", "mole", "puma", "robin", "swan", "tiger", "whale",
    "zebra", "crane", "delta", "ember", "flame", "grove", "haven",
    "inlet", "brook",
]


def tenant_display_name(tenant_id: str) -> str:
    """Derive a deterministic two-word name from a tenant UUID.

    Same UUID always produces the same name (e.g. 'coral-fox').
    """
    digest = hashlib.sha256(tenant_id.encode()).digest()
    adj_idx = digest[0] % len(_ADJECTIVES)
    noun_idx = digest[1] % len(_NOUNS)
    return f"{_ADJECTIVES[adj_idx]}-{_NOUNS[noun_idx]}"


def _extract_tenant_id(request: Request) -> str | None:
    """Read tenant ID from cookie."""
    return request.cookies.get(COOKIE_NAME)


class TenantMiddleware(BaseHTTPMiddleware):
    """Assigns an anonymous tenant ID to every request via cookie."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        tenant_id = _extract_tenant_id(request)
        is_new = tenant_id is None

        if is_new:
            tenant_id = uuid.uuid4().hex

        # Make tenant_id available to all route handlers
        request.state.tenant_id = tenant_id

        response: Response = await call_next(request)

        # Set or refresh cookie on every response
        if is_new:
            response.set_cookie(
                key=COOKIE_NAME,
                value=tenant_id,
                max_age=COOKIE_MAX_AGE,
                httponly=True,
                samesite="lax",
                path="/",
            )

        return response
