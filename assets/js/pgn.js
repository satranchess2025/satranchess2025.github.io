// assets/js/chess/pgn.js
(function () {
  "use strict";

  var PIECE_THEME_URL =
    "https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png";

  function ensureDeps() {
    if (typeof Chess === "undefined") {
      console.warn("pgn.js: chess.js missing");
      return false;
    }
    if (typeof Chessboard === "undefined") {
      console.warn("pgn.js: chessboard.js missing");
      return false;
    }
    return true;
  }

  // Queue boards for initialization AFTER DOM insertion
  var pendingBoards = [];

  function queueBoard(id, fen) {
    pendingBoards.push({ id: id, fen: fen });
  }

  function initAllBoards() {
    for (var i = 0; i < pendingBoards.length; i++) {
      var item = pendingBoards[i];
      var el = document.getElementById(item.id);
      if (!el) continue;

      Chessboard(item.id, {
        position: item.fen === "start" ? "start" : item.fen,
        draggable: false,
        pieceTheme: PIECE_THEME_URL
      });
    }
    pendingBoards = [];
  }

  // Robust year extractor from PGN Date
  function extractYear(dateStr) {
    if (!dateStr) return "";
    var parts = dateStr.split(".");
    if (!parts.length) return "";
    var year = parts[0];
    if (!/^\d{4}$/.test(year)) return "";
    return year;
  }

  function renderPGNElement(el, index) {
    if (!ensureDeps()) return;

    var raw = el.textContent.trim();
    var game = new Chess();
    var ok = game.load_pgn(raw, { sloppy: true });

    if (!ok) {
      console.warn("pgn.js: Could not parse PGN");
      return;
    }

    var headers = game.header();
    var result = headers.Result || "";

    // Player names
    var white = [
      headers.WhiteTitle || "",
      headers.White || "",
      headers.WhiteElo ? "(" + headers.WhiteElo + ")" : ""
    ].join(" ").trim();

    var black = [
      headers.BlackTitle || "",
      headers.Black || "",
      headers.BlackElo ? "(" + headers.BlackElo + ")" : ""
    ].join(" ").trim();

    var eventName = headers.Event || "";
    var year = extractYear(headers.Date);

    var eventLine = eventName + (year ? ", " + year : "");

    // Moves
    var moves = game.history({ verbose: true });
    game.reset();

    // Wrapper div
    var wrapper = document.createElement("div");
    wrapper.className = "pgn-blog-block";

    // ------------------------------------
    // One <h3> with <br>
    // ------------------------------------
    var h3 = document.createElement("h3");
    h3.innerHTML =
      white + " – " + black + "<br>" + eventLine;
    wrapper.appendChild(h3);

    // ------------------------------------
    // Find midpoint
    // ------------------------------------
    var half = Math.floor(moves.length / 2);

    // ------------------------------------
    // MOVES BEFORE DIAGRAM
    // ------------------------------------
    var p1 = document.createElement("p");

    for (var i = 0; i < moves.length; i++) {
      var m = moves[i];
      var isWhite = m.color === "w";
      var moveNo = Math.floor(i / 2) + 1;

      var span = document.createElement("span");
      span.textContent = isWhite
        ? moveNo + ". " + m.san + " "
        : m.san + " ";

      p1.appendChild(span);

      if (i === half - 1) break;
    }

    wrapper.appendChild(p1);

    // ------------------------------------
    // DIAGRAM AT HALFWAY POSITION
    // ------------------------------------
    game.reset();
    for (var x = 0; x < half; x++) {
      game.move(moves[x].san);
    }

    var midFen = game.fen();

    var midId = "pgn-middle-" + index;
    var midDiv = document.createElement("div");
    midDiv.id = midId;
    midDiv.className = "pgn-board";
    wrapper.appendChild(midDiv);

    queueBoard(midId, midFen);

    // ------------------------------------
    // MOVES AFTER DIAGRAM
    // ------------------------------------
    var p2 = document.createElement("p");

    for (var j = half; j < moves.length; j++) {
      var mm = moves[j];
      var isWhite2 = mm.color === "w";
      var moveNo2 = Math.floor(j / 2) + 1;

      var span2 = document.createElement("span");
      span2.textContent = isWhite2
        ? moveNo2 + ". " + mm.san + " "
        : mm.san + " ";

      p2.appendChild(span2);
    }

    wrapper.appendChild(p2);

    // ------------------------------------
    // ADD FINAL RESULT BELOW MOVES
    // ------------------------------------
    if (result) {
      var res = document.createElement("p");
      res.className = "pgn-result";
      res.textContent = result;
      wrapper.appendChild(res);
    }

    // Replace original <pgn> tag
    el.replaceWith(wrapper);

    // Initialize all boards
    initAllBoards();

    // Convert moves to figurine notation
    if (window.ChessFigurine && window.ChessFigurine.run) {
      ChessFigurine.run(wrapper);
    }
  }

  // ------------------------------------
  // Render all <pgn> blocks
  // ------------------------------------
  function renderAll(root) {
    var scope = root || document;
    var nodes = scope.querySelectorAll("pgn");

    for (var i = 0; i < nodes.length; i++) {
      renderPGNElement(nodes[i], i);
    }

    initAllBoards();
  }

  // ------------------------------------
  // Init
  // ------------------------------------
  function init() {
    renderAll(document);

    window.PGNRenderer = {
      run: function (root) {
        renderAll(root || document.body);
      }
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
