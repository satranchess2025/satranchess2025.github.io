// PGN loader + parser + renderer using chess.js with proper move pairing and annotations

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

    // Custom header format
    const whitePart = `${tags.WhiteTitle ? tags.WhiteTitle + ' ' : ''}${tags.White || ''} ${tags.WhiteElo ? '(' + tags.WhiteElo + ')' : ''}`.trim();
    const blackPart = `${tags.BlackTitle ? tags.BlackTitle + ' ' : ''}${tags.Black || ''} ${tags.BlackElo ? '(' + tags.BlackElo + ')' : ''}`.trim();
    const headerLine = `${whitePart} - ${blackPart}`;
    const eventLine = [tags.Event, tags.Date].filter(Boolean).join(', ');

    // Use chess.js to get all moves in order
    const moves = chess.history({ verbose: true });

    let movesText = '';
    for (let i = 0; i < moves.length; i += 2) {
        const moveNumber = Math.floor(i / 2) + 1;
        const whiteMove = moves[i] ? moves[i].san : '';
        const blackMove = moves[i + 1] ? moves[i + 1].san : '';
        movesText += `${moveNumber}. ${whiteMove}${blackMove ? ' ' + blackMove : ''} `;
    }

    movesText = movesText.trim();

    // Append game result
    movesText += ` ${tags.Result || '*'}`;

    const container = document.getElementById('pgn-output');
    container.innerHTML = `<p>${headerLine}</p><p>${eventLine}</p><p>${movesText}</p>`;
}

document.addEventListener('DOMContentLoaded', renderPGN);
