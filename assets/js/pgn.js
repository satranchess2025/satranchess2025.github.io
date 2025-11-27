// assets/js/chess/pgn.js
// Convert <pgn>...</pgn> into formatted posts with ONE diagram (middle of game)

(function () {
  "use strict";

  // Wikipedia pieces
  const PIECE_THEME_URL =
    "https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png";

  // Ensure dependencies
  function ensure() {
    if (typeof Chess === "undefined") {
      console.warn("pgn.js: Missing chess.js");
      return false;
    }
    if (typeof Chessboard === "undefined") {
      console.warn("pgn.js: Missing chessboard.js");
      return false;
    }
    return true;
  }

  // Board queue (initialize after DOM insertion)
  const pendingBoards = [];

  function queueBoard(id, fenOrStart) {
    pendingBoards.push({ id, fen: fenOrStart });
  }

  function initAllBoards() {
    pendingBoards.forEach(({ id, fen }) => {
      const el = document.getElementById(id);
      if (!el) {
        console.warn("pgn.js: Board container not found:", id);
        return;
      }
      Chessboard(id, {
        position: fen === "start" ? "start" : fen,
        draggable: false,
        pieceTheme: PIECE_THEME_URL
      });
    });
    pendingBoards.length = 0;
  }

  function extractYear(dateStr) {
    return dateStr ? dateStr.split(".")[0] : "";
  }

  function renderPGNElement(el, index) {
    if (!ensure()) return;

    const raw = el.textContent.trim();
    const game = new Chess();

    const loaded = game.load_pgn(raw, { sloppy: true });
    if (!loaded) {
      console.warn("pgn.js: Could not parse PGN.");
      return;
    }

    // Headers
    const hea
