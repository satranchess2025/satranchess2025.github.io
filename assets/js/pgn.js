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
    return true;
  }

  // Remove result 1/2-1/2 → ½-½
  function normalizeResult(str) {
    return str ? str.replace(/1\/2-1\/2/g, "½-½") : "";
  }

  // Extract year from PGN Date
  function extractYear(dateStr) {
    if (!dateStr) return "";
    var p = dateStr.split(".");
    return /^\d{4}$/.test(p[0]) ? p[0] : "";
  }

  // Flip “Surname, Name” → “Name Surname”
  function flipName(name) {
    if (!name) return "";
    var idx = name.indexOf(",");
    if (idx === -1) return name.trim();
    return name.substring(idx + 1).trim() + " " + name.substring(0, idx).trim();
  }

  // -------------------------------------
  //  Parse PGN movetext into FULL SAN list
  //  including variations + comments.
  // -------------------------------------
  function extractAllSANWithFEN(cleanedPGN) {
    var game = new Chess();
    game.load_pgn(cleanedPGN, { sloppy: true });

    // Re-parse manually to catch variation SAN too
    var raw = cleanedPGN.split(/\n\n/)[1] || "";
    var tokens = raw.split(/\s+/);

    var temp = new Chess();
    var result = [];

    tokens.forEach(tok => {
      tok = tok.trim();

      // Skip move numbers
      if (/^\d+\.+$/.test(tok)) return;

      // Skip NAGs
      if (/^\$\d+$/.test(tok)) return;

      // Skip result
      if (/^(1-0|0-1|1\/2-1\/2|½-½|\*)$/.test(tok)) return;

      // SAN?
      if (
        /^(O-O(-O)?[+#]?|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?[+#]?|[a-h][1-8](=[QRBN])?[+#]?)$/.test(tok)
      ) {
        var mv = temp.move(tok, { sloppy: true });
        if (mv) {
          result.push({ san: tok, fen: temp.fen() });
        }
      }
    });

    return result;
  }

  // -------------------------------------
  //  RENDER <pgn> ELEMENT
  // -------------------------------------
  function renderPGNElement(el, index) {
    if (!ensureDeps()) return;

    var raw = el.textContent.trim();
    var lines = raw.split(/\r?\n/);

    var headerLines = [];
    var movetextLines = [];
    var inHeader = true;

    lines.forEach(line => {
      var t = line.trim();

      if (inHeader && t.startsWith("[") && t.endsWith("]")) {
        headerLines.push(line);
      } else if (inHeader && t === "") {
        inHeader = false;
      } else {
        inHeader = false;
        movetextLines.push(line);
      }
    });

    var movetext = movetextLines.join(" ").replace(/\s+/g, " ").trim();
    var cleanedPGN =
      (headerLines.length ? headerLines.join("\n") + "\n\n" : "") + movetext;

    // Full SAN/FEN map
    var fenMap = extractAllSANWithFEN(cleanedPGN);

    // Load into game for metadata
    var game = new Chess();
    game.load_pgn(cleanedPGN, { sloppy: true });

    var headers = game.header();
    var result = normalizeResult(headers.Result || "");

    // Build wrapper
    var wrapper = document.createElement("div");
    wrapper.className = "pgn-blog-block";

    // Export full variation-capable SAN→FEN map
    wrapper._fenMap = fenMap;

    // Header
    var white =
      (headers.WhiteTitle ? headers.WhiteTitle + " " : "") +
      flipName(headers.White || "") +
      (headers.WhiteElo ? " (" + headers.WhiteElo + ")" : "");

    var black =
      (headers.BlackTitle ? headers.BlackTitle + " " : "") +
      flipName(headers.Black || "") +
      (headers.BlackElo ? " (" + headers.BlackElo + ")" : "");

    var year = extractYear(headers.Date);
    var eventLine = (headers.Event || "") + (year ? ", " + year : "");

    var h3 = document.createElement("h3");
    h3.innerHTML = white + " – " + black + "<br>" + eventLine;
    wrapper.appendChild(h3);

    // Plain text (no indentation / formatting)
    var p = document.createElement("p");
    p.className = "pgn-movelist";
    p.textContent = movetext + (result ? " " + result : "");
    wrapper.appendChild(p);

    // Replace element
    el.replaceWith(wrapper);

    if (window.ChessFigurine && window.ChessFigurine.run) {
      ChessFigurine.run(wrapper);
    }
  }

  function renderAll(root) {
    (root || document)
      .querySelectorAll("pgn")
      .forEach((el, i) => renderPGNElement(el, i));
  }

  function init() {
    renderAll(document);
    window.PGNRenderer = {
      run(root) {
        renderAll(root || document.body);
      }
    };
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();
