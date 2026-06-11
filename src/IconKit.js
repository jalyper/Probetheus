/* ============================================================================
   Probetheus — Iconography kit
   Thin-line constellation glyphs (1.25px stroke), gold or mist, 12–20px.
   Contract: docs/design/VISUAL_STYLE.md — geometric, no emoji, currentColor.
   Each entry is the inner SVG markup for a 0 0 24 24 viewBox.
   Ported from docs/design/handoff/icons.js.
   ============================================================================ */
(function () {
    const P = {
        /* --- Network / entities ------------------------------------------- */
        probe:
            '<path d="M12 3 L16.5 12 L12 21 L7.5 12 Z"/>' +
            '<circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/>',
        hub:
            '<path d="M12 2.8 L19 7.4 L19 16.6 L12 21.2 L5 16.6 L5 7.4 Z"/>' +
            '<circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
        shuttle:
            '<path d="M12 4 L17.5 19 L12 15.4 L6.5 19 Z"/>',
        mining:
            '<path d="M6 6.5 H18 L12 14 Z"/><path d="M12 14 V20"/>' +
            '<path d="M9 20 H15"/>',
        foundry:
            '<path d="M6.5 7 H17.5 L15.4 15 H8.6 Z"/>' +
            '<path d="M8.6 15 Q12 18.4 15.4 15"/><path d="M12 4 V7"/>',

        /* --- Deposits (one per material) ---------------------------------- */
        'deposit-mineral':
            '<path d="M12 3.5 L18.5 10 L12 20.5 L5.5 10 Z"/>' +
            '<path d="M5.5 10 H18.5"/><path d="M12 3.5 V20.5"/>',
        'deposit-data':
            '<path d="M8.5 6.5 Q13.5 12 8.5 17.5"/>' +
            '<path d="M12.5 6.5 Q17.5 12 12.5 17.5"/>',
        'deposit-artifact':
            '<path d="M12 3.5 L19.5 17.5 H4.5 Z"/>' +
            '<path d="M12 9 L15.6 16 H8.4 Z"/>',
        'deposit-exotic':
            '<path d="M12 3.8 V20.2"/><path d="M4.7 8 L19.3 16"/>' +
            '<path d="M19.3 8 L4.7 16"/>' +
            '<circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/>',

        /* --- Systems ------------------------------------------------------ */
        uplink:
            '<path d="M4.5 13.2 Q12 3.4 19.5 13.2"/>' +
            '<path d="M12 13.2 V20"/><path d="M8.8 20 H15.2"/>' +
            '<circle cx="12" cy="11.4" r="1.2" fill="currentColor" stroke="none"/>',
        slot:
            '<rect x="5" y="5" width="14" height="14" rx="2.5"/>' +
            '<circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
        lock:
            '<rect x="6.5" y="10.5" width="11" height="8" rx="1.5"/>' +
            '<path d="M8.8 10.5 V8.6 a3.2 3.2 0 0 1 6.4 0 V10.5"/>' +
            '<circle cx="12" cy="14.4" r="1.1" fill="currentColor" stroke="none"/>',
        settings:
            '<circle cx="12" cy="12" r="3.4"/>' +
            '<path d="M12 3.4 V6 M12 18 V20.6 M3.4 12 H6 M18 12 H20.6 ' +
            'M6.1 6.1 L7.9 7.9 M16.1 16.1 L17.9 17.9 M17.9 6.1 L16.1 7.9 M7.9 16.1 L6.1 17.9"/>',

        /* --- Controls ----------------------------------------------------- */
        pause: '<path d="M9.5 6 V18 M14.5 6 V18"/>',
        play: '<path d="M9 5.5 L18 12 L9 18.5 Z"/>',
        speed: '<path d="M6 7 L11 12 L6 17 M13 7 L18 12 L13 17"/>',
        close: '<path d="M7 7 L17 17 M17 7 L7 17"/>',
        chevron: '<path d="M9.5 5.5 L15.5 12 L9.5 18.5"/>',
        plus: '<path d="M12 6 V18 M6 12 H18"/>',
        check: '<path d="M5 12.6 L10 17.5 L19 6.5"/>',
        upgrade: '<path d="M12 19 V6 M6.5 11.5 L12 6 L17.5 11.5"/>',

        /* --- Probe ops ---------------------------------------------------- */
        patrol:
            '<path d="M6 12 a6 6 0 1 1 1.8 4.3"/>' +
            '<path d="M6 16.6 L5.6 12.4 M6 16.6 L9.9 16"/>',
        camera:
            '<path d="M5 8.5 V5.5 H8.5 M15.5 5.5 H19 V9 M19 15.5 V19 H15.5 M8.5 19 H5 V15.5"/>' +
            '<circle cx="12" cy="12" r="2.2"/>',
        power:
            '<path d="M12 4 V11.5"/>' +
            '<path d="M8.2 6.8 a5.6 5.6 0 1 0 7.6 0"/>',
        flow:
            '<path d="M4 12 H20"/>' +
            '<circle cx="7.5" cy="12" r="1.4" fill="currentColor" stroke="none"/>' +
            '<circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>' +
            '<circle cx="16.5" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
        spark:
            '<path d="M12 3.6 L13.3 10.7 L20.4 12 L13.3 13.3 L12 20.4 L10.7 13.3 L3.6 12 L10.7 10.7 Z"/>',
        sector:
            '<rect x="4.5" y="4.5" width="15" height="15" rx="1.5"/>' +
            '<path d="M4.5 12 H19.5 M12 4.5 V19.5" stroke-dasharray="2 2.4"/>',
    };

    function icon(name, opts) {
        opts = opts || {};
        const size = opts.size || 16;
        const stroke = opts.stroke != null ? opts.stroke : 1.25;
        const color = opts.color || 'currentColor';
        const cls = opts.cls ? ' ' + opts.cls : '';
        const body = P[name] || '';
        return (
            '<svg class="ic ic-' + name + cls + '" viewBox="0 0 24 24" width="' + size +
            '" height="' + size + '" fill="none" stroke="' + color +
            '" stroke-width="' + stroke +
            '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            body + '</svg>'
        );
    }

    /* Inject icons into any element carrying data-icon (optionally data-sz). */
    function injectIcons(root) {
        (root || document).querySelectorAll('[data-icon]').forEach(el => {
            const name = el.getAttribute('data-icon');
            const sz = parseFloat(el.getAttribute('data-sz')) || 16;
            el.innerHTML = icon(name, { size: sz });
        });
    }

    window.ICONS = P;
    window.icon = icon;
    window.injectIcons = injectIcons;
})();
