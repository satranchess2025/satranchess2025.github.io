// PGN loader + parser + renderer using chess.js with annotations preserved and correct move order

async function loadPGN() {
    const link = document.querySelector('link[rel="pgn"]');
    if (!link || !link.href) return null;

    try {
        const response = await fetch(link.href);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.text();
    } catch (err) {
        console.error('Failed to load PGN:', err);
        return null;
    }
}

async function renderPGN() {
    const pgnText = await loadPGN();
    if (!pgnText) return;

    const chess = new Chess();
    if (!chess.load_pgn(pgnText)) {
        console.error('Invalid PGN');
        return;
    }

    const tags = chess.header();

    // Format header
    const whitePart = `${tags.WhiteTitle ? tags.WhiteTitle + ' ' : ''}${tags.White || ''} ${tags.WhiteElo ? '(' + tags.WhiteElo + ')' : ''}`.trim();
    const blackPart = `${tags.BlackTitle ? tags.BlackTitle + ' ' : ''}${tags.Black || ''} ${tags.BlackElo ? '(' + tags.BlackElo + ')' : ''}`.trim();
    const headerLine = `${whitePart} - ${blackPart}`;
    const eventLine = [tags.Event, tags.Date].filter(Boolean).join(', ');

    // Extract annotations from PGN
    const annotationMap = {};
    const moveAnnotationRegex = /(\d+\.\s*\S+|\.\.\.\s*\S+)\s*(\{[^}]*\})?/g;
    let match;
    let moveIndex = 0;
    while ((match = moveAnnotationRegex.exec(pgnText)) !== null) {
        if (match[2]) annotationMap[moveIndex] = match[2].trim();
        moveIndex++;
    }

    // Build moves text from chess.js history
    const history = chess.history({ verbose: true });
    let movesText = '';
    for (let i = 0; i < history.length; i += 2) {
        const moveNumber = Math.floor(i / 2) + 1;
        const whiteMove = history[i].san;
        const blackMove = history[i + 1] ? history[i + 1].san : '';

        const whiteAnn = annotationMap[i] ? ' ' + annotationMap[i] : '';
        const blackAnn = annotationMap[i + 1] ? ' ' + annotationMap[i + 1] : '';

        movesText += `${moveNumber}. ${whiteMove}${whiteAnn}`;
        if (blackMove) movesText += ` ${blackMove}${blackAnn} `;
        else movesText += ' ';
    }

    movesText = movesText.trim();
    movesText += ` ${tags.Result || '*'}`;

    const container = document.getElementById('pgn-output');
    container.innerHTML = `<p>${headerLine}</p><p>${eventLine}</p><p>${movesText}</p>`;
}

document.addEventListener('DOMContentLoaded', renderPGN);
