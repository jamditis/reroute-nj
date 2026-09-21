#!/usr/bin/env python3
"""Regression checks for Portal cutover article discovery."""

import importlib.util
import pathlib
import unittest


ROOT = pathlib.Path(__file__).resolve().parent.parent
SPEC = importlib.util.spec_from_file_location(
    "scrape_coverage", ROOT / "tools" / "scrape-coverage.py"
)
SCRAPER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(SCRAPER)


class RelevanceTests(unittest.TestCase):
    def test_portal_bridge_story_is_relevant(self):
        self.assertTrue(SCRAPER.is_relevant_article(
            "NJ Transit riders face five weeks of changes for Portal Bridge work",
            "Temporary schedules begin October 11.",
        ))

    def test_portal_cutover_story_is_relevant(self):
        self.assertTrue(SCRAPER.is_relevant_article(
            "New schedules released",
            "NJ Transit announces the final Portal cutover.",
        ))

    def test_contextual_cutover_story_is_relevant(self):
        self.assertTrue(SCRAPER.is_relevant_article(
            "Five weeks of adjusted schedules",
            "Amtrak cutover work will reduce Northeast Corridor service.",
        ))

    def test_unrelated_nj_transit_story_is_rejected(self):
        self.assertFalse(SCRAPER.is_relevant_article(
            "Man pepper-sprayed woman on NJ Transit bus",
            "Police said the riders argued before the assault.",
        ))

    def test_unrelated_service_delay_is_rejected(self):
        self.assertFalse(SCRAPER.is_relevant_article(
            "NJ Transit riders face 60-minute delays",
            "An Amtrak signal issue stopped trains near New York.",
        ))


if __name__ == "__main__":
    unittest.main()
