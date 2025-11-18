// Simple PGN loader + renderer using chess.js
// Only engine/clock tags [%...] are removed; all other comments preserved

async function loadPGN() {
    const link = document.querySelector('link[rel="pgn"]');
    if (!link?.href) return null;

    try {
        const response = await fetch(link.href);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.text();
    } catch (err) {
        console.error('Failed to load PGN:', err);
        return null;
    }
}

function cleanPGN(pgnText) {
    // Remove only [%...] tags, keep everything else intact
    return pgnText.replace(/\[%.*?\]/g, '');
}

async function renderPGN() {
    let pgnText = await loadPGN();
    if (!pgnText) return;

    pgnText = cleanPGN(pgnText);

    const chess = new Chess();
    if (!chess.load_pgn(pgnText, { sloppy: true })) {
        console.error('Invalid PGN');
        return;
    }

    // Extract header info
    const tags = chess.header();
    const formatPlayer = (title, name, elo) => [title, name, elo ? `(${elo})` : null].filter(Boolean).join(' ');
    const headerLine = `${formatPlayer(tags.WhiteTitle, tags.White, tags.WhiteElo)} - ${formatPlayer(tags.BlackTitle, tags.Black, tags.BlackElo)}`;
    const eventLine = [tags.Event, tags.Date].filter(Boolean).join(', ');

    // Render moves from the PGN
    const movesText = chess.pgn().replace(/\[%.*?\]/g, ''); // removes engine/clock tags from final output

    const container = document.getElementById('pgn-output');
    container.textContent = `${headerLine}\n${eventLine}\n${movesText}`;
}

document.addEventListener('DOMContentLoaded', renderPGN);
