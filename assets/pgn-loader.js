// PGN loader + renderer: moves on single line, annotations right after move in <p>, engine/clock/cal removed
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
    const formatPlayer = (title, name, elo) =>
        [title, name, elo ? `(${elo})` : ''].filter(Boolean).join(' ');
    const white = formatPlayer(tags.WhiteTitle, tags.White, tags.WhiteElo);
    const black = formatPlayer(tags.BlackTitle, tags.Black, tags.BlackElo);
    const siteDate = [tags.Site, tags.Date].filter(Boolean).join(', ');
    return `<p>${white} - ${black}<br>${siteDate}</p>`;
}

function parseMovesAndAnnotations(pgnText) {
    // Remove only engine/clock/cal tags inside annotations
    pgnText = pgnText.replace(/\{\s*\[%.*?\]\s*\}/g, '');

    // Split PGN into tokens: move numbers, moves, annotations, results
    const tokenRegex = /(\d+\.+)|(\{[^}]*\})|([^\s{}]+)/g;
    const tokens = [];
    let match;
    while ((match = tokenRegex.exec(pgnText)) !== null) {
        tokens.push(match[0].trim());
    }

    // Build single-line moves with annotations immediately after move
    let html = '';
    let movesLine = '';
    tokens.forEach(token => {
        if (token.match(/^\d+\.+$/)) {
            // Move number
            if (movesLine) {
                html += `<p>${movesLine.trim()}</p>`;
                movesLine = '';
            }
            movesLine += token + ' ';
        } else if (token.startsWith('{') && token.endsWith('}')) {
            // Annotation - new paragraph immediately after current moves
            html += `<p>${token}</p>`;
        } else {
            // Move
            movesLine += token + ' ';
        }
    });
    if (movesLine) html += `<p>${movesLine.trim()}</p>`;
    return html;
}

async function renderPGN() {
    const pgnText = await loadPGN();
    if (!pgnText) return;

    // Extract header tags using chess.js
    const chess = new Chess();
    chess.load_pgn(pgnText, { sloppy: true });
    const tags = chess.header();

    const headerHTML = buildHeader(tags);
    const movesHTML = parseMovesAndAnnotations(pgnText);

    document.getElementById('pgn-output').innerHTML = headerHTML + movesHTML;
}

document.addEventListener('DOMContentLoaded', renderPGN);
