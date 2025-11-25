console.log("RAW PGN RECEIVED BY BROWSER:");
console.log("----START----");
console.log(scriptTag.textContent);
console.log("----END----");

// pgn-viewer.js
// Requires: chess.js + chessboard.js

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('.pgn-source').forEach((scriptTag, index) => {

    // --- Extract raw PGN ---
    const rawPGN = scriptTag.textContent || "";

    // --- Debug what the browser actually received ---
    console.log("RAW PGN RECEIVED BY BROWSER #" + index);
    console.log("----START----");
    console.log(rawPGN);
    console.log("----END----");

    // --- Sanitize PGN (critical for Jekyll/Markdown issues) ---
    let pgn = rawPGN.trim()
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/\r/g, "")
      .replace(/^\s+|\s+$/g, "")
      .replace(/\n{3,}/g, "\n\n")  // collapse excessive newlines
      .replace(/\t+/g, "");       // remove stray tabs

    // --- Create a placeholder viewer container ---
    const container = document.createElement("div");
    container.className = "pgn-viewer";
    scriptTag.replaceWith(container);

    // --- Create board + move list ---
    container.innerHTML = `
      <div class="board" style="width: 400px;"></div>
      <div class="meta"></div>
      <div class="moves"></div>
    `;

    const boardEl = container.querySelector(".board");
    const metaEl  = container.querySelector(".meta");
    const movesEl = container.querySelector(".moves");

    // --- Parse PGN with chess.js ---
    const chess = new Chess();
    const loaded = chess.load_pgn(pgn, { sloppy: true });

    if (!loaded) {
      movesEl.innerHTML = `<div style="color:red;font-weight:bold">Invalid PGN</div>`;
      return;
    }

    // --- Extract metadata ---
    const white  = chess.header().White || "";
    const black  = chess.header().Black || "";
    const wElo   = chess.header().WhiteElo ? ` (${chess.header().WhiteElo})` : "";
    const bElo   = chess.header().BlackElo ? ` (${chess.header().BlackElo})` : "";
    const wTitle = chess.header().WhiteTitle ? chess.header().WhiteTitle + " " : "";
    const bTitle = chess.header().BlackTitle ? chess.header().BlackTitle + " " : "";

    const site = chess.header().Site || "";
    const date = chess.header().Date || "";

    metaEl.textContent = `${wTitle}${white}${wElo} — ${bTitle}${black}${bElo}\n${site}, ${date}`;

    // --- Build move list with correct formatting ---
    const history = chess.history({ verbose: true });
    let moveNumber = 1;
    let html = "";

    for (let i = 0; i < history.length; i++) {
      const move = history[i];

      // Start White's move
      if (move.color === "w") {
        html += `<div class="move-pair">`;
        html += `<span class="move-num">${moveNumber}. </span>`;
        html += `<a href="#" class="mv" data-index="${i}">${move.san}</a> `;

        // Insert comment after white move if it exists
        if (move.comment) {
          html += `<span class="comment"> ${move.comment}</span> `;
        }

      } else {
        // Black move
        html += `<span class="black-move">`;
        html += `<span class="black-num">${moveNumber}... </span>`;
        html += `<a href="#" class="mv" data-index="${i}">${move.san}</a> `;

        // Insert comment after black move
        if (move.comment) {
          html += `<span class="comment"> ${move.comment}</span> `;
        }

        html += `</span></div>`;
        moveNumber++;
      }
    }

    movesEl.innerHTML = html;

    // --- Initialize board ---
    const board = Chessboard(boardEl, {
      position: chess.fen()
    });

    // --- Click a move: jump to that position ---
    movesEl.querySelectorAll(".mv").forEach(a => {
      a.addEventListener("click", evt => {
        evt.preventDefault();
        const idx = parseInt(a.dataset.index, 10);

        const replay = new Chess();
        const hist = chess.history({ verbose: true });

        for (let j = 0; j <= idx; j++) {
          replay.move(hist[j]);
        }

        board.position(replay.fen());
      });
    });
  });
});
