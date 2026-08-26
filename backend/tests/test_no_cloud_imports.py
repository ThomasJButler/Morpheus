"""The inverse of isq-agent's Matrix-leakage guard.

That test keeps a persona out of a client deliverable; this one keeps cloud
and telemetry clients out of a local app. If a future change imports an API
SDK, adds one to requirements.txt, or hardcodes a non-loopback URL in app
code, this fails with the file and line, long before the egress tests have
to catch it at runtime.
"""

import re
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]

FORBIDDEN_PACKAGES = (
    "anthropic",
    "openai",
    "pinecone",
    "pinecone-client",
    "pinecone-text",
    "langchain",
    "langsmith",
    "posthog",
    "sentry-sdk",
    "sentry_sdk",
    "boto3",
    "cohere",
    "voyageai",
    "nltk",
    "wget",
)


def _first_module(line: str) -> str | None:
    match = re.match(r"\s*(?:import|from)\s+([A-Za-z0-9_.]+)", line)
    return match.group(1).split(".")[0] if match else None


def test_no_cloud_imports_in_app_code():
    offenders = []
    for path in sorted((BACKEND / "app").rglob("*.py")):
        for lineno, line in enumerate(path.read_text().splitlines(), start=1):
            module = _first_module(line)
            if module and module.replace("_", "-") in FORBIDDEN_PACKAGES:
                offenders.append(f"{path.relative_to(BACKEND)}:{lineno}: {line.strip()}")
    assert offenders == [], "cloud/telemetry imports found:\n" + "\n".join(offenders)


def test_no_cloud_packages_in_requirements():
    offenders = []
    for lineno, line in enumerate(
        (BACKEND / "requirements.txt").read_text().splitlines(), start=1
    ):
        stripped = line.strip().lower()
        if not stripped or stripped.startswith("#"):
            continue
        name = re.split(r"[=<>!\[\s]", stripped, maxsplit=1)[0]
        if name.replace("_", "-") in FORBIDDEN_PACKAGES:
            offenders.append(f"requirements.txt:{lineno}: {line.strip()}")
    assert offenders == [], "cloud/telemetry packages found:\n" + "\n".join(offenders)


def test_no_non_loopback_urls_in_app_code():
    offenders = []
    url = re.compile(r"https?://[^\s\"')]+")
    for path in sorted((BACKEND / "app").rglob("*.py")):
        for lineno, line in enumerate(path.read_text().splitlines(), start=1):
            for match in url.findall(line):
                if "127.0.0.1" not in match and "localhost" not in match:
                    offenders.append(f"{path.relative_to(BACKEND)}:{lineno}: {match}")
    assert offenders == [], "non-loopback URLs in app code:\n" + "\n".join(offenders)
