## Purpose

Defines the scroll and navigation behavior a visitor experiences while moving from the homepage, into an arena's page, through slot selection, to the checkout action — independent of the booking/payment logic itself.

## ADDED Requirements

### Requirement: Checkout action stays reachable after slot selection
Once at least one slot is selected on the arena page, the primary checkout action (log in to continue, or proceed to checkout) SHALL remain reachable without the visitor needing to scroll back up past the slot grid, at any viewport width.

#### Scenario: Desktop visitor selects a slot far down the grid
- **WHEN** a visitor on a desktop-width viewport selects a time slot that is scrolled below the initial viewport
- **THEN** the checkout action is visible or reachable within the current viewport without scrolling back toward the top of the page

#### Scenario: Mobile visitor selects a slot
- **WHEN** a visitor on a mobile-width viewport selects a time slot
- **THEN** the checkout action is pinned to the viewport (already satisfied by the existing mobile sticky bar) and remains visible while slots remain selected

### Requirement: Arena page cues that booking controls are below the fold
The arena detail page SHALL visually indicate, within the initial hero viewport, that slot selection and booking controls exist further down the page.

#### Scenario: First-time visitor lands on an arena page
- **WHEN** a visitor opens an arena page and has not yet scrolled
- **THEN** a visible scroll-down cue is present in the hero section pointing toward the booking section below

### Requirement: Homepage arena-list navigation lands on a fully visible card
Activating the homepage's "Explore Arenas" action SHALL scroll such that the first arena card's name is fully visible within the viewport, not clipped by the sticky header or cut off at the bottom of the viewport.

#### Scenario: Mobile visitor taps "Explore Arenas"
- **WHEN** a visitor on a mobile-width viewport taps the "Explore Arenas" call-to-action on the homepage
- **THEN** the page scrolls to the arenas section such that the section heading is not hidden beneath the sticky header, and the first arena card's name is fully visible without requiring a further manual scroll

#### Scenario: Any visitor follows an anchor link with the sticky header present
- **WHEN** any in-page anchor scroll target lands beneath the sticky site header
- **THEN** the scrolled-to content is not obscured by the header's overlap region
