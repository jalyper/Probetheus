# Phase 4: Bonus UI & Integration - Context

**Gathered:** 2026-01-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Players can see what bonuses a shell provides before and after equipping via hover tooltips. Tooltips appear in the shell selection modal and all entity detail panels (probe, hub, mining station). The full bonus system survives save/load cycles. Integration tests verify equip/swap and persistence flows.

</domain>

<decisions>
## Implementation Decisions

### Tooltip design
- Dark floating panel with light text (game inventory tooltip style)
- Positioned above the hovered shell icon
- Compact size — just enough for bonus line(s)
- Small arrow pointer triangle pointing down toward the shell icon
- Subtle border around the panel

### Bonus display content
- Friendly readable labels (e.g., "Signal Range" not "signalRange", "Mining Output" not "miningEfficiency")
- Percentage value shown in green text: "+10%"
- Bonus only in tooltip — no shell name or rarity (those are visible elsewhere)
- Shells with multiple bonuses show all of them, each on its own line
- All shells in the selection modal show bonus tooltips on hover, including unowned shells

### Hover behavior
- ~300ms delay before tooltip appears (avoid flicker on mouse pass-through)
- No animation — instant show/hide after delay
- Default shell (no bonus) shows no tooltip at all

### Integration behavior
- Tooltip dismisses when shell is swapped — user re-hovers to see new info
- Save/load must preserve equipped shells and their bonuses remain functional after load

### Claude's Discretion
- Whether to use emoji icons before bonus labels (e.g., satellite emoji for Signal Range)
- Exact tooltip padding, font size, arrow size
- Tooltip z-index and overflow handling in modal vs detail panels

</decisions>

<specifics>
## Specific Ideas

- Tooltip should feel like a standard game inventory tooltip — dark bg, compact, informative
- Green percentage text matches the existing green bonus text used in the research cost reduction display (Phase 3 strikethrough cost)
- Keep it minimal — the shell grid already shows shell name and rarity color, tooltip just adds the bonus info

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-bonus-ui-integration*
*Context gathered: 2026-01-29*
