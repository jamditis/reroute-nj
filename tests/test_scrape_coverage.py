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
            if command[:3] == ["git", "rebase", "origin/main"]:
                return subprocess.CompletedProcess(command, 0, stdout="")
            if command[:3] == ["git", "push", "origin"]:
                raise subprocess.CalledProcessError(1, command, stderr="push rejected")
            if command[:3] == ["git", "rev-parse", "--git-path"]:
                path = self.data_dir / command[-1]
                return subprocess.CompletedProcess(command, 0, stdout=str(path) + "\n")
            return subprocess.CompletedProcess(command, 0, stdout="")

        with mock.patch.object(SCRAPER.subprocess, "run", side_effect=fail_push):
            with mock.patch.object(SCRAPER, "send_telegram"):
                self.assertFalse(SCRAPER.git_commit_and_push("test publication"))

        self.assertIn(["git", "reset", "--mixed", "remote-head"], commands)

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
