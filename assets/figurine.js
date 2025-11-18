// Convert chess notation to figurine notation
function toFigurineNotation(moveText) {
  const figurines = {
    'K': '\u2654', // King
    'Q': '\u2655', // Queen
    'R': '\u2656', // Rook
    'B': '\u2657', // Bishop
    'N': '\u2658', // Knight
  };
  return moveText.replace(/[KQRBN]/g, m => figurines[m] || m);
}

function renderFigurineInGameText() {
  const gameTextDiv = document.querySelector('.game-text');
  if (!gameTextDiv) return;
  const paragraphs = gameTextDiv.querySelectorAll('p');
  paragraphs.forEach(p => {
    // Replace chess moves inside the paragraph, including captures and disambiguation
    p.innerHTML = p.innerHTML.replace(/\b([KQRBN][a-h]?[1-8]?[x-]?[a-h][1-8])\b/g, function(match) {
      return toFigurineNotation(match);
    });
  });
}

function renderFigurineInGameData() {
  const gameDataDiv = document.querySelector('.game-data');
  if (!gameDataDiv) return;
  // Replace chess moves inside game-data, including captures and disambiguation
  gameDataDiv.innerHTML = gameDataDiv.innerHTML.replace(/\b([KQRBN][a-h]?[1-8]?[x-]?[a-h][1-8])\b/g, function(match) {
    return toFigurineNotation(match);
  });
}

document.addEventListener('DOMContentLoaded', function() {
  renderFigurineInGameText();
  renderFigurineInGameData();
});
