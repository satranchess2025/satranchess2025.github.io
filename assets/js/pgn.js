// assets/js/chess/pgn.js ½-½

(function () {
  "use strict";

  const PIECE_THEME_URL =
    "https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png";

  function ensure() {
    if (typeof Chess === "undefined") return false;
    if (typeof Chessboard === "undefined") return false;
    return true;
  }

  function extractYear(dateStr) {
    return dateStr?.split(".")[0] || "";
  }

  function createBoard(id, fenOrStart) {
    Chessboard(id, {
      position: fenOrStart === "start" ? "start" : fenOrStart,
      draggable: false,
      pieceTheme: PIECE_THEME_URL
    });
  }

  function renderPGNElement(el, index) {
    if (!ensure()) return;

    const raw = el.textContent.trim();
    const game = new Chess();
    const ok = game.load_pgn(raw, { sloppy: true });

    if (!ok) {
      console.warn("pgn.js: Could not parse PGN:", raw);
      return;
    }

    const headers = game.header();
    const white = [headers.WhiteTitle, headers.White, headers.WhiteElo && `(${headers.WhiteElo})`]
      .filter(Boolean).join(" ");
    const black = [headers.BlackTitle, headers.Black, headers.BlackElo && `(${headers.BlackElo})`]
      .filter(Boolean).join(" ");

    const event = headers.Event || "";
    const year = extractYear(headers.Date);

    const moves = game.history({ verbose: true });
    game.reset();

    const wrapper = document.createElement("div");
    wrapper.className = "pgn-blog-block";

    const h2 = document.createElement("h2");
    h2.textContent = `${white} – ${black}`;
    wrapper.appendChild(h2);

    const h3 = document.createElement("h3");
    h3.textContent = year ? `${event}, ${year}` : event;
    wrapper.appendChild(h3);

    const startDiv = document.createElement("div");
    const startId = `pgn-start-${index}`;
    startDiv.id = startId;
    startDiv.className = "pgn-board";
    wrapper.appendChild(startDiv);
    createBoard(startId, "start");

    let p = document.createElement("p");
    let fullMove = 0;

    for (let i = 0; i < moves.length; i++) {
      const m = moves[i];
      const isWhite = m.color === "w";
      const moveNo = Math.floor(i / 2) + 1;
      const text = isWhite ? `${moveNo}. ${m.san}` : m.san;

      const span = document.createElement("span");
      span.textContent = text + " ";
      p.appendChild(span);

      game.move(m.san);

      if (!isWhite) {
        fullMove++;
        if (fullMove % 5 === 0) {
          wrapper.appendChild(p);

          const diag = document.createElement("div");
          const diagId = `pgn-diag-${index}-${fullMove}`;
          diag.id = diagId;
          diag.className = "pgn-board";
          wrapper.appendChild(diag);

          createBoard(diagId, game.fen());
          p = document.createElement("p");
        }
      }
    }

    if (p.textContent.trim()) wrapper.appendChild(p);

    el.replaceWith(wrapper);

    if (window.ChessFigurine) ChessFigurine.run(wrapper);
  }

  function renderAll(root = document) {
    root.querySelectorAll("pgn").forEach((el, i) => renderPGNElement(el, i));
  }

  function init() {
    renderAll();
    window.PGNRenderer = { run: (r) => renderAll(r || document.body) };
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init)
    : init();
})();
