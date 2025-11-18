// PGN loader + renderer using chess.js
// Moves on a single line, annotations immediately after their move in <p>, engine/clock/cal removed

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

function parseMovesWithAnnotations(pgnText) {
    // Remove only engine/clock/cal tags from annotations
    const annotationCleaner = text =>
        text.replace(/\[\%.*?\]/g, '').trim();

    // Extract all annotations in order
    const annotationRegex = /\{([^}]*)\}/g;
    const annotations = [];
    let match;
    while ((match = annotationRegex.exec(pgnText)) !== null) {
        const ann = annotationCleaner(match[1]);
        if (ann) annotations.push(ann);
    }

    // Use chess.js to get move history
    const chess = new Chess();
    if (!chess.load_pgn(pgnText, { sloppy: true })) {
        console.error('Invalid PGN');
        return '';
    }

    const history = chess.history({ verbose: true });

    // Build moves on a single line
    let movesLine = '';
    let moveNumber = 1;
    let html = '';
    let annotationIndex = 0;

    for (let i = 0; i < history.length; i += 2) {
        let line = `${moveNumber}. ${history[i].san}`;
        if (history[i + 1]) line += ` ${history[i + 1].san}`;
        movesLine += line + ' ';

        // Add the moves line first
        html += `<p>${movesLine.trim()}</p>`;
        movesLine = ''; // reset

        // Add annotation(s) for this move if available
        if (annotationIndex < annotations.length) {
            html += `<p>{${annotations[annotationIndex]}}</p>`;
            annotationIndex++;
        }

        moveNumber++;
    }

    return html;
}

async function renderPGN() {
    const pgnText = await loadPGN();
    if (!pgnText) return;

    const chess = new Chess();
    chess.load_pgn(pgnText, { sloppy: true });
    const tags = chess.header();

    const headerHTML = buildHeader(tags);
    const movesHTML = parseMovesWithAnnotations(pgnText);

    document.getElementById('pgn-output').innerHTML = headerHTML + movesHTML;
}

document.addEventListener('DOMContentLoaded', renderPGN);
