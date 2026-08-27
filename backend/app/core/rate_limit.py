"""Shared per-IP rate limiter (slowapi).

Ported from isq-agent (rag-service/app/core/rate_limit.py, MIT, same author).
On a loopback-only app this is belt and braces: it stops a runaway local
script hammering the expensive endpoints, nothing more. Lives here rather
than in main.py so route modules can attach limits without a circular import.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
