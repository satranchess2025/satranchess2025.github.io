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

  function createDiagram(wrapper, fen, small) {
    if (typeof Chessboard === "undefined") {
      console.warn("pgn.js: chessboard.js missing for diagrams");
      return;
    }

    var id = "pgn-diagram-" + (diagramCounter++);
    var div = document.createElement("div");
    div.className = "pgn-diagram" + (small ? " pgn-diagram-small" : "");
    div.id = id;
    div.style.width = small ? "250px" : "340px";
    div.style.maxWidth = "100%";
    div.style.margin = "0.75rem 0";

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

  // Simple SAN core tester
  function isSANCore(tok) {
    return /^(O-O(-O)?[+#]?|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?[+#]?|[a-h][1-8](=[QRBN])?[+#]?)$/.test(tok);
  }

  // Process one SAN-ish token in given Chess context
  function handleSANToken(displayToken, ctx) {
    var core = displayToken.replace(/[!?+#]+$/g, ""); // strip NAG-ish suffix
    if (!isSANCore(core)) return null;

    var mv = ctx.chess.move(core, { sloppy: true });
    if (!mv) {
      return null;
    }

    var span = document.createElement("span");
    span.className = "pgn-move sticky-move";
    span.dataset.fen = ctx.chess.fen();
    span.textContent = displayToken + " ";
    ctx.container.appendChild(span);
    return span;
  }

  // Parse {...} comment, with its own temp Chess (doesn't affect mainline)
  function parseComment(text, pos, outerCtx, wrapper) {
    var commentChess = new Chess(outerCtx.chess.fen());
    var p = document.createElement("p");
    p.className = "pgn-comment";
    p.style.marginLeft = (outerCtx.depth + 1) * 1.5 + "rem";
    p.style.fontSize = "0.8rem";
    wrapper.appendChild(p);

    var n = text.length;

    while (pos < n) {
      var ch = text[pos];

      if (ch === "}") {
        pos++;
        break;
      }

      // whitespace
      if (/\s/.test(ch)) {
        while (pos < n && /\s/.test(text[pos])) pos++;
        appendText(p, " ");
        continue;
      }

      // token until whitespace or '}'
      var start = pos;
      while (pos < n) {
        var c2 = text[pos];
        if (/\s/.test(c2) || c2 === "}") break;
        pos++;
      }
      var token = text.substring(start, pos);

      if (token === "[D]") {
        var small = (outerCtx.depth > 0); // comment inside variation -> small
        createDiagram(wrapper, commentChess.fen(), small);
        continue;
      }

      // Try SAN move inside comment
      var sanSpan = (function () {
        var core = token.replace(/[!?+#]+$/g, "");
        if (!isSANCore(core)) return null;
        var mv = commentChess.move(core, { sloppy: true });
        if (!mv) return null;

        var span = document.createElement("span");
        span.className = "pgn-move sticky-move";
        span.dataset.fen = commentChess.fen();
        span.textContent = token + " ";
        p.appendChild(span);
        return span;
      })();

      if (!sanSpan) {
        appendText(p, token + " ");
      }
    }

    return pos;
  }

  // Build mainline + variations + comments with structural paragraphs
  function buildMovetextDOM(movetext, wrapper) {
    var mainChess = new Chess();

    var mainP = document.createElement("p");
    mainP.className = "pgn-mainline";
    wrapper.appendChild(mainP);

    var rootCtx = {
      chess: mainChess,
      depth: 0,
      container: mainP,
      parent: null
    };
    var ctx = rootCtx;

    var i = 0;
    var n = movetext.length;

    while (i < n) {
      var ch = movetext[i];

      // whitespace -> collapse to single space
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
        pVar.style.marginLeft = (ctx.depth + 1) * 1.5 + "rem";
        pVar.style.fontSize = "0.8rem";
        wrapper.appendChild(pVar);

        ctx = {
          chess: varChess,
          depth: ctx.depth + 1,
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
        if (/\s/.test(c2) || c2 === "(" || c2 === ")" || c2 === "{" || c2 === "}") break;
        i++;
      }
      var token = movetext.substring(start, i);

      if (!token) continue;

      // Diagram marker in mainline / variation
      if (token === "[D]") {
        // In mainline or variation but not comment: big diagram
        createDiagram(wrapper, ctx.chess.fen(), false);
        continue;
      }

      // Result marker or move number -> just text
      if (/^(1-0|0-1|1\/2-1\/2|½-½|\*)$/.test(token) ||
          /^\d+\.+$/.test(token)) {
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

  // Render a single <pgn> element
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

    // Build move paragraphs + diagrams
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
