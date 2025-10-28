# Deploy Probe Hotkey Camera Snap Issue

## Issue
When pressing the hotkey 'D' to deploy a probe, the camera snaps to a new location unexpectedly.

## Investigation Done
- Checked `DetailsPanel.js` line 63-66: Hotkey triggers deployFromHub button click
- Checked `DetailsPanel.js` line 528-545: Deploy button just sets deployMode and hides panel
- No camera centering code found in deploy flow
- Checked `selectHub()` - no camera code
- Checked `centerCameraOnProbe()` - only called when camera is locked to probe
- No `viewOffset` modifications found in deploy-related code

## Possible Causes
1. Browser scroll/focus behavior when panel closes?
2. Hidden camera code in another module?
3. Event side-effect from hide() or button click?
4. Mouse position calculation causing offset?
5. Zoom-related coordinate transformation?

## To Debug
1. Add console.log to track viewOffset before/after D key press
2. Check if mouse wheel events are firing
3. Monitor for unexpected focus/blur events
4. Test with different zoom levels
5. Check if it only happens at certain camera positions

## Workaround Options
- Add flag to prevent camera movement during deploy mode
- Store camera position before deploy and restore it
- Disable smooth camera transitions during deploy

## Status
Unable to reproduce in code review. Needs live testing to identify exact trigger.

Last updated: [Current session]
