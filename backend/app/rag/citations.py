"""Streaming citation validation.

The model is asked to cite with [n]. This validator sits on the token
stream: a marker whose number maps to a retrieved chunk passes through and
is reported on first sight (so the caller can emit a citation event); a
marker with any other number is dropped before the client ever sees it. A
fabricated citation must not render, not even for one frame
(SECURITY_REVIEW F2). <think> blocks are dropped entirely, in case the
model's thinking mode leaks despite being turned off.

Everything else passes through untouched, including markdown links like
[text](url), because "[" followed by anything but digits-then-"]" is not a
marker.
"""

import re

_MARKER = re.compile(r"^\[(\d{1,3})\]")
_PARTIAL_MARKER = re.compile(r"^\[\d{0,3}$")
_THINK_OPEN = "<think>"
_THINK_CLOSE = "</think>"
_THINK_BLOCK = re.compile(r"<think>.*?</think>", re.DOTALL)


def strip_think(text: str) -> str:
    """For non-streaming responses (deep-mode sub-queries)."""
    return _THINK_BLOCK.sub("", text)


class CitationStreamValidator:
    def __init__(self, n_sources: int):
        self.n_sources = n_sources
        self.cited: list[int] = []  # order of first sight
        self._buf = ""
        self._thinking = False

    def feed(self, token: str) -> tuple[str, list[int]]:
        self._buf += token
        return self._drain(final=False)

    def finish(self) -> tuple[str, list[int]]:
        return self._drain(final=True)

    def _drain(self, *, final: bool) -> tuple[str, list[int]]:
        out: list[str] = []
        new: list[int] = []
        while True:
            if self._thinking:
                idx = self._buf.find(_THINK_CLOSE)
                if idx == -1:
                    # Keep a tail that might be a partial closer; drop the rest.
                    self._buf = "" if final else self._buf[-(len(_THINK_CLOSE) - 1) :]
                    break
                self._buf = self._buf[idx + len(_THINK_CLOSE) :]
                self._thinking = False
                continue

            positions = [p for p in (self._buf.find("["), self._buf.find("<")) if p != -1]
            if not positions:
                out.append(self._buf)
                self._buf = ""
                break
            cut = min(positions)
            out.append(self._buf[:cut])
            self._buf = self._buf[cut:]

            if self._buf.startswith("<"):
                if self._buf.startswith(_THINK_OPEN):
                    self._buf = self._buf[len(_THINK_OPEN) :]
                    self._thinking = True
                    continue
                if not final and len(self._buf) < len(_THINK_OPEN) and _THINK_OPEN.startswith(self._buf):
                    break  # possibly a partial <think>, wait for more
                out.append("<")
                self._buf = self._buf[1:]
                continue

            match = _MARKER.match(self._buf)
            if match:
                number = int(match.group(1))
                self._buf = self._buf[match.end() :]
                if 1 <= number <= self.n_sources:
                    out.append(f"[{number}]")
                    if number not in self.cited:
                        self.cited.append(number)
                        new.append(number)
                # An unknown number is dropped silently.
                continue
            if not final and _PARTIAL_MARKER.match(self._buf):
                break  # could still complete into [n], wait for more
            out.append("[")
            self._buf = self._buf[1:]
        return "".join(out), new
