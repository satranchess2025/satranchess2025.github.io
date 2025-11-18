// Full PGN loader + parser + renderer using chess.js with annotations preserved

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

    // Header formatting
    const whitePart = `${tags.WhiteTitle ? tags.WhiteTitle + ' ' : ''}${tags.White || ''} ${tags.WhiteElo ? '(' + tags.WhiteElo + ')' : ''}`.trim();
    const blackPart = `${tags.BlackTitle ? tags.BlackTitle + ' ' : ''}${tags.Black || ''} ${tags.BlackElo ? '(' + tags.BlackElo + ')' : ''}`.trim();
    const headerLine = `${whitePart} - ${blackPart}`;
    const eventLine = [tags.Event, tags.Date].filter(Boolean).join(', ');

    // Remove PGN headers and engine/clock tags
    let movesOnly = pgnText.replace(/^\[.*\]\s*$/gm, '').trim();
    movesOnly = movesOnly.replace(/\[%.*?\]/g, ''); // remove engine/clock tags
    movesOnly = movesOnly.replace(/\{\s*\}/g, ''); // remove empty braces

    // Split tokens keeping annotations {…} together
    const tokens = movesOnly.match(/(\d+\.)|(\{[^}]*\})|(\S+)/g);

    let movesText = '';
    let moveNumber = 1;
    let i = 0;

    while (i < tokens.length) {
        if (tokens[i].endsWith('.')) {
            // White move
            let whiteMove = tokens[i + 1] || '';
            let whiteAnn = '';
            if (tokens[i + 2] && tokens[i + 2].startsWith('{')) {
                whiteAnn = ' ' + tokens[i + 2];
                i++;
            }
            chess.move(whiteMove, { sloppy: true });

            // Black move
            let blackMove = '';
            let blackAnn = '';
            if (tokens[i + 2] && !tokens[i + 2].endsWith('.')) {
                blackMove = tokens[i + 2];
                if (tokens[i + 3] && tokens[i + 3].startsWith('{')) {
                    blackAnn = ' ' + tokens[i + 3];
                    i++;
                }
                chess.move(blackMove, { sloppy: true });
            }

            movesText += `${moveNumber}. ${whiteMove}${whiteAnn}${blackMove ? ' ' + blackMove + blackAnn : ''} `;
            moveNumber++;
            i += blackMove ? 4 : 2;
        } else {
            i++;
        }
    }

    movesText = movesText.trim();
    movesText += ` ${tags.Result || '*'}`;

    const container = document.getElementById('pgn-output');
    container.innerHTML = `<p>${headerLine}</p><p>${eventLine}</p><p>${movesText}</p>`;
}

document.addEventListener('DOMContentLoaded', renderPGN);
