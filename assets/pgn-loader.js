// PGN loader + parser + renderer using chess.js with validated moves and annotations

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
    const loaded = chess.load_pgn(pgnText);

    if (!loaded) {
        console.error('Invalid PGN');
        return;
    }

    const tags = chess.header();

    // Custom header format
    const whitePart = `${tags.WhiteTitle ? tags.WhiteTitle + ' ' : ''}${tags.White || ''} ${tags.WhiteElo ? '(' + tags.WhiteElo + ')' : ''}`.trim();
    const blackPart = `${tags.BlackTitle ? tags.BlackTitle + ' ' : ''}${tags.Black || ''} ${tags.BlackElo ? '(' + tags.BlackElo + ')' : ''}`.trim();
    const headerLine = `${whitePart} - ${blackPart}`;
    const eventLine = [tags.Event, tags.Date].filter(Boolean).join(', ');

    // Parse PGN moves including meaningful annotations
    let movesOnly = pgnText.replace(/^\[.*\]\s*$/gm, '').trim(); // remove headers
    movesOnly = movesOnly.replace(/\[%.*?\]/g, ''); // remove engine tags
    movesOnly = movesOnly.replace(/\{\s*\}/g, ''); // remove empty braces

    // Split all tokens: move numbers, moves, annotations
    const tokens = movesOnly.match(/(\d+\.)|(\{[^}]*\})|(\S+)/g);

    let movesText = '';
    let moveNumber = 1;
    let moveIndex = 0;

    while (moveIndex < tokens.length) {
        if (tokens[moveIndex] && tokens[moveIndex].endsWith('.')) {
            const whiteMoveRaw = tokens[moveIndex + 1] || '';
            const blackMoveRaw = tokens[moveIndex + 2] && !tokens[moveIndex + 2].endsWith('.') ? tokens[moveIndex + 2] : '';

            // Validate moves using chess.js
            const legalWhite = chess.move(whiteMoveRaw, { sloppy: true });
            let legalBlack = null;
            if (blackMoveRaw) legalBlack = chess.move(blackMoveRaw, { sloppy: true });

            let whiteMoveText = legalWhite ? whiteMoveRaw : whiteMoveRaw;
            let blackMoveText = legalBlack ? blackMoveRaw : blackMoveRaw;

            // Attach annotations following moves if present
            if (tokens[moveIndex + 3] && tokens[moveIndex + 3].startsWith('{')) {
                whiteMoveText += ' ' + tokens[moveIndex + 3];
            }
            if (tokens[moveIndex + 4] && tokens[moveIndex + 4].startsWith('{')) {
                blackMoveText += ' ' + tokens[moveIndex + 4];
            }

            movesText += `${moveNumber}. ${whiteMoveText}`;
            if (blackMoveText) movesText += ` ${blackMoveText} `;
            else movesText += ' ';

            moveNumber++;
            moveIndex += blackMoveRaw ? 5 : 3;
        } else {
            moveIndex++;
        }
    }

    movesText = movesText.trim();

    // Append game result at the end
    if (tags.Result) {
        movesText += ` ${tags.Result}`;
    } else {
        movesText += ` ${chess.game_over() ? (chess.turn() === 'w' ? '0-1' : '1-0') : '*'}`;
    }

    // Output into three paragraphs: header, event, moves with annotations
    const container = document.getElementById('pgn-output');
    container.innerHTML = `<p>${headerLine}</p><p>${eventLine}</p><p>${movesText}</p>`;
}

document.addEventListener('DOMContentLoaded', renderPGN);
