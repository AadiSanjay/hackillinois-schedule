# HackIllinois Ocean Schedule

An ocean-themed event schedule built for the HackIllinois 2027 Systems Coding Challenge.

The application uses the public HackIllinois event API to display hackathon events and adds tools for searching, filtering, planning, and saving a personal schedule.

## Live Demo

[Add deployed link here]

## Features

- Live event data from the HackIllinois API
- Dynamic Friday / Saturday / Sunday navigation
- Chronologically sorted events
- Search across event names, descriptions, sponsors, and locations
- Event-type filtering
- "Happening Now" and "Up Next" event highlighting
- Event detail modal
- Venue maps when provided by the HackIllinois API
- Personal "My Schedule" system
- Favorites persisted with `localStorage`
- Schedule conflict detection for overlapping saved events
- Event countdown/status information
- Add individual events to a calendar using `.ics` files
- Share event information using the Web Share API with clipboard fallback
- Loading, error, and empty states
- Responsive mobile layout
- Ocean-inspired visual design and animations
- Reduced-motion support for accessibility

## Tech Stack

- React
- TypeScript
- Vite
- CSS
- HackIllinois Adonix API
- Browser APIs including:
  - `localStorage`
  - Web Share API
  - Clipboard API
  - Blob / Object URLs for calendar exports

## How It Works

The application fetches HackIllinois events when the React application first loads.

The main data flow is:

```text
HackIllinois API
      ↓
events state
      ↓
chronological sorting
      ↓
selected day
      ↓
event-type filtering
      ↓
search filtering
      ↓
My Schedule filtering
      ↓
rendered event cards