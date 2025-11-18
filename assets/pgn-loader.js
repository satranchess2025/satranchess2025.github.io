// PGN loader + parser + renderer (custom header format, clean tags, merge half-moves, remove unwanted tags, display moves with annotations in <p>)

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

function parsePGN(pgnText) {
    const lines = pgnText.split(/\r?\n/);
    const tags = {};
    let movesText = '';
    let inHeader = true;

    for (const line of lines) {
        if (inHeader && line.startsWith('[')) {
            const match = line.match(/^\[(\w+)\s+"(.*)"\]$/);
            if (match) tags[match[1]] = match[2];
        } else {
            inHeader = false;
            if (line.trim() !== '' && !line.includes('%cal') && !line.includes('%csl')) {
                movesText += line.trim() + ' ';
            }
        }
    }

    // Clean up moves text
    movesText = movesText.replace(/\[%eval[^\]]*\]/g, '');
    movesText = movesText.replace(/\[%clk[^\]]*\]/g, '');
    movesText = movesText.replace(/\{\s*\}/g, '');
    movesText = movesText.replace(/\s+/g, ' ').trim();
    // Merge half-moves: '1. e4 1... c5' -> '1. e4 c5'
    movesText = movesText.replace(/(\d+\.)\s*(\S+)\s*\1\.\.\.\s*(\S+)/g, '$1 $2 $3');

    // Split annotations (starting with {) into separate parts, but keep moves together
    const moveParts = movesText.split(/(?=\{)/g).map(p => p.trim()).filter(p => p.length > 0);

    return { tags, moveParts };
}

function renderPGN(parsed) {
    const container = document.getElementById('pgn-output');
    if (!container) return;

    const t = parsed.tags;

    // Build header line
    let headerLine = '';
    if (t.WhiteTitle) headerLine += t.WhiteTitle + ' ';
    if (t.White) headerLine += t.White + ' ';
    if (t.WhiteElo) headerLine += `(${t.WhiteElo}) `;
    headerLine += '- ';
    if (t.BlackTitle) headerLine += t.BlackTitle + ' ';
    if (t.Black) headerLine += t.Black + ' ';
    if (t.BlackElo) headerLine += `(${t.BlackElo})`;

    let eventLine = '';
    if (t.Event) eventLine += t.Event;
    if (t.Date) eventLine += eventLine ? `, ${t.Date}` : t.Date;

    let html = `<div>${headerLine}</div>`;
    if (eventLine) html += `<div>${eventLine}</div>`;

    // Wrap each move or annotation in <p>
    parsed.moveParts.forEach(part => {
        html += `<p>${part}</p>`;
    });

    container.innerHTML = html;
}

async function initPGNReader() {
    const pgnText = await loadPGN();
    if (!pgnText) return;

    const parsed = parsePGN(pgnText);
    renderPGN(parsed);
}

document.addEventListener('DOMContentLoaded', initPGNReader);
