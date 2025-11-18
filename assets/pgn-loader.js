// PGN loader + renderer using chess.js
// Moves numbered correctly, annotations after moves in their own <p>, engine/clock/cal removed

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
    // Remove header lines
    const lines = pgnText.split('\n').filter(line => !line.startsWith('['));
    let text = lines.join(' ').trim();

    // Remove engine/clock/cal tags: { [%eval ...] }, { [%clk ...] }, { [%cal ...] }
    text = text.replace(/\{\s*\[%.*?\]\s*\}/g, '').trim();

    // Extract all annotations with positions
    const annotationRegex = /\{([^}]*)\}/g;
    const annotations = [];
    let match;
    while ((match = annotationRegex.exec(text)) !== null) {
        const ann = match[1].trim();
        if (ann) {
            annotations.push({ index: match.index, text: `{${ann}}` });
        }
    }

    // Remove annotations from moves text for clean parsing
    const movesText = text.replace(annotationRegex, '').replace(/\s+/g, ' ').trim();

    // Use chess.js to get move history
    const chess = new Chess();
    chess.load_pgn(pgnText, { sloppy: true });
    const history = chess.history({ verbose: true });

    let html = '';
    let moveNumber = 1;
    let charIndex = 0; // Track position in movesText for annotation placement

    for (let i = 0; i < history.length; i += 2) {
        // Build the line for white and black
        let line = `${moveNumber}. ${history[i].san}`;
        if (history[i + 1]) line += ` ${history[i + 1].san}`;

        html += `<p>${line}</p>`; // Add moves as a paragraph

        // Find annotations that occur within this move text
        annotations.forEach(a => {
            if (a.index >= charIndex && a.index < charIndex + line.length) {
                html += `<p>${a.text}</p>`;
            }
        });

        charIndex += line.length + 1; // update charIndex for next move
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
