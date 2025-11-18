// PGN loader + parser + renderer using chess.js
// Engine/clock tags [%eval ...] [%clk ...] are removed
// Meaningful comments containing moves or symbols are displayed next to moves

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

function removeEngineClockTags(text) {
    return text.replace(/\[%.*?\]/g, '');
}

function buildHeader(tags) {
    const formatPlayer = (title, name, elo) => [title, name, elo ? `(${elo})` : null].filter(Boolean).join(' ');
    const headerLine = `${formatPlayer(tags.WhiteTitle, tags.White, tags.WhiteElo)} - ${formatPlayer(tags.BlackTitle, tags.Black, tags.BlackElo)}`;
    const eventLine = [tags.Event, tags.Date].filter(Boolean).join(', ');
    return { headerLine, eventLine };
}

function isMeaningfulComment(comment) {
    if (!comment) return false;
    const clean = comment.replace(/[\{\}]/g, '').trim();
    return /[A-Za-z0-9!\?\#\+=]/.test(clean); // letters, digits, or chess symbols
}

function extractAnnotations(pgnText) {
    const annotationMap = {};
    const regex = /(\d+\.\s*\S+|\.\.\.\s*\S+)(\s*\{[^}]*\})?/g;
    let match, moveIndex = 0;

    while ((match = regex.exec(pgnText)) !== null) {
        const comment = match[2]?.trim() || '';
        if (isMeaningfulComment(comment)) annotationMap[moveIndex] = comment;
        moveIndex++;
    }

    return annotationMap;
}

function buildMovesText(chess, annotationMap) {
    const history = chess.history({ verbose: true });
    return history.reduce((text, move, i) => {
        const moveNumber = Math.floor(i / 2) + 1;
        const san = move.san;
        const annotation = annotationMap[i] ? ' ' + annotationMap[i] : '';

        if (i % 2 === 0) {
            // White move
            return text + `${moveNumber}. ${san}${annotation} `;
        } else {
            // Black move
            return text + `${san}${annotation} `;
        }
    }, '').trim() + ` ${chess.header().Result || '*'}`;
}

async function renderPGN() {
    let pgnText = await loadPGN();
    if (!pgnText) return;

    pgnText = removeEngineClockTags(pgnText);

    const chess = new Chess();
    if (!chess.load_pgn(pgnText)) {
        console.error('Invalid PGN');
        return;
    }

    const tags = chess.header();
    const { headerLine, eventLine } = buildHeader(tags);
    const annotationMap = extractAnnotations(pgnText);
    const movesText = buildMovesText(chess, annotationMap);

    const container = document.getElementById('pgn-output');
    container.textContent = `${headerLine}\n${eventLine}\n${movesText}`;
}

document.addEventListener('DOMContentLoaded', renderPGN);
