// PGN loader + renderer using chess.js
// Preserve all moves, comments, and engine/clock tags
// Header includes titles, names, Elo, site, and date

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

function buildHeader(tags) {
    const formatPlayer = (title, name, elo) => {
        const parts = [];
        if (title) parts.push(title);
        if (name) parts.push(name);
        if (elo) parts.push(`(${elo})`);
        return parts.join(' ');
    };

    const white = formatPlayer(tags.WhiteTitle, tags.White, tags.WhiteElo);
    const black = formatPlayer(tags.BlackTitle, tags.Black, tags.BlackElo);
    const headerLine = `${white} - ${black}`;
    const eventLine = [tags.Site, tags.Date].filter(Boolean).join(', ');

    return `${headerLine}\n${eventLine}`;
}

async function renderPGN() {
    const pgnText = await loadPGN();
    if (!pgnText) return;

    const chess = new Chess();
    if (!chess.load_pgn(pgnText, { sloppy: true })) {
        console.error('Invalid PGN');
        return;
    }

    const tags = chess.header();
    const header = buildHeader(tags);

    // Keep moves exactly as in PGN (including comments and engine/clock tags)
    const movesText = chess.pgn();

    const container = document.getElementById('pgn-output');
    container.textContent = `${header}\n${movesText}`;
}

document.addEventListener('DOMContentLoaded', renderPGN);
