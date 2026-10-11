# Cutover-day review · October 11, 2026

## Scope and corrections

Reviewed the line guide, comparison model, shared date/status logic, information cards and downloads, map copy, structured data, source records, news list, and generated translations. This is a review of core cutover guidance, not a certification of every individual train departure or live operating condition.

- Temporary schedules begin Sunday, October 11. Weekday Midtown Direct diversions begin Monday, October 12; weekends retain Penn Station New York service with adjusted timetables.
- Hoboken monthly/weekly passes and FLEXPASS are honored to PSNY on cutover weekends. One-way/round-trip riders need PSNY tickets. PATH/ferry cross-honoring is route-specific; Newark–WTC PATH requires a separate $3.25 fare.
- PATH Hoboken–33rd peak service is every six minutes, not every three to five. Exact off-peak and enhanced ferry departures must be checked with the operator.
- Brielle replacement buses, October 11–25, are visible in the guide and exports. Accessible riders board at Point Pleasant Beach and connect to trains at Asbury Park. Comparison rankings for the affected stations are paused rather than inventing a bus-inclusive duration.
- Removed Hanover/Whippany from the comparison catalog, the unsupported generic Newark–Manhattan bus recommendation, and the unsupported Wall Street ferry-shuttle guarantee.
- Replaced the headline 50% figure with the directly verified single-track constraint. Some September reporting quotes a corridor-level 50% reduction, but the checked written primary sources do not establish that number; it must not be confused with total line train reductions.
- Eight verified curated additions plus the latest main-branch Gothamist article bring the list to 311. CBS uses its October 8 original publication date, not its October 9 update date. An Amtrak media contact is no longer presented as an author.
- A prominent rail-style notice replaces the tiny yellow strip. It opens expanded and can collapse to a visible headline, badge and official link. The active-phase numeral and rings pulse gently twice, then settle; reduced-motion and simplified view disable the animation. Native keyboard-accessible controls have translated labels and ARIA state, and printing restores all details. It distinguishes Sunday schedules, weekday diversions and weekend tickets, and links official guidance. Eastern date boundaries and daylight-saving calendar counts are tested. November 15 is an expected restoration date subject to testing, never automatic confirmation of completion.

## Primary evidence

- [NJT cutover overview and ticket rules](https://www.njtransit.com/portalcutover)
- [Current NJT schedule advisory](https://www.njtransit.com/service-advisory/2170966)
- [Brielle replacement buses and accessible connections](https://www.njtransit.com/service-advisory/2177824)
- [September 17 briefing](https://content.njtransit.com/sites/default/files/marketing/website/pdf/portal/Portal%20Cutover%20Briefing%20Document%20091726.pdf), pp. 14–15: five line totals and weekend changes
- [October 6 PATH reminder](https://www.panynj.gov/port-authority/en/press-room/press-release-archives/2026-press-releases/path-travel-advisory-reminder.html)
- [Current TAPP fare FAQ](https://www.tappandride.com/faq/loading-value-and-passes)
- [NY Waterway Hoboken Terminal–Midtown route](https://www.nywaterway.com/Hoboken-NJTT-MidtownRoute.aspx)
- [September 13 ferry shuttle map](https://www.nywaterway.com/UserFiles/Files/2026/BusRouteMaps/2026-09-13/NYWBus_Peak.pdf)

Specific claim status and access dates are recorded in `data/sources.json`. Historical claims retain their historical scope; durations are labeled as estimates. Generic rail-schedule/live-alert verification windows are not falsely refreshed after unavailable reads.

## Verification and limits

The repository Node suites, Python data validator, research registry validator and scraper tests cover the changes. New runtime regressions cover Eastern midnight/DST, conditional completion wording, expanded/collapsed notice states, print restoration and reduced-motion styling, comparison routing, current fares, and localized card/download notices. Export tests cover 264 locale/type/theme combinations and long-token canvas wrapping. Generated pages are rebuilt from the dictionaries and templates.

Source and code review found and corrected initial translation replacement collisions, outdated English card defaults, an accessible-routing omission in comparison results, and ticket advice persisting past the planned cutover end.

Browser visual QA is not yet verified: Chromium launch failed on socket permissions, an approved retry failed, and the available cloud browser could not reach the loopback preview. No deployment was made to obtain a preview. CSS/DOM/contrast checks do not substitute for viewing the final layouts. New notice colors exceed WCAG AA in calculated contrast tests.

Comparison durations remain rough planning estimates rather than schedule-derived itineraries. Six real stations lack supported comparison timings and are omitted from that tool, not from the line guide. Much pre-existing route-result prose remains English even on translated pages; the new essential notice, ticket distinctions, and bus advisory are localized in all eleven languages.

Final PR checks and automated review status must be inspected against the final head commit. A passing test run, an empty review list, or a draft PR is not connector-review approval. Merge and deployment remain the maintainer's decision.
