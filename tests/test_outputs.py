from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path


ISSUE_DIR = Path(__file__).resolve().parents[1]
INIT_DIR = ISSUE_DIR / "init"
FINAL_DIR = ISSUE_DIR / "final"
WORKSPACE = ISSUE_DIR / "workspace"
CHANGES_DIFF = ISSUE_DIR / "changes.diff"
CHANGED_PATHS = (
    Path("src/cartesian/WaterfallBar.tsx"),
    Path("src/chart/WaterfallChart.tsx"),
    Path("src/index.ts"),
    Path("src/state/graphicalItemsSlice.ts"),
    Path("src/state/selectors/axisSelectors.ts"),
    Path("src/state/selectors/combiners/combineTooltipPayload.ts"),
    Path("src/state/selectors/waterfallSelectors.ts"),
    Path("src/state/types/WaterfallSettings.ts"),
    Path("src/zIndex/DefaultZIndexes.tsx"),
    Path("storybook/stories/Examples/WaterfallChart/WaterfallChart.stories.tsx"),
    Path("test/cartesian/WaterfallBar.spec.tsx"),
    Path("test/chart/WaterfallChart.spec.tsx"),
)


def find_command(name: str) -> str:
    candidates = [name]
    if os.name == "nt":
        candidates = [f"{name}.cmd", f"{name}.exe", name]

    for candidate in candidates:
        resolved = shutil.which(candidate)
        if resolved:
            return resolved

    raise FileNotFoundError(f"Unable to find executable for {name!r}")


def run(command: list[str], cwd: Path, timeout: int = 600) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        cwd=str(cwd),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
    )


def remove_path(path: Path) -> None:
    if path.is_dir():
        shutil.rmtree(path)
    elif path.exists():
        path.unlink()


def copy_tree(source: Path, destination: Path) -> None:
    if os.name == "nt":
        destination.mkdir(parents=True, exist_ok=True)
        result = subprocess.run(
            [
                "robocopy",
                str(source),
                str(destination),
                "/E",
                "/NFL",
                "/NDL",
                "/NJH",
                "/NJS",
                "/NP",
            ],
            capture_output=True,
            text=True,
        )
        if result.returncode >= 8:
            raise AssertionError(
                "robocopy failed while copying a snapshot.\n"
                f"stdout:\n{result.stdout}\n\nstderr:\n{result.stderr}"
            )
        return

    shutil.copytree(source, destination)


def sync_snapshot(snapshot_dir: Path) -> None:
    WORKSPACE.mkdir(parents=True, exist_ok=True)

    for child in WORKSPACE.iterdir():
        if child.name == "node_modules":
            continue
        remove_path(child)

    for child in snapshot_dir.iterdir():
        if child.name == "node_modules":
            continue
        destination = WORKSPACE / child.name
        if child.is_dir():
            shutil.copytree(child, destination)
        else:
            shutil.copy2(child, destination)


def ensure_workspace_ready() -> None:
    if not WORKSPACE.exists():
        copy_tree(INIT_DIR, WORKSPACE)

    if not (WORKSPACE / "node_modules").exists():
        npm = find_command("npm")
        result = run([npm, "ci", "--ignore-scripts"], WORKSPACE, timeout=1800)
        if result.returncode != 0:
            raise AssertionError(
                "npm ci --ignore-scripts failed while preparing the verifier workspace.\n"
                f"stdout:\n{result.stdout}\n\nstderr:\n{result.stderr}"
            )


def workspace_bin(name: str) -> str:
    suffix = ".cmd" if os.name == "nt" else ""
    candidate = WORKSPACE / "node_modules" / ".bin" / f"{name}{suffix}"
    if not candidate.exists():
        raise FileNotFoundError(f"Expected workspace binary {candidate} to exist")
    return str(candidate)


