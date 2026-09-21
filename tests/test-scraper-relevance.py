#!/usr/bin/env python3
"""Regression checks for Portal cutover article discovery."""

import importlib.util
import pathlib
import unittest
from unittest import mock


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

    def test_rss_prefilter_keeps_contextual_cutover_story(self):
        feed = b"""<?xml version="1.0"?>
        <rss><channel><item>
          <title>Five weeks of adjusted schedules</title>
          <link>https://example.com/contextual-cutover</link>
          <description>Amtrak cutover work will reduce Northeast Corridor service.</description>
        </item></channel></rss>"""
        response = mock.Mock()
        response.read.return_value = feed
        config = {
            "rss_feeds": [{
                "id": "news",
                "url": "https://example.com/feed",
                "source_name": "Example News",
                "format": "rss",
                "filter_keywords": ["portal bridge", "portal north"],
            }]
        }

        with mock.patch.object(SCRAPER, "urlopen", return_value=response):
            candidates = SCRAPER.poll_rss_feeds(config, set())

        self.assertEqual(1, len(candidates))
        self.assertEqual(
            "https://example.com/contextual-cutover",
            candidates[0]["url"],
        )


if __name__ == "__main__":
    unittest.main()
