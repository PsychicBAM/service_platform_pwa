"""Smoke tests for scripts/backup_postgres.sh and scripts/restore_postgres.sh.

Does not run real pg_dump, restore, or create backup files in the repo.
"""

from __future__ import annotations

import gzip
import shutil
import subprocess
from pathlib import Path

import pytest

FORBIDDEN_OUTPUT_MARKERS = (
    "CHANGE_ME_SECRET",
    "postgres-password-redacted",
    "sk_test_REDACTED",
    "whsec_REDACTED",
)

PROJECT_ROOT = Path(__file__).resolve().parents[2]


def _script_candidates(name: str) -> list[Path]:
    return [
        PROJECT_ROOT / "scripts" / name,
        Path("/scripts") / name,
    ]


def _resolve_script(name: str) -> Path:
    path = next((candidate for candidate in _script_candidates(name) if candidate.is_file()), None)
    if path is None:
        pytest.skip(f"{name} not found")
    return path


def _bash() -> str:
    bash = shutil.which("bash")
    if not bash:
        pytest.skip("bash not available")
    return bash


def _run_script(
    script: Path,
    *args: str,
    cwd: Path | None = None,
) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [_bash(), str(script), *args],
        cwd=cwd or PROJECT_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )


def _combined_output(result: subprocess.CompletedProcess[str]) -> str:
    return result.stdout + result.stderr


def _assert_no_forbidden_markers(output: str) -> None:
    for marker in FORBIDDEN_OUTPUT_MARKERS:
        assert marker not in output, f"Unexpected marker in script output: {marker}"


def test_backup_script_help_exits_zero_and_shows_usage() -> None:
    script = _resolve_script("backup_postgres.sh")
    result = _run_script(script, "--help")
    output = _combined_output(result)

    assert result.returncode == 0, output
    assert "Usage: backup_postgres.sh" in output
    assert "--backup-dir" in output
    _assert_no_forbidden_markers(output)


def test_restore_script_help_exits_zero_and_shows_usage() -> None:
    script = _resolve_script("restore_postgres.sh")
    result = _run_script(script, "--help")
    output = _combined_output(result)

    assert result.returncode == 0, output
    assert "Usage: restore_postgres.sh" in output
    assert "--backup-file" in output
    assert "--confirm-destructive" in output
    _assert_no_forbidden_markers(output)


def test_backup_script_unknown_argument_exits_nonzero() -> None:
    script = _resolve_script("backup_postgres.sh")
    result = _run_script(script, "--not-a-real-flag")
    output = _combined_output(result)

    assert result.returncode != 0
    assert "FAIL: unknown_argument" in output
    _assert_no_forbidden_markers(output)


def test_backup_script_invalid_compose_exits_nonzero_safely(tmp_path: Path) -> None:
    script = _resolve_script("backup_postgres.sh")
    backup_dir = tmp_path / "outside_repo_backups"
    missing_compose = tmp_path / "missing-compose.yml"

    result = _run_script(
        script,
        "--backup-dir",
        str(backup_dir),
        "--compose-file",
        str(missing_compose),
    )
    output = _combined_output(result)

    assert result.returncode != 0
    assert "FAIL: pg_dump_failed" in output
    assert not list(backup_dir.glob("*.sql.gz"))
    _assert_no_forbidden_markers(output)


def test_restore_script_missing_backup_file_argument_exits_nonzero() -> None:
    script = _resolve_script("restore_postgres.sh")
    result = _run_script(script)
    output = _combined_output(result)

    assert result.returncode != 0
    assert "FAIL: backup_file_required" in output
    _assert_no_forbidden_markers(output)


def test_restore_script_missing_backup_file_path_exits_nonzero() -> None:
    script = _resolve_script("restore_postgres.sh")
    result = _run_script(
        script,
        "--backup-file",
        "/nonexistent/path/backup.sql.gz",
        "--confirm-destructive",
    )
    output = _combined_output(result)

    assert result.returncode != 0
    assert "FAIL: backup_file_not_found" in output
    _assert_no_forbidden_markers(output)


def test_restore_script_without_confirm_destructive_exits_nonzero(tmp_path: Path) -> None:
    script = _resolve_script("restore_postgres.sh")
    backup_file = tmp_path / "sample.sql.gz"
    with gzip.open(backup_file, "wb") as handle:
        handle.write(b"-- smoke test placeholder\n")

    result = _run_script(script, "--backup-file", str(backup_file))
    output = _combined_output(result)

    assert result.returncode != 0
    assert "FAIL: confirm_destructive_required" in output
    assert "WARN: restore_is_destructive" in output
    _assert_no_forbidden_markers(output)


def test_restore_script_env_file_does_not_leak_secrets_in_output(tmp_path: Path) -> None:
    script = _resolve_script("restore_postgres.sh")
    env_file = tmp_path / ".env.test"
    env_file.write_text(
        "\n".join(
            [
                "POSTGRES_USER=service_platform",
                "POSTGRES_DB=service_platform",
                "POSTGRES_PASSWORD=postgres-password-redacted",
                "JWT_SECRET_KEY=CHANGE_ME_SECRET",
                "STRIPE_SECRET_KEY=sk_test_REDACTED",
            ]
        ),
        encoding="utf-8",
    )

    result = _run_script(script, "--env-file", str(env_file))
    output = _combined_output(result)

    assert result.returncode != 0
    assert "FAIL: backup_file_required" in output
    _assert_no_forbidden_markers(output)


def test_backup_script_default_backup_dir_is_outside_repo() -> None:
    script = _resolve_script("backup_postgres.sh")
    content = script.read_text(encoding="utf-8")

    assert 'BACKUP_DIR="/opt/service-platform/backups/postgres"' in content
    assert "./backups" not in content.split("BACKUP_DIR=")[1].split("\n")[0]
    assert "repo/" not in content.split("BACKUP_DIR=")[1].split("\n")[0]


def test_backup_script_help_mentions_passwords_not_printed() -> None:
    script = _resolve_script("backup_postgres.sh")
    result = _run_script(script, "-h")
    output = _combined_output(result)

    assert result.returncode == 0
    assert "never printed" in output.lower()
    _assert_no_forbidden_markers(output)


def test_scripts_use_strict_shell_mode() -> None:
    for name in ("backup_postgres.sh", "restore_postgres.sh"):
        script = _resolve_script(name)
        content = script.read_text(encoding="utf-8")
        assert "set -euo pipefail" in content
