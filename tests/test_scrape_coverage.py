#!/usr/bin/env python3
"""Failure-boundary tests for atomic coverage publication."""

import importlib.util
import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest import mock


SCRIPT_PATH = Path(__file__).parent.parent / "tools" / "scrape-coverage.py"
SPEC = importlib.util.spec_from_file_location("scrape_coverage", SCRIPT_PATH)
SCRAPER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(SCRAPER)


class PublicationTests(unittest.TestCase):
    def run_git(self, repository, *args, check=True):
        return subprocess.run(
            ["git", *args],
            cwd=repository,
            check=check,
            capture_output=True,
            text=True,
        )

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.data_dir = Path(self.temp_dir.name)
        self.coverage_file = self.data_dir / "coverage.json"
        self.registry_file = self.data_dir / "source-registry.json"
        self.old_coverage = {"version": "old-coverage"}
        self.old_registry = {"version": "old-registry"}
        self.new_coverage = {"version": "new-coverage"}
        self.new_registry = {"version": "new-registry"}
        self.coverage_file.write_text(json.dumps(self.old_coverage))
        self.registry_file.write_text(json.dumps(self.old_registry))
        self.coverage_file.chmod(0o664)
        self.registry_file.chmod(0o664)

        self.original_paths = (
            SCRAPER.DATA_DIR,
            SCRAPER.COVERAGE_FILE,
            SCRAPER.REGISTRY_FILE,
        )
        SCRAPER.DATA_DIR = self.data_dir
        SCRAPER.COVERAGE_FILE = self.coverage_file
        SCRAPER.REGISTRY_FILE = self.registry_file

    def tearDown(self):
        (
            SCRAPER.DATA_DIR,
            SCRAPER.COVERAGE_FILE,
            SCRAPER.REGISTRY_FILE,
        ) = self.original_paths
        self.temp_dir.cleanup()

    def assert_prior_files_preserved(self):
        self.assertEqual(self.old_coverage, json.loads(self.coverage_file.read_text()))
        self.assertEqual(self.old_registry, json.loads(self.registry_file.read_text()))
        self.assertEqual(0o664, self.coverage_file.stat().st_mode & 0o777)
        self.assertEqual(0o664, self.registry_file.stat().st_mode & 0o777)

    def test_validation_failure_does_not_change_live_files(self):
        with mock.patch.object(
            SCRAPER,
            "validate_staged_publication",
            side_effect=SCRAPER.PublicationError("invalid staged data"),
        ):
            with self.assertRaisesRegex(
                SCRAPER.PublicationError, "invalid staged data"
            ):
                SCRAPER.publish_data_files(self.new_coverage, self.new_registry)

        self.assert_prior_files_preserved()

    def test_second_staging_write_failure_does_not_change_live_files(self):
        original_write = SCRAPER.write_json
        write_count = 0

        def fail_second_write(path, data):
            nonlocal write_count
            write_count += 1
            if write_count == 2:
                raise OSError("simulated second-file write failure")
            original_write(path, data)

        with mock.patch.object(SCRAPER, "write_json", side_effect=fail_second_write):
            with self.assertRaisesRegex(OSError, "second-file write failure"):
                SCRAPER.publish_data_files(self.new_coverage, self.new_registry)

        self.assert_prior_files_preserved()

    def test_second_replacement_failure_restores_both_live_files(self):
        original_replace = SCRAPER.os.replace
        failed = False

        def fail_registry_replace(source, destination):
            nonlocal failed
            if Path(destination) == self.registry_file and not failed:
                failed = True
                raise OSError("simulated replacement failure")
            original_replace(source, destination)

        with mock.patch.object(SCRAPER, "validate_staged_publication"):
            with mock.patch.object(
                SCRAPER.os, "replace", side_effect=fail_registry_replace
            ):
                with self.assertRaisesRegex(
                    SCRAPER.PublicationError, "prior files restored"
                ):
                    SCRAPER.publish_data_files(self.new_coverage, self.new_registry)

        self.assert_prior_files_preserved()

    def test_git_failure_restores_both_live_files(self):
        with mock.patch.object(SCRAPER, "validate_staged_publication"):
            with mock.patch.object(SCRAPER, "git_commit_and_push", return_value=False):
                with self.assertRaisesRegex(
                    SCRAPER.PublicationError, "Git publication failed"
                ):
                    SCRAPER.publish_and_push(
                        self.new_coverage,
                        self.new_registry,
                        "test publication",
                    )

        self.assert_prior_files_preserved()

    def test_git_push_failure_withdraws_publication_commit(self):
        commands = []

        def fail_push(command, **kwargs):
            commands.append(command)
            if command[:3] == ["git", "rev-parse", "HEAD"]:
                return subprocess.CompletedProcess(command, 0, stdout="old-head\n")
            if command[:3] == ["git", "status", "--porcelain"]:
                return subprocess.CompletedProcess(command, 0, stdout="")
            if command[:3] == ["git", "fetch", "origin"]:
                return subprocess.CompletedProcess(command, 0, stdout="")
            if command[:3] == ["git", "rev-parse", "origin/main"]:
                return subprocess.CompletedProcess(command, 0, stdout="remote-head\n")
            if command[:3] == ["git", "rev-parse", "HEAD^"]:
                return subprocess.CompletedProcess(
                    command, 0, stdout="publication-parent\n"
                )
            if command[:3] == ["git", "rebase", "origin/main"]:
                return subprocess.CompletedProcess(command, 0, stdout="")
            if command[:3] == ["git", "push", "origin"]:
                raise subprocess.CalledProcessError(1, command, stderr="push rejected")
            if command[:3] == ["git", "merge-base", "--is-ancestor"]:
                return subprocess.CompletedProcess(command, 1, stdout="")
            if command[:3] == ["git", "rev-parse", "--git-path"]:
                path = self.data_dir / command[-1]
                return subprocess.CompletedProcess(command, 0, stdout=str(path) + "\n")
            return subprocess.CompletedProcess(command, 0, stdout="")

        with mock.patch.object(SCRAPER.subprocess, "run", side_effect=fail_push):
            with mock.patch.object(SCRAPER, "send_telegram"):
                with self.assertRaisesRegex(
                    SCRAPER.PublicationRollbackError,
                    "fetched remote data preserved",
                ):
                    SCRAPER.git_commit_and_push("test publication")

        self.assertIn(["git", "reset", "--mixed", "publication-parent"], commands)
        self.assertIn(
            [
                "git",
                "restore",
                "--source",
                "remote-head",
                "--worktree",
                "--",
                "data/coverage.json",
                "data/source-registry.json",
            ],
            commands,
        )

    def test_publication_commit_does_not_include_unrelated_staged_work(self):
        commands = []

        def successful_push(command, **kwargs):
            commands.append(command)
            if command[:3] == ["git", "rev-parse", "HEAD"]:
                return subprocess.CompletedProcess(command, 0, stdout="old-head\n")
            if command[:3] == ["git", "status", "--porcelain"]:
                return subprocess.CompletedProcess(
                    command, 0, stdout="M  unrelated-notes.txt\n"
                )
            if command[:3] == ["git", "rev-parse", "origin/main"]:
                return subprocess.CompletedProcess(command, 0, stdout="remote-head\n")
            return subprocess.CompletedProcess(command, 0, stdout="")

        with mock.patch.object(
            SCRAPER.subprocess, "run", side_effect=successful_push
        ):
            self.assertTrue(SCRAPER.git_commit_and_push("test publication"))

        self.assertIn(
            [
                "git",
                "commit",
                "-m",
                "test publication",
                "--",
                "data/coverage.json",
                "data/source-registry.json",
            ],
            commands,
        )
        self.assertIn(
            [
                "git", "stash", "push", "--quiet", "-m", "scraper-auto-stash",
                "--", "unrelated-notes.txt",
            ],
            commands,
        )

    def test_commit_setup_failure_restores_unrelated_index(self):
        work = self.data_dir / "index-work"
        work.mkdir()
        self.run_git(work, "init", "--initial-branch=main")
        self.run_git(work, "config", "user.name", "Scraper test")
        self.run_git(work, "config", "user.email", "scraper@example.com")
        (work / "data").mkdir()
        (work / "data" / "coverage.json").write_text('{"version":"old"}\n')
        (work / "data" / "source-registry.json").write_text('{"version":"old"}\n')
        (work / "staged.txt").write_text("old\n")
        self.run_git(work, "add", ".")
        self.run_git(work, "commit", "-m", "base")

        (work / "staged.txt").write_text("staged change\n")
        self.run_git(work, "add", "staged.txt")
        (work / "data" / "coverage.json").write_text('{"version":"new"}\n')
        hook = work / ".git" / "hooks" / "pre-commit"
        hook.write_text("#!/bin/sh\nexit 1\n")
        hook.chmod(0o755)

        original_project = SCRAPER.PROJECT_DIR
        SCRAPER.PROJECT_DIR = work
        try:
            with mock.patch.object(SCRAPER, "send_telegram"):
                self.assertFalse(SCRAPER.git_commit_and_push("scraper publication"))
        finally:
            SCRAPER.PROJECT_DIR = original_project

        status = self.run_git(work, "status", "--porcelain").stdout.splitlines()
        self.assertIn("M  staged.txt", status)

    def test_errored_push_keeps_publication_when_origin_has_commit(self):
        commands = []

        def accepted_push(command, **kwargs):
            commands.append(command)
            if command[:3] == ["git", "rev-parse", "HEAD"]:
                head_reads = sum(
                    1 for seen in commands if seen[:3] == ["git", "rev-parse", "HEAD"]
                )
                value = "old-head" if head_reads == 1 else "publication-head"
                return subprocess.CompletedProcess(command, 0, stdout=value + "\n")
            if command[:3] == ["git", "status", "--porcelain"]:
                return subprocess.CompletedProcess(command, 0, stdout="")
            if command[:3] == ["git", "rev-parse", "origin/main"]:
                return subprocess.CompletedProcess(command, 0, stdout="publication-head\n")
            if command[:3] == ["git", "diff", "--quiet"]:
                return subprocess.CompletedProcess(command, 0, stdout="")
            if command[:3] == ["git", "push", "origin"]:
                raise subprocess.TimeoutExpired(command, 60)
            if command[:3] == ["git", "merge-base", "--is-ancestor"]:
                return subprocess.CompletedProcess(command, 0, stdout="")
            return subprocess.CompletedProcess(command, 0, stdout="")

        with mock.patch.object(SCRAPER.subprocess, "run", side_effect=accepted_push):
            with mock.patch.object(SCRAPER, "send_telegram"):
                self.assertTrue(SCRAPER.git_commit_and_push("test publication"))

        self.assertNotIn(["git", "reset", "--mixed", "old-head"], commands)

    def test_errored_push_with_unknown_remote_keeps_local_publication(self):
        commands = []
        fetch_count = 0

        def unknown_push(command, **kwargs):
            nonlocal fetch_count
            commands.append(command)
            if command[:3] == ["git", "rev-parse", "HEAD"]:
                head_reads = sum(
                    1 for seen in commands if seen[:3] == ["git", "rev-parse", "HEAD"]
                )
                value = "old-head" if head_reads == 1 else "publication-head"
                return subprocess.CompletedProcess(command, 0, stdout=value + "\n")
            if command[:3] == ["git", "status", "--porcelain"]:
                return subprocess.CompletedProcess(command, 0, stdout="")
            if command[:3] == ["git", "fetch", "origin"]:
                fetch_count += 1
                if fetch_count > 1:
                    raise subprocess.TimeoutExpired(command, 60)
                return subprocess.CompletedProcess(command, 0, stdout="")
            if command[:3] == ["git", "rev-parse", "origin/main"]:
                return subprocess.CompletedProcess(command, 0, stdout="remote-head\n")
            if command[:3] == ["git", "diff", "--quiet"]:
                return subprocess.CompletedProcess(command, 0, stdout="")
            if command[:3] == ["git", "push", "origin"]:
                raise subprocess.TimeoutExpired(command, 60)
            return subprocess.CompletedProcess(command, 0, stdout="")

        with mock.patch.object(SCRAPER.subprocess, "run", side_effect=unknown_push):
            with mock.patch.object(SCRAPER, "send_telegram"):
                with self.assertRaisesRegex(SCRAPER.PostPushError, "remote state is unknown"):
                    SCRAPER.git_commit_and_push("test publication")

        self.assertFalse(any(command[:2] == ["git", "reset"] for command in commands))

    def test_registry_only_publication_does_not_rewrite_coverage(self):
        changed_coverage = {"version": "changed-during-discovery"}
        registry = {
            "entries": [
                {"id": "official-cutover-portal-page", "lastVerified": "old"},
                {"id": "official-alerts", "lastVerified": "old"},
                {"id": "secondary-news-coverage", "lastVerified": "old"},
            ]
        }
        self.coverage_file.write_text(json.dumps(changed_coverage))

        with mock.patch.object(SCRAPER, "load_coverage", return_value={"articles": []}):
            with mock.patch.object(SCRAPER, "poll_rss_feeds", return_value=[]):
                with mock.patch.object(SCRAPER, "discover_via_gdelt", return_value=[]):
                    with mock.patch.object(SCRAPER, "load_registry", return_value=registry):
                        with mock.patch.object(SCRAPER, "validate_staged_publication"):
                            with mock.patch.object(
                                SCRAPER,
                                "git_commit_and_push",
                                return_value=True,
                            ) as git_publish:
                                SCRAPER.run_discover({}, dry_run=False)

        self.assertEqual(
            changed_coverage,
            json.loads(self.coverage_file.read_text()),
        )
        published_registry = json.loads(self.registry_file.read_text())
        self.assertNotEqual(self.old_registry, published_registry)
        git_publish.assert_called_once_with("Refresh coverage source registry")

    def test_registry_only_git_failure_restores_prior_registry(self):
        with mock.patch.object(SCRAPER, "validate_staged_publication"):
            with mock.patch.object(
                SCRAPER,
                "git_commit_and_push",
                return_value=False,
            ):
                with self.assertRaisesRegex(
                    SCRAPER.PublicationError,
                    "prior registry restored",
                ):
                    SCRAPER.publish_registry_and_push(
                        self.new_registry,
                        "test registry publication",
                    )

        self.assertEqual(
            self.old_registry,
            json.loads(self.registry_file.read_text()),
        )

    def test_failed_push_preserves_remote_data_and_preexisting_local_work(self):
        remote = self.data_dir / "remote.git"
        seed = self.data_dir / "seed"
        work = self.data_dir / "work"
        remote.mkdir()
        self.run_git(remote, "init", "--bare", "--initial-branch=main")
        self.run_git(self.data_dir, "clone", str(remote), str(seed))
        self.run_git(seed, "config", "user.name", "Scraper test")
        self.run_git(seed, "config", "user.email", "scraper@example.com")
        (seed / "data").mkdir()
        base_data = {
            "remote": "base",
            "padding1": "same",
            "local": "base",
            "padding2": "same",
            "scraper": "base",
        }
        (seed / "data" / "coverage.json").write_text(
            json.dumps(base_data, indent=2) + "\n"
        )
        (seed / "data" / "source-registry.json").write_text(
            json.dumps(base_data, indent=2) + "\n"
        )
        (seed / "upstream.txt").write_text("base\n")
        (seed / "staged.txt").write_text("base\n")
        (seed / "notes.txt").write_text("base\n")
        self.run_git(seed, "add", ".")
        self.run_git(seed, "commit", "-m", "base")
        self.run_git(seed, "push", "origin", "main")

        self.run_git(self.data_dir, "clone", str(remote), str(work))
        self.run_git(work, "config", "user.name", "Scraper test")
        self.run_git(work, "config", "user.email", "scraper@example.com")
        (work / "local.txt").write_text("local commit\n")
        local_data = dict(base_data, local="local")
        (work / "data" / "coverage.json").write_text(
            json.dumps(local_data, indent=2) + "\n"
        )
        self.run_git(work, "add", "local.txt")
        self.run_git(work, "add", "data/coverage.json")
        self.run_git(work, "commit", "-m", "preexisting local commit")
        (work / "staged.txt").write_text("staged change\n")
        self.run_git(work, "add", "staged.txt")
        (work / "notes.txt").write_text("unstaged change\n")

        remote_data = dict(base_data, remote="remote")
        (seed / "data" / "coverage.json").write_text(
            json.dumps(remote_data, indent=2) + "\n"
        )
        (seed / "data" / "source-registry.json").write_text(
            json.dumps(remote_data, indent=2) + "\n"
        )
        (seed / "upstream.txt").write_text("remote change\n")
        self.run_git(seed, "add", ".")
        self.run_git(seed, "commit", "-m", "remote update")
        self.run_git(seed, "push", "origin", "main")

        hook = remote / "hooks" / "pre-receive"
        hook.write_text("#!/bin/sh\nexit 1\n")
        hook.chmod(0o755)
        scraper_data = dict(base_data, scraper="scraper")
        (work / "data" / "coverage.json").write_text(
            json.dumps(scraper_data, indent=2) + "\n"
        )
        (work / "data" / "source-registry.json").write_text(
            json.dumps(scraper_data, indent=2) + "\n"
        )

        original_project = SCRAPER.PROJECT_DIR
        SCRAPER.PROJECT_DIR = work
        try:
            with mock.patch.object(SCRAPER, "send_telegram"):
                with self.assertRaisesRegex(
                    SCRAPER.PublicationRollbackError,
                    "preexisting local data preserved",
                ):
                    SCRAPER.git_commit_and_push("scraper publication")
        finally:
            SCRAPER.PROJECT_DIR = original_project

        remote_head = self.run_git(work, "rev-parse", "origin/main").stdout.strip()
        local_head = self.run_git(work, "rev-parse", "HEAD").stdout.strip()
        self.run_git(work, "merge-base", "--is-ancestor", remote_head, local_head)
        self.assertEqual(
            "preexisting local commit",
            self.run_git(work, "log", "-1", "--format=%s").stdout.strip(),
        )
        self.assertNotIn(
            "scraper publication",
            self.run_git(work, "log", "--format=%s").stdout.splitlines(),
        )
        self.assertEqual(
            dict(remote_data, local="local"),
            json.loads((work / "data" / "coverage.json").read_text()),
        )
        self.assertEqual(
            remote_data,
            json.loads((work / "data" / "source-registry.json").read_text()),
        )
        status = self.run_git(work, "status", "--porcelain").stdout.splitlines()
        self.assertIn("M  staged.txt", status)
        self.assertIn(" M notes.txt", status)

    def test_rebase_conflict_replays_unrelated_commits_before_restoring_remote_data(self):
        remote = self.data_dir / "conflict-remote.git"
        seed = self.data_dir / "conflict-seed"
        work = self.data_dir / "conflict-work"
        remote.mkdir()
        self.run_git(remote, "init", "--bare", "--initial-branch=main")
        self.run_git(self.data_dir, "clone", str(remote), str(seed))
        self.run_git(seed, "config", "user.name", "Scraper test")
        self.run_git(seed, "config", "user.email", "scraper@example.com")
        (seed / "data").mkdir()
        (seed / "data" / "coverage.json").write_text('{"version":"base"}\n')
        (seed / "data" / "source-registry.json").write_text('{"version":"base"}\n')
        self.run_git(seed, "add", ".")
        self.run_git(seed, "commit", "-m", "base")
        self.run_git(seed, "push", "origin", "main")

        self.run_git(self.data_dir, "clone", str(remote), str(work))
        self.run_git(work, "config", "user.name", "Scraper test")
        self.run_git(work, "config", "user.email", "scraper@example.com")
        (work / "local.txt").write_text("retain me\n")
        self.run_git(work, "add", "local.txt")
        self.run_git(work, "commit", "-m", "preexisting local commit")

        (seed / "data" / "coverage.json").write_text('{"version":"remote"}\n')
        (seed / "data" / "source-registry.json").write_text('{"version":"remote"}\n')
        self.run_git(seed, "add", "data")
        self.run_git(seed, "commit", "-m", "remote data update")
        self.run_git(seed, "push", "origin", "main")

        hook = remote / "hooks" / "pre-receive"
        hook.write_text("#!/bin/sh\nexit 1\n")
        hook.chmod(0o755)
        (work / "data" / "coverage.json").write_text('{"version":"scraper"}\n')
        (work / "data" / "source-registry.json").write_text('{"version":"scraper"}\n')

        original_project = SCRAPER.PROJECT_DIR
        SCRAPER.PROJECT_DIR = work
        try:
            with mock.patch.object(SCRAPER, "send_telegram"):
                with self.assertRaisesRegex(
                    SCRAPER.PublicationRollbackError,
                    "fetched remote data preserved",
                ):
                    SCRAPER.git_commit_and_push("scraper publication")
        finally:
            SCRAPER.PROJECT_DIR = original_project

        remote_head = self.run_git(work, "rev-parse", "origin/main").stdout.strip()
        local_head = self.run_git(work, "rev-parse", "HEAD").stdout.strip()
        self.run_git(work, "merge-base", "--is-ancestor", remote_head, local_head)
        self.assertEqual(
            "preexisting local commit",
            self.run_git(work, "log", "-1", "--format=%s").stdout.strip(),
        )
        self.assertNotIn(
            "scraper publication",
            self.run_git(work, "log", "--format=%s").stdout.splitlines(),
        )
        self.assertEqual(
            {"version": "remote"},
            json.loads((work / "data" / "coverage.json").read_text()),
        )

    def test_remote_rollback_is_not_overwritten_by_prior_snapshot(self):
        remote_coverage = {"version": "remote-coverage"}
        remote_registry = {"version": "remote-registry"}

        def restore_remote_files(message):
            self.coverage_file.write_text(json.dumps(remote_coverage))
            self.registry_file.write_text(json.dumps(remote_registry))
            raise SCRAPER.PublicationRollbackError(
                "Git publication failed; fetched remote data preserved"
            )

        with mock.patch.object(SCRAPER, "validate_staged_publication"):
            with mock.patch.object(
                SCRAPER,
                "git_commit_and_push",
                side_effect=restore_remote_files,
            ):
                with self.assertRaisesRegex(
                    SCRAPER.PublicationRollbackError,
                    "fetched remote data preserved",
                ):
                    SCRAPER.publish_and_push(
                        self.new_coverage,
                        self.new_registry,
                        "test publication",
                    )

        self.assertEqual(remote_coverage, json.loads(self.coverage_file.read_text()))
        self.assertEqual(remote_registry, json.loads(self.registry_file.read_text()))

    def test_abort_active_rebase_resolves_relative_git_path_from_project(self):
        project_dir = self.data_dir / "repository"
        rebase_dir = project_dir / ".git" / "rebase-merge"
        rebase_dir.mkdir(parents=True)
        commands = []

        def git_path(command, **kwargs):
            commands.append(command)
            if command[:3] == ["git", "rev-parse", "--git-path"]:
                return subprocess.CompletedProcess(
                    command, 0, stdout=".git/rebase-merge\n"
                )
            return subprocess.CompletedProcess(command, 0, stdout="")

        with mock.patch.object(SCRAPER, "PROJECT_DIR", project_dir):
            with mock.patch.object(SCRAPER.subprocess, "run", side_effect=git_path):
                SCRAPER.abort_active_rebase()

        self.assertIn(["git", "rebase", "--abort"], commands)

    def test_post_push_cleanup_failure_keeps_published_files(self):
        with mock.patch.object(SCRAPER, "validate_staged_publication"):
            with mock.patch.object(
                SCRAPER,
                "git_commit_and_push",
                side_effect=SCRAPER.PostPushError("stash restore failed"),
            ):
                with self.assertRaisesRegex(
                    SCRAPER.PostPushError, "stash restore failed"
                ):
                    SCRAPER.publish_and_push(
                        self.new_coverage,
                        self.new_registry,
                        "test publication",
                    )

        self.assertEqual(self.new_coverage, json.loads(self.coverage_file.read_text()))
        self.assertEqual(self.new_registry, json.loads(self.registry_file.read_text()))
        self.assertEqual(0o664, self.coverage_file.stat().st_mode & 0o777)
        self.assertEqual(0o664, self.registry_file.stat().st_mode & 0o777)

    def test_success_publishes_matching_files_before_git(self):
        def verify_git_inputs(message):
            self.assertEqual(
                self.new_coverage, json.loads(self.coverage_file.read_text())
            )
            self.assertEqual(
                self.new_registry, json.loads(self.registry_file.read_text())
            )
            return True

        with mock.patch.object(SCRAPER, "validate_staged_publication") as validate:
            with mock.patch.object(
                SCRAPER,
                "git_commit_and_push",
                side_effect=verify_git_inputs,
            ):
                SCRAPER.publish_and_push(
                    self.new_coverage,
                    self.new_registry,
                    "test publication",
                )

        staged_coverage, staged_registry = validate.call_args.args
        self.assertEqual("coverage.json", staged_coverage.name)
        self.assertEqual("source-registry.json", staged_registry.name)
        self.assertEqual(self.new_coverage, json.loads(self.coverage_file.read_text()))
        self.assertEqual(self.new_registry, json.loads(self.registry_file.read_text()))


if __name__ == "__main__":
    unittest.main()
