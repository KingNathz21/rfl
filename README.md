# RouteFlow London

RouteFlow London is a TfL-powered London bus and public-transport information website.

## Current website capabilities

- Live TfL bus arrivals and route search, plus journey planning through TfL's public API.
- Live network status for buses, the Tube, London Overground and the Elizabeth line.
- Route and vehicle lookups, including live vehicle predictions where TfL provides them.
- Personal stop favourites and vehicle watchlists saved locally in the visitor's browser.
- Responsive desktop and mobile navigation.
- Accessibility preferences for text scaling, increased contrast and reduced motion.
- Keyboard skip link, visible focus indicators, labelled controls and screen-reader announcements.
- No fabricated arrival predictions, route status, sample vehicle records or pre-populated personal favourites.

## Run locally

Serve the repository root with any static web server. For example:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

The site uses the TfL Unified API directly from the browser. Live data therefore depends on TfL API availability, browser connectivity and TfL's public rate limits. If a feed is unavailable, the interface reports that rather than presenting a made-up good-service status.

## Personal data and privacy

Favourite stops, tracked vehicle IDs and accessibility preferences are stored in the current browser using local storage. They are not synced between devices and are not user accounts. Clearing browser site data will clear these preferences.

## Production deployment boundary

This repository is currently a static front end. It does **not** include a deployed application server, database, secure account authentication, password-reset service, file-upload service or privileged admin API. Those features must not be represented as live until a backend and its production secrets, database, access controls, monitoring and backups have been provisioned. Never put private TfL or authentication secrets in browser JavaScript.

For a multi-user production release, add a server-side API and database, implement server-managed sessions and role-based authorisation, validate and rate-limit all writes, and run automated accessibility, security and end-to-end tests before enabling account or admin features.
