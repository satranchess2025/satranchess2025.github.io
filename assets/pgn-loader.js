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

    // Extract all annotations in order
    const annotationRegex = /\{([^}]*)\}/g;
    const annotations = [];
    let match;
    while ((match = annotationRegex.exec(pgnText)) !== null) {
        const ann = match[1].trim();
        if (ann) annotations.push(ann);
    }

    // Remove all remaining PGN tags ([Event "…"]) from text
    let movesText = pgnText.replace(/\[[^\]]+\]/g, '').trim();

    // Collapse all whitespace into single spaces
    movesText = movesText.replace(/\s+/g, ' ');

    // Split movesText by space to insert annotations after the right move
    const moves = [];
    let annIndex = 0;
    const moveTokens = movesText.split(' ');

    for (let token of moveTokens) {
        if (!token) continue;

        if (token.startsWith('{') && token.endsWith('}')) {
            // Skip, we'll use our annotations array
            continue;
        }

        moves.push(token);

        // If there’s an annotation for this move, insert it in a <p>
        if (annIndex < annotations.length) {
            moves.push(`<p>{${annotations[annIndex]}}</p>`);
            annIndex++;
        }
    }

    return `<p>${moves.join(' ').trim()}</p>`;
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
