// Basic PGN loader + parser + renderer
// This script loads a PGN file via <link rel="pgn" href="game.pgn"> and renders moves as text.

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
  let moves = [];
  let inHeader = true;

  for (const line of lines) {
    if (inHeader && line.startsWith('[')) {
      const match = line.match(/^\[(\w+)\s+"(.*)"\]$/);
      if (match) tags[match[1]] = match[2];
    } else {
      inHeader = false;
      moves.push(line.trim());
    }
  }

  const moveText = moves.join(' ').replace(/\s+/g, ' ').trim();
  return { tags, moveText };
}

function renderPGN(parsed) {
  const container = document.getElementById('pgn-output');
  if (!container) return;

  // Display tags
  let html = '';
  for (const [key, value] of Object.entries(parsed.tags)) {
    html += `<div><strong>${key}:</strong> ${value}</div>`;
  }

  // Display moves
  html += `<pre>${parsed.moveText}</pre>`;

  container.innerHTML = html;
}

async function initPGNReader() {
  const pgnText = await loadPGN();
  if (!pgnText) return;

  const parsed = parsePGN(pgnText);
  renderPGN(parsed);
}

document.addEventListener('DOMContentLoaded', initPGNReader);
