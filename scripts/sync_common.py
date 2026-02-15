#!/usr/bin/env python3
"""
sync_common.py - Shared utilities for OpenCode sync scripts (agents & skills).

Provides HTTP helpers, caching, frontmatter parsing, path validation,
and sync-detection logic used by both sync-agents.py and sync-skills.py.

Requires: Python 3.8+ (stdlib only, no pip dependencies)
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

DEFAULT_REPO = "davila7/claude-code-templates"
DEFAULT_BRANCH = "main"
GITHUB_API = "https://api.github.com"
RAW_BASE = "https://raw.githubusercontent.com"

SYNC_CACHE_FILENAME = ".sync-cache.json"

MAX_RATE_LIMIT_WAIT = 300  # 5 minutes — cap to prevent abusive Retry-After values
MAX_BACKOFF_WAIT = 60  # 1 minute — cap for exponential backoff

__all__ = [
    # Constants
    "DEFAULT_REPO",
    "DEFAULT_BRANCH",
    "GITHUB_API",
    "RAW_BASE",
    "SYNC_CACHE_FILENAME",
    "MAX_RATE_LIMIT_WAIT",
    "MAX_BACKOFF_WAIT",
    # Logger
    "logger",
    # Type alias
    "HttpResult",
    # Class
    "SafeRedirectHandler",
    # Functions
    "_get_headers",
    "_http_request",
    "_api_get",
    "_raw_get",
    "_cached_get",
    "check_rate_limit",
    "_load_sync_cache",
    "_save_sync_cache",
    "_remove_sync_cache",
    "parse_frontmatter",
    "validate_output_path",
    "is_synced_file",
    "clean_synced_files",
    "_parse_retry_after",
]

# ---------------------------------------------------------------------------
# Logger
# ---------------------------------------------------------------------------

logger = logging.getLogger("sync-common")

# ---------------------------------------------------------------------------
# Safe redirect handler — prevents leaking the auth token on cross-origin
# redirects (urllib follows redirects and keeps all headers by default).
# ---------------------------------------------------------------------------


class SafeRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Block cross-origin redirects to protect the auth token."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        from urllib.parse import urlparse

        orig = urlparse(req.full_url)
        dest = urlparse(newurl)
        if orig.hostname != dest.hostname or orig.port != dest.port:
            raise urllib.error.HTTPError(
                newurl,
                code,
                f"Cross-origin redirect blocked: "
                f"{orig.hostname}:{orig.port} -> {dest.hostname}:{dest.port}",
                headers,
                fp,
            )
        return super().redirect_request(req, fp, code, msg, headers, newurl)


_opener = urllib.request.build_opener(SafeRedirectHandler)


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------


def _get_headers() -> Dict[str, str]:
    """Build HTTP headers, including auth token if available."""
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "opencode-sync-agents/2.0",
    }
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"token {token}"
    return headers


# Type alias for the result of _http_request: (body_bytes, response_headers, status_code)
HttpResult = Tuple[bytes, Any, int]


def _parse_retry_after(value: str) -> int:
    """Parse ``Retry-After`` header value (delay-seconds **or** HTTP-date).

    Returns the number of seconds to wait (at least 1).
    Falls back to 60 seconds on any parsing error.
    """
    try:
        return max(int(value), 1)
    except ValueError:
        pass
    # Try HTTP-date format: "Fri, 13 Feb 2026 12:00:00 GMT"
    from email.utils import parsedate_to_datetime

    try:
        dt = parsedate_to_datetime(value)
        return max(int(dt.timestamp() - time.time()), 1)
    except Exception:
        return 60  # safe default


def _http_request(
    url: str,
    *,
    headers: Optional[Dict[str, str]] = None,
    max_retries: int = 3,
    backoff: float = 1.0,
    max_read_bytes: Optional[int] = None,
) -> Optional[HttpResult]:
    """Common HTTP GET helper with retries, exponential backoff, and rate-limit handling.

    Consolidates the retry / rate-limit / redirect logic previously
    duplicated across ``_api_get``, ``_raw_get``, and ``_cached_get``.

    Args:
        url: The URL to fetch.
        headers: HTTP headers to send.  Defaults to :func:`_get_headers`.
        max_retries: Maximum number of attempts (default 3).
        backoff: Base delay in seconds for exponential backoff.
        max_read_bytes: If set, cap the response body to this many bytes.

    Returns:
        ``(body_bytes, response_headers, status_code)`` on success
        (including 304 Not Modified, where *body_bytes* is ``b""``).
        ``None`` when the server returns 404.

    Raises:
        urllib.error.HTTPError: For non-retryable HTTP errors after all
            retries are exhausted.
        urllib.error.URLError: For non-retryable network errors after all
            retries are exhausted.
    """
    if headers is None:
        headers = _get_headers()

    for attempt in range(1, max_retries + 1):
        req = urllib.request.Request(url, headers=headers)
        try:
            with _opener.open(req, timeout=30) as resp:
                if max_read_bytes is not None:
                    body = resp.read(max_read_bytes)
                else:
                    body = resp.read()
                return (body, resp.headers, resp.status)
        except urllib.error.HTTPError as exc:
            # 304 Not Modified — used by _cached_get
            if exc.code == 304:
                return (b"", exc.headers, 304)

            # Rate limiting (403 / 429) with Retry-After or X-RateLimit-Reset
            if exc.code in (403, 429):
                retry_after = exc.headers.get("Retry-After")
                reset = exc.headers.get("X-RateLimit-Reset")
                remaining = exc.headers.get("X-RateLimit-Remaining", "?")
                if retry_after:
                    wait = min(_parse_retry_after(retry_after), MAX_RATE_LIMIT_WAIT)
                    logger.warning(
                        "  [rate-limit] Retry-After: %ds. Remaining: %s.",
                        wait,
                        remaining,
                    )
                    if attempt < max_retries:
                        time.sleep(wait)
                        continue
                    logger.error(
                        "  [rate-limit] Retry-After present — "
                        "all %d retries exhausted.",
                        max_retries,
                    )
                    raise
                if reset:
                    wait = min(
                        max(int(reset) - int(time.time()), 1),
                        MAX_RATE_LIMIT_WAIT,
                    )
                    logger.warning(
                        "  [rate-limit] Remaining: %s. Waiting %ds until reset...",
                        remaining,
                        wait,
                    )
                    if attempt < max_retries:
                        time.sleep(wait + 1)
                        continue
                    logger.error(
                        "  [rate-limit] X-RateLimit-Reset present — "
                        "all %d retries exhausted.",
                        max_retries,
                    )
                    raise

                # Fallback: 429/403 without Retry-After or X-RateLimit-Reset
                # (common with raw.githubusercontent.com which returns bare 429)
                if attempt < max_retries:
                    wait = min(backoff * (2 ** (attempt - 1)), MAX_BACKOFF_WAIT)
                    logger.warning(
                        "  [rate-limit] HTTP %d without Retry-After header "
                        "(attempt %d/%d). Backing off %.1fs...",
                        exc.code,
                        attempt,
                        max_retries,
                        wait,
                    )
                    time.sleep(wait)
                    continue
                logger.error(
                    "  [rate-limit] HTTP %d without Retry-After header — "
                    "all %d retries exhausted.",
                    exc.code,
                    max_retries,
                )
                raise

            # 404 — resource not found
            if exc.code == 404:
                return None

            # Retryable error — exponential backoff
            if attempt < max_retries:
                wait = min(backoff * (2 ** (attempt - 1)), MAX_BACKOFF_WAIT)
                logger.debug(
                    "  [retry] HTTP %d on attempt %d/%d, waiting %.1fs...",
                    exc.code,
                    attempt,
                    max_retries,
                    wait,
                )
                time.sleep(wait)
                continue
            raise

        except urllib.error.URLError as exc:
            if attempt < max_retries:
                wait = min(backoff * (2 ** (attempt - 1)), MAX_BACKOFF_WAIT)
                logger.debug(
                    "  [retry] Network error on attempt %d/%d: %s, waiting %.1fs...",
                    attempt,
                    max_retries,
                    exc.reason,
                    wait,
                )
                time.sleep(wait)
                continue
            raise

    return None


def _api_get(url: str, *, retries: int = 3, backoff: float = 2.0) -> Any:
    """GET a URL and return parsed JSON.

    Handles rate limiting and retries via :func:`_http_request`.
    """
    result = _http_request(
        url, headers=_get_headers(), max_retries=retries, backoff=backoff
    )
    if result is None:
        return None
    body, _headers, _status = result
    try:
        return json.loads(body.decode("utf-8"))
    except json.JSONDecodeError:
        logger.error("  [api] Invalid JSON response from %s", url)
        return None


def _raw_get(url: str, *, retries: int = 3, backoff: float = 1.0) -> Optional[str]:
    """GET raw text content from a URL.

    Uses :func:`_http_request` with exponential backoff, rate-limit handling,
    404 -> None, and a **1 MB download cap**.
    """
    headers = _get_headers()
    headers["Accept"] = "text/plain"
    result = _http_request(
        url,
        headers=headers,
        max_retries=retries,
        backoff=backoff,
        max_read_bytes=1_048_576,
    )
    if result is None:
        return None
    body, _headers, _status = result
    return body.decode("utf-8")


# ---------------------------------------------------------------------------
# Cached GET helper
# ---------------------------------------------------------------------------


def _cached_get(
    url: str,
    agent_name: str,
    cache: Dict[str, Any],
    *,
    retries: int = 3,
    backoff: float = 1.0,
) -> Optional[str]:
    """GET raw text content with conditional-request support.

    If the cache contains an ETag or Last-Modified for *agent_name*, the
    request is sent with ``If-None-Match`` / ``If-Modified-Since`` headers.

    * **304 Not Modified** → returns ``None`` (caller should skip).
    * **200 OK** → updates cache entry, returns content.
    * **404 / error** → same behaviour as :func:`_raw_get`.

    The cache entry is updated in-place so the caller can persist later.
    """
    headers = _get_headers()
    headers["Accept"] = "text/plain"

    entry = cache.get(agent_name)
    if entry and isinstance(entry, dict):
        if entry.get("etag"):
            headers["If-None-Match"] = entry["etag"]
        if entry.get("last_modified"):
            headers["If-Modified-Since"] = entry["last_modified"]

    result = _http_request(
        url,
        headers=headers,
        max_retries=retries,
        backoff=backoff,
        max_read_bytes=1_048_576,
    )

    if result is None:
        # 404 — not found
        return None

    body, resp_headers, status_code = result

    if status_code == 304:
        # Not modified — content unchanged
        return None

    content = body.decode("utf-8")

    # Update cache entry
    new_entry: Dict[str, str] = {}
    etag = resp_headers.get("ETag")
    if etag:
        new_entry["etag"] = etag
    last_mod = resp_headers.get("Last-Modified")
    if last_mod:
        new_entry["last_modified"] = last_mod
    new_entry["sha256"] = hashlib.sha256(content.encode("utf-8")).hexdigest()
    cache[agent_name] = new_entry
    return content


# ---------------------------------------------------------------------------
# Rate limit checker
# ---------------------------------------------------------------------------


def check_rate_limit() -> Tuple[int, int, int]:
    """Return (limit, remaining, reset_timestamp)."""
    data = _api_get(f"{GITHUB_API}/rate_limit")
    if data:
        core = data.get("resources", {}).get("core", {})
        return (
            core.get("limit", 0),
            core.get("remaining", 0),
            core.get("reset", 0),
        )
    return (0, 0, 0)


# ---------------------------------------------------------------------------
# Sync cache helpers
# ---------------------------------------------------------------------------


def _load_sync_cache(
    output_dir: Path, cache_filename: str = SYNC_CACHE_FILENAME
) -> Dict[str, Any]:
    """Load the sync cache from disk.

    Returns an empty dict if the cache file is missing or corrupt.
    """
    cache_path = output_dir / cache_filename
    if not cache_path.exists():
        return {}
    try:
        data = json.loads(cache_path.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            return {}
        return data
    except (json.JSONDecodeError, OSError, UnicodeDecodeError):
        logger.debug("Sync cache corrupt or unreadable, starting fresh")
        return {}


def _save_sync_cache(
    output_dir: Path, cache: Dict[str, Any], cache_filename: str = SYNC_CACHE_FILENAME
) -> None:
    """Persist the sync cache to disk."""
    cache_path = output_dir / cache_filename
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(
        json.dumps(cache, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def _remove_sync_cache(
    output_dir: Path,
    *,
    verbose: bool = False,
    cache_filename: str = SYNC_CACHE_FILENAME,
) -> bool:
    """Remove the sync cache file if it exists.  Returns True if removed."""
    cache_path = output_dir / cache_filename
    if cache_path.exists():
        cache_path.unlink()
        if verbose:
            logger.debug("  [removed] %s", cache_filename)
        return True
    return False


# ---------------------------------------------------------------------------
# Frontmatter parser
# ---------------------------------------------------------------------------


def parse_frontmatter(content: str) -> Tuple[Dict[str, str], str]:
    """
    Parse YAML-like frontmatter from markdown content.

    Returns (metadata_dict, body) where body is the markdown after the
    closing '---'. The parser handles the simple key-value YAML used
    in the source repo (no nested structures, just string values).
    """
    content = content.strip()
    if not content.startswith("---"):
        return {}, content

    # Find closing ---
    end_idx = content.find("\n---", 3)
    if end_idx == -1:
        return {}, content

    frontmatter_raw = content[3:end_idx].strip()
    body = content[end_idx + 4 :].strip()

    meta: Dict[str, str] = {}
    current_key: Optional[str] = None
    current_value_lines: List[str] = []

    for line in frontmatter_raw.split("\n"):
        # Check if this is a new key: value pair
        match = re.match(r"^(\w[\w-]*)\s*:\s*(.*)", line)
        if match:
            # Save previous key if any
            if current_key is not None:
                meta[current_key] = "\n".join(current_value_lines).strip()
            current_key = match.group(1)
            current_value_lines = [match.group(2)]
        else:
            # Continuation line
            if current_key is not None:
                current_value_lines.append(line)

    # Save last key
    if current_key is not None:
        meta[current_key] = "\n".join(current_value_lines).strip()

    # Clean up quoted values
    for key in meta:
        val = meta[key]
        if val.startswith('"') and val.endswith('"'):
            # Handle escaped sequences in the quoted string
            val = val[1:-1]
            val = val.replace('\\"', '"').replace("\\n", "\n")
            meta[key] = val

    return meta, body


# ---------------------------------------------------------------------------
# Path validation helper
# ---------------------------------------------------------------------------


def validate_output_path(file_path: Path, base_dir: Path) -> None:
    """Ensure resolved path stays within base_dir. Raises ValueError on traversal."""
    resolved_out = file_path.resolve()
    resolved_base = base_dir.resolve()
    if (
        not str(resolved_out).startswith(str(resolved_base) + "/")
        and resolved_out != resolved_base
    ):
        raise ValueError(
            f"[SECURITY] Path traversal detected: {file_path} resolves to "
            f"{resolved_out}, which is outside {resolved_base}"
        )


# ---------------------------------------------------------------------------
# Sync header detection
# ---------------------------------------------------------------------------

_SYNC_HEADER_PATTERN = re.compile(r"<!--\s*Synced from aitmpl\.com\b")


def is_synced_file(file_path: Path) -> bool:
    """Return True if the file was generated by a sync script.

    Detection based on the sync header comment near the top of the file.
    """
    try:
        with open(file_path, "r", encoding="utf-8") as fh:
            head = fh.read(1024)
        return bool(_SYNC_HEADER_PATTERN.search(head))
    except (OSError, UnicodeDecodeError):
        return False


# ---------------------------------------------------------------------------
# Clean synced files helper
# ---------------------------------------------------------------------------


def clean_synced_files(
    output_dir: Path,
    *,
    file_glob: str = "*.md",
    clean_manifest: bool = True,
    manifest_name: str = "manifest.json",
    dry_run: bool = False,
    verbose: bool = False,
) -> int:
    """Remove all previously synced files from output_dir.

    Non-synced files are preserved. Returns the number removed.
    """
    if not output_dir.exists():
        return 0

    removed = 0

    # Walk all matching files in output_dir and its subdirectories
    for matched_file in sorted(output_dir.rglob(file_glob)):
        if not matched_file.is_file():
            continue
        if not is_synced_file(matched_file):
            if verbose:
                logger.debug(
                    "  [keep] %s (not a synced file)",
                    matched_file.relative_to(output_dir),
                )
            continue

        if dry_run:
            logger.info(
                "  [dry-run] Would remove: %s",
                matched_file.relative_to(output_dir),
            )
        else:
            matched_file.unlink()
            if verbose:
                logger.debug("  [removed] %s", matched_file.relative_to(output_dir))
        removed += 1

    # Remove the manifest too
    if clean_manifest:
        manifest_path = output_dir / manifest_name
        if manifest_path.exists():
            if dry_run:
                logger.info("  [dry-run] Would remove: %s", manifest_name)
            else:
                manifest_path.unlink()
                if verbose:
                    logger.debug("  [removed] %s", manifest_name)

    # Clean up empty subdirectories
    if not dry_run:
        for subdir in sorted(output_dir.rglob("*"), reverse=True):
            if subdir.is_dir() and not any(subdir.iterdir()):
                try:
                    subdir.rmdir()
                except OSError:
                    pass  # TOCTOU race — directory may have been repopulated
                else:
                    if verbose:
                        logger.debug(
                            "  [removed] empty dir: %s/",
                            subdir.relative_to(output_dir),
                        )

    return removed