def assert_changes_diff_round_trips() -> None:
    git = find_command("git")
    tmp_root = Path(tempfile.mkdtemp(prefix="waterfall-verify-"))
    try:
        apply_root = tmp_root / "apply-check"
        copy_tree(INIT_DIR, apply_root)

        for command in (
            [git, "init"],
            [git, "config", "core.longpaths", "true"],
            [git, "config", "user.name", "codex"],
            [git, "config", "user.email", "codex@example.com"],
            [git, "add", "."],
            [git, "commit", "-m", "base"],
        ):
            result = run(command, apply_root)
            if result.returncode != 0:
                raise AssertionError(
                    "Failed to prepare a temporary git repo for diff verification.\n"
                    f"command: {' '.join(command)}\n"
                    f"stdout:\n{result.stdout}\n\nstderr:\n{result.stderr}"
                )

        check_result = run([git, "apply", "--check", str(CHANGES_DIFF)], apply_root)
        if check_result.returncode != 0:
            raise AssertionError(
                "changes.diff does not apply cleanly to init/.\n"
                f"stdout:\n{check_result.stdout}\n\nstderr:\n{check_result.stderr}"
            )

        apply_result = run([git, "apply", str(CHANGES_DIFF)], apply_root)
        if apply_result.returncode != 0:
            raise AssertionError(
                "changes.diff failed to apply to init/.\n"
                f"stdout:\n{apply_result.stdout}\n\nstderr:\n{apply_result.stderr}"
            )

        for relative_path in CHANGED_PATHS:
            compare_result = run(
                [
                    git,
                    "diff",
                    "--no-index",
                    "--ignore-cr-at-eol",
                    "--quiet",
                    str(apply_root / relative_path),
                    str(FINAL_DIR / relative_path),
                ],
                ISSUE_DIR,
            )
            if compare_result.returncode != 0:
                raise AssertionError(
                    f"Applying changes.diff to init/ does not recreate final/ exactly for {relative_path}."
                )
    finally:
        if os.name == "nt":
            subprocess.run(["cmd", "/c", "rmdir", "/s", "/q", str(tmp_root)], capture_output=True, text=True)
        else:
            shutil.rmtree(tmp_root, ignore_errors=True)


class WaterfallIssueVerifier(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        ensure_workspace_ready()
        assert_changes_diff_round_trips()

    def test_P1_init_snapshot_does_not_expose_waterfall_api(self) -> None:
        index_content = (INIT_DIR / "src" / "index.ts").read_text(encoding="utf-8")

        self.assertNotIn("WaterfallBar", index_content)
        self.assertNotIn("WaterfallChart", index_content)
        self.assertFalse((INIT_DIR / "src" / "cartesian" / "WaterfallBar.tsx").exists())
        self.assertFalse((INIT_DIR / "src" / "chart" / "WaterfallChart.tsx").exists())
        self.assertFalse((INIT_DIR / "src" / "state" / "selectors" / "waterfallSelectors.ts").exists())
        self.assertFalse((INIT_DIR / "src" / "state" / "types" / "WaterfallSettings.ts").exists())

    def test_F1_final_snapshot_exports_public_waterfall_api(self) -> None:
        index_content = (FINAL_DIR / "src" / "index.ts").read_text(encoding="utf-8")

        self.assertIn("export { WaterfallBar }", index_content)
        self.assertIn("export { WaterfallChart }", index_content)
        self.assertTrue((FINAL_DIR / "src" / "cartesian" / "WaterfallBar.tsx").exists())
        self.assertTrue((FINAL_DIR / "src" / "chart" / "WaterfallChart.tsx").exists())

    def test_F2_final_targeted_waterfall_tests_pass(self) -> None:
        sync_snapshot(FINAL_DIR)

        vitest = workspace_bin("vitest")
        result = run(
            [
                vitest,
                "run",
                "test/cartesian/WaterfallBar.spec.tsx",
                "test/chart/WaterfallChart.spec.tsx",
                "--project",
                "unit:lib",
            ],
            WORKSPACE,
            timeout=1800,
        )

        self.assertEqual(
            result.returncode,
            0,
            msg=(
                "Targeted WaterfallChart tests failed.\n"
                f"stdout:\n{result.stdout}\n\nstderr:\n{result.stderr}"
            ),
        )

    def test_G1_final_typescript_check_passes(self) -> None:
        sync_snapshot(FINAL_DIR)

        tsc = workspace_bin("tsc")
        result = run([tsc, "--noEmit"], WORKSPACE, timeout=1800)

        self.assertEqual(
            result.returncode,
            0,
            msg=(
                "TypeScript compilation failed in the final snapshot.\n"
                f"stdout:\n{result.stdout}\n\nstderr:\n{result.stderr}"
            ),
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
