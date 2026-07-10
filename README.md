# Escape Office Prototype

Static Escape Office prototype for the Azubi Escape Room concept from `Escape Office/Escape_Office_Seiten.docx`.

## What is implemented

- `index.html`: animated laptop/security unlock screen without next-page previews.
- `script.js`: team routing, team-specific final passwords, and dependency-free JavaScript QR generation.
- `styles.css`: CSS-only hacker/lockdown theme with Aareon branding, red alarm panels, subtle scanlines, QR reveal, and performance-focused desktop visuals.
- `pages/team.html`: single data-driven lockdown dashboard rendered from the `?team=` query parameter (QR + final password field).
- `pages/phone.html`: single data-driven mobile QR target rendered from the `?team=` query parameter (team task + code fragment).
- `pages/victory.html`: centered shared crisis-resolved screen without replay action.
- `tests/smoke_test.py`: dependency-free static validation.

## Current passwords

The prototype accepts these passwords:

| Password | Destination |
| --- | --- |
| `team1` | `pages/team.html?team=1` |
| `team2` | `pages/team.html?team=2` |
| `team3` | `pages/team.html?team=3` |

Spaces, underscores, and hyphens are ignored, so `team 1` and `team-1` also work.

To change the first-page passwords, edit `TEAM_CONFIG` / `PASSWORD_ROUTES` in `script.js`.

## Current final passwords

Each lockdown page and QR phone page accepts team-specific final passwords:

| Team | Primary final password | Also accepted |
| --- | --- | --- |
| Team 1 | `krise1` | `lockdown1`, `focus1` |
| Team 2 | `krise2` | `lockdown2`, `focus2` |
| Team 3 | `krise3` | `lockdown3`, `focus3` |

Correct final passwords redirect to `pages/victory.html`.

## Run locally

From the project root:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

The laptop and team dashboard screens are tuned for a fullscreen 1920×1200 browser window.

## Validate

Run the smoke test from the project root:

```bash
python3 tests/smoke_test.py
```

## Notes

- QR codes are generated in the browser on `<canvas>` from the current page URL, so they work when served from different hosts.
- Backgrounds are generated with CSS gradients/grids only; the JPEG files in `Escape Office/` are not used by the prototype UI.
- The QR overlay stays outside the QR modules to keep scanning reliable.
- Replace temporary passwords with final game answers before running the event.

