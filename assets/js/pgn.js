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

  function normalizeResult(str) {
    return str ? str.replace(/1\/2-1\/2/g, "½-½") : "";
  }

  function extractYear(dateStr) {
    if (!dateStr) return "";
    var p = dateStr.split(".");
    return /^\d{4}$/.test(p[0]) ? p[0] : "";
  }

  function flipName(name) {
    if (!name) return "";
    var idx = name.indexOf(",");
    if (idx === -1) return name.trim();
    return name.substring(idx + 1).trim() + " " + name.substring(0, idx).trim();
  }

  function appendText(container, text) {
    if (!text) return;
    container.appendChild(document.createTextNode(text));
  }

  var diagramCounter = 0;

  function createDiagram(wrapper, fen) {
    if (typeof Chessboard === "undefined") {
      console.warn("pgn.js: chessboard.js missing for diagrams");
      return;
    }

    var id = "pgn-diagram-" + (diagramCounter++);
    var div = document.createElement("div");
    div.className = "pgn-diagram";
    div.id = id;
    // width only, no extra styling
    div.style.width = "340px";
    div.style.maxWidth = "100%";
    wrapper.appendChild(div);

    setTimeout(function () {
      var target = document.getElementById(id);
      if (!target) return;
      Chessboard(target, {
        position: fen,
        draggable: false,
        pieceTheme: PIECE_THEME_URL
      });
    }, 0);
  }

  function isSANCore(tok) {
    return /^(O-O(-O)?[+#]?|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?[+#]?|[a-h][1-8](=[QRBN])?[+#]?)$/.test(
      tok
    );
  }

  // Creates a clickable move span and advances the given Chess context
  function handleSANToken(displayToken, ctx) {
    var core = displayToken.replace(/[!?+#]+$/g, ""); // strip NAG-ish suffix
    if (!isSANCore(core)) return null;

    var mv = ctx.chess.move(core, { sloppy: true });
    if (!mv) return null;

    var span = document.createElement("span");
    span.className = "pgn-move sticky-move";
    span.dataset.fen = ctx.chess.fen();
    span.textContent = displayToken + " ";
    ctx.container.appendChild(span);
    return span;
  }

  // Parse a comment {...} starting at movetext[pos] == first char inside {,
  // using a separate Chess object but starting from outerCtx.chess.fen().
  function parseComment(movetext, pos, outerCtx, wrapper) {
    var commentChess = new Chess(outerCtx.chess.fen());
    var p = document.createElement("p");
    p.className = "pgn-comment";
    wrapper.appendChild(p);

    var n = movetext.length;

    while (pos < n) {
      var ch = movetext[pos];

      if (ch === "}") {
        pos++;
        break;
      }

      if (/\s/.test(ch)) {
        while (pos < n && /\s/.test(movetext[pos])) pos++;
        appendText(p, " ");
        continue;
      }

      var start = pos;
      while (pos < n) {
        var c2 = movetext[pos];
        if (/\s/.test(c2) || c2 === "}") break;
        pos++;
      }
      var token = movetext.substring(start, pos);

      if (!token) continue;

      if (token === "[D]") {
        createDiagram(wrapper, commentChess.fen());
        continue;
      }

      // Try SAN inside comment
      (function () {
        var core = token.replace(/[!?+#]+$/g, "");
        if (!isSANCore(core)) {
          appendText(p, token + " ");
          return;
        }
        var mv = commentChess.move(core, { sloppy: true });
        if (!mv) {
          appendText(p, token + " ");
          return;
        }
        var span = document.createElement("span");
        span.className = "pgn-move sticky-move";
        span.dataset.fen = commentChess.fen();
        span.textContent = token + " ";
        p.appendChild(span);
      })();
    }

    return pos;
  }

  // Build paragraphs in reading order: mainline, variations, comments & diagrams.
  // No indentation / no special font-styling.
  function buildMovetextDOM(movetext, wrapper) {
    var mainChess = new Chess();

    var mainP = document.createElement("p");
    mainP.className = "pgn-mainline";
    wrapper.appendChild(mainP);

    var rootCtx = {
      chess: mainChess,
      container: mainP,
      parent: null
    };
    var ctx = rootCtx;

    var i = 0;
    var n = movetext.length;

    while (i < n) {
      var ch = movetext[i];

      // whitespace → single space
      if (/\s/.test(ch)) {
        while (i < n && /\s/.test(movetext[i])) i++;
        appendText(ctx.container, " ");
        continue;
      }

      // start variation
      if (ch === "(") {
        i++;
        var varChess = new Chess(ctx.chess.fen());
        var pVar = document.createElement("p");
        pVar.className = "pgn-variation";
        wrapper.appendChild(pVar);

        ctx = {
          chess: varChess,
          container: pVar,
          parent: ctx
        };
        continue;
      }

      // end variation
      if (ch === ")") {
        i++;
        if (ctx.parent) ctx = ctx.parent;
        continue;
      }

      // comment
      if (ch === "{") {
        i = parseComment(movetext, i + 1, ctx, wrapper);
        continue;
      }

      // normal token
      var start = i;
      while (i < n) {
        var c2 = movetext[i];
        if (/\s/.test(c2) || c2 === "(" || c2 === ")" || c2 === "{" || c2 === "}")
          break;
        i++;
      }
      var token = movetext.substring(start, i);
      if (!token) continue;

      // Diagram marker in mainline / variation
      if (token === "[D]") {
        createDiagram(wrapper, ctx.chess.fen());
        continue;
      }

      // Result or move number → plain text
      if (
        /^(1-0|0-1|1\/2-1\/2|½-½|\*)$/.test(token) ||
        /^\d+\.+$/.test(token)
      ) {
        appendText(ctx.container, token + " ");
        continue;
      }

      // Try SAN
      var sanSpan = handleSANToken(token, ctx);
      if (!sanSpan) {
        appendText(ctx.container, token + " ");
      }
    }
  }

  function renderPGNElement(el, index) {
    if (!ensureDeps()) return;

    var raw = el.textContent.trim();
    var lines = raw.split(/\r?\n/);

    var headerLines = [];
    var movetextLines = [];
    var inHeader = true;

    lines.forEach(function (line) {
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

    var game = new Chess();
    game.load_pgn(cleanedPGN, { sloppy: true });

    var headers = game.header();
    var result = normalizeResult(headers.Result || "");

    var wrapper = document.createElement("div");
    wrapper.className = "pgn-blog-block";

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

    // Build paragraphs + diagrams in correct order
    buildMovetextDOM(movetext + (result ? " " + result : ""), wrapper);

    el.replaceWith(wrapper);

    if (window.ChessFigurine && window.ChessFigurine.run) {
      ChessFigurine.run(wrapper);
    }
  }

  function renderAll(root) {
    (root || document)
      .querySelectorAll("pgn")
      .forEach(function (el, i) {
        renderPGNElement(el, i);
      });
  }

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
