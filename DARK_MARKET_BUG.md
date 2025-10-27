# Dark Market Purchase Bug

## Issue
Modal opens correctly and shows items, but clicking "Buy" buttons doesn't complete the purchase despite having sufficient Probethium.

## To Investigate Next Session
1. Check if button click event listeners are properly attached
   - Look at `populateDarkMarketUI()` where `.dark-market-buy-btn` listeners are added
   - Verify `data-item-id` attributes are being set correctly
2. Check browser console for JavaScript errors when clicking buy buttons
3. Verify `purchaseDarkMarketItem()` is being called
4. Check Probethium balance access - using `gameState.getProbethium().current`
5. Test if `darkMarketSystem.currentMarketInventory` is accessible
6. Verify cosmetic skin IDs match between inventory and purchase logic

## Debugging Steps
1. Add console.log at start of `purchaseDarkMarketItem()`
2. Log the itemId being passed
3. Log the currentProbethium value
4. Log the inventory object
5. Check if item is found in inventory
6. Trace through the if/else conditions

## Related Files
- `/app/probetheus/src/GameController.js` - Lines ~1050-1170 (purchase methods)
- `/app/probetheus/src/DarkMarketSystem.js` - Inventory generation

## Current Status
- ✅ Modal opens
- ✅ Inventory displays
- ✅ SVG previews render
- ✅ Probethium balance shows in top bar
- ❌ Purchase button click not working

Last tested: End of session [date]
