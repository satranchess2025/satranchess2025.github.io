(function () {
  "use strict";

  const PIECE_THEME_URL =
    "https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png";

  const SAN_CORE_REGEX =
    /^([O0]-[O0](-[O0])?[+#]?|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?[+#]?|[a-h][1-8](=[QRBN])?[+#]?)$/;
  const RESULT_REGEX = /^(1-0|0-1|1\/2-1\/2|½-½|\*)$/;
  const MOVE_NUMBER_REGEX = /^(\d+)(\.+)$/;
  const EVAL_TOKEN = /^[\+\-=∞±]+$/;
  const NBSP = "\u00A0";

  const NAG_MAP = {
    1: "!",
    2: "?",
    3: "‼",
    4: "⁇",
    5: "⁉",
    6: "⁈",
    13: "→",
    14: "↑",
    15: "⇆",
    16: "⇄",
    17: "⟂",
    18: "∞",
    19: "⟳",
    20: "⟲",
    36: "⩲",
    37: "⩱",
    38: "±",
    39: "∓",
    40: "+=",
    41: "=+",
    42: "±",
    43: "∓",
    44: "⨀",
    45: "⨁"
  };

  let diagramCounter = 0;

  function ensureDeps() {
    if (typeof Chess === "undefined") {
      console.warn("pgn.js: chess.js missing");
      return false;
    }
    return true;
  }

  function normalizeResult(s) {
    return s ? s.replace(/1\/2-1\/2/g, "½-½") : "";
  }

  function extractYear(d) {
    if (!d) return "";
    const p = d.split(".");
    return /^\d{4}$/.test(p[0]) ? p[0] : "";
  }

  function flipName(n) {
    if (!n) return "";
    const i = n.indexOf(",");
    return i === -1
      ? n.trim()
      : n.substring(i + 1).trim() + " " + n.substring(0, i).trim();
  }

  function appendText(el, t) {
    if (t) el.appendChild(document.createTextNode(t));
  }

  function createDiagram(wrapper, fen) {
    if (typeof Chessboard === "undefined") {
      console.warn("pgn.js: chessboard.js missing");
      return;
    }
    const id = "pgn-diagram-" + diagramCounter++;
    const d = document.createElement("div");
    d.className = "pgn-diagram";
    d.id = id;
    d.style.width = "340px";
    d.style.maxWidth = "100%";
    wrapper.appendChild(d);
    setTimeout(() => {
      const t = document.getElementById(id);
      if (t) {
        Chessboard(t, {
          position: fen,
          draggable: false,
          pieceTheme: PIECE_THEME_URL
        });
      }
    }, 0);
  }

  function makeCastlingUnbreakable(str) {
    // Only for display: keep SAN core ASCII for parsing
    return str
      .replace(/0-0-0|O-O-O/g, (m) => m[0] + "\u2011" + m[2] + "\u2011" + m[4])
      .replace(/0-0|O-O/g, (m) => m[0] + "\u2011" + m[2]);
  }

  class PGNGameView {
    constructor(el) {
      this.sourceEl = el;
      this.wrapper = document.createElement("div");
      this.wrapper.className = "pgn-blog-block";
      this.lastLiteralToken = null;
      this.lastWasMove = false;
      this.build();
      this.applyFigurines();
    }

    static isSANCore(t) {
      return SAN_CORE_REGEX.test(t);
    }

    static split(raw) {
      const lines = raw.split(/\r?\n/);
      const headers = [];
      const moves = [];
      let inH = true;
      for (const ln of lines) {
        const t = ln.trim();
        if (inH && t.startsWith("[") && t.endsWith("]")) headers.push(ln);
        else if (inH && t === "") inH = false;
        else {
          inH = false;
          moves.push(ln);
        }
      }
      return {
        headers,
        moveText: moves.join(" ").replace(/\s+/g, " ").trim()
      };
    }

    build() {
      const raw = this.sourceEl.textContent.trim();
      const { headers, moveText } = PGNGameView.split(raw);
      const full = (headers.length ? headers.join("\n") + "\n\n" : "") + moveText;
      const g = new Chess();
      g.load_pgn(full, { sloppy: true });
      const h = g.header();
      const res = normalizeResult(h.Result || "");
      this.header(h);
      this.parse(moveText + (res ? " " + res : ""));
      this.sourceEl.replaceWith(this.wrapper);
    }

    header(h) {
      const w =
        (h.WhiteTitle ? h.WhiteTitle + " " : "") +
        flipName(h.White || "") +
        (h.WhiteElo ? " (" + h.WhiteElo + ")" : "");
      const b =
        (h.BlackTitle ? h.BlackTitle + " " : "") +
        flipName(h.Black || "") +
        (h.BlackElo ? " (" + h.BlackElo + ")" : "");
      const y = extractYear(h.Date);
      const e = (h.Event || "") + (y ? ", " + y : "");
      const H = document.createElement("h3");
      H.appendChild(document.createTextNode(`${w} – ${b}`));
      H.appendChild(document.createElement("br"));
      H.appendChild(document.createTextNode(e));
      this.wrapper.appendChild(H);
    }

    ensure(ctx, cls) {
      if (!ctx.container) {
        const p = document.createElement("p");
        p.className = cls;
        this.wrapper.appendChild(p);
        ctx.container = p;
      }
    }

    handleSAN(tok, ctx) {
      // SAN core used for detection & chess.js (ASCII only)
      const core = tok
        .replace(/[^a-hKQRBN0-9=O0-]+$/g, "")
        .replace(/0/g, "O");

      if (!PGNGameView.isSANCore(core)) {
        appendText(ctx.container, tok + " ");
        this.lastWasMove = false;
        return null;
      }

      const base = ctx.baseHistoryLen || 0;
      const before = ctx.chess.history().length;
      const ply = base + before;
      const white = ply % 2 === 0;
      const num = Math.floor(ply / 2) + 1;

      if (ctx.type === "main") {
        if (white) appendText(ctx.container, num + "." + NBSP);
        else if (ctx.lastWasInterrupt) appendText(ctx.container, num + "..." + NBSP);
      } else {
        if (white) appendText(ctx.container, num + "." + NBSP);
        else if (ctx.lastWasInterrupt) appendText(ctx.container, num + "..." + NBSP);
      }

      ctx.prevFen = ctx.chess.fen();
      ctx.prevHistoryLen = ply;

      const mv = ctx.chess.move(core, { sloppy: true });
      if (!mv) {
        appendText(ctx.container, tok + " ");
        this.lastWasMove = false;
        return null;
      }

      ctx.lastWasInterrupt = false;
      this.lastLiteralToken = null;
      this.lastWasMove = true;

      const s = document.createElement("span");
      s.className = "pgn-move sticky-move";
      s.dataset.fen = ctx.chess.fen();
      // display uses unbreakable castling
      s.textContent = makeCastlingUnbreakable(tok) + " ";
      ctx.container.appendChild(s);
      return s;
    }

    parseComment(text, pos, ctx) {
      let i = pos;
      while (i < text.length && text[i] !== "}") i++;
      const c = text.substring(pos, i).trim();
      if (text[i] === "}") i++;

      const parts = c.split("[D]");

      for (let p = 0; p < parts.length; p++) {
        const t = parts[p].trim();

        if (ctx.type === "variation") {
          // in variation → inline
          this.ensure(ctx, "pgn-variation");
          if (t) appendText(ctx.container, " " + t);
        } else {
          // in mainline → its own paragraph
          if (t) {
            const P = document.createElement("p");
            P.className = "pgn-comment";
            appendText(P, t);
            this.wrapper.appendChild(P);
          }
          ctx.container = null;
        }

        if (p < parts.length - 1) {
          createDiagram(this.wrapper, ctx.chess.fen());
        }
      }

      // Comment is an interruption for numbering: next SAN black move prints N...
      ctx.lastWasInterrupt = true;
      this.lastLiteralToken = null;
      return i;
    }

    parse(text) {
      const main = new Chess();
      let ctx = {
        type: "main",
        chess: main,
        container: null,
        parent: null,
        lastWasInterrupt: false,
        prevFen: main.fen(),
        prevHistoryLen: 0,
        baseHistoryLen: null
      };

      let i = 0;
      while (i < text.length) {
        const ch = text[i];

        if (/\s/.test(ch)) {
          while (i < text.length && /\s/.test(text[i])) i++;
          this.ensure(ctx, ctx.type === "main" ? "pgn-mainline" : "pgn-variation");
          appendText(ctx.container, " ");
          continue;
        }

        if (ch === "(") {
          i++;
          const fen = ctx.prevFen || ctx.chess.fen();
          const hist =
            typeof ctx.prevHistoryLen === "number"
              ? ctx.prevHistoryLen
              : ctx.chess.history().length;
          ctx = {
            type: "variation",
            chess: new Chess(fen),
            container: null,
            parent: ctx,
            lastWasInterrupt: true,
            prevFen: fen,
            prevHistoryLen: hist,
            baseHistoryLen: hist
          };
          this.ensure(ctx, "pgn-variation");
          continue;
        }

        if (ch === ")") {
          i++;
          if (ctx.parent) {
            ctx = ctx.parent;
            ctx.lastWasInterrupt = true;
            ctx.container = null;
          }
          continue;
        }

        if (ch === "{") {
          i = this.parseComment(text, i + 1, ctx);
          continue;
        }

        const start = i;
        while (
          i < text.length &&
          !/\s/.test(text[i]) &&
          !"(){}".includes(text[i])
        ) {
          i++;
        }
        const tok = text.substring(start, i);
        if (!tok) continue;

        if (tok === "[D]") {
          createDiagram(this.wrapper, ctx.chess.fen());
          ctx.lastWasInterrupt = true;
          ctx.container = null;
          continue;
        }

        if (RESULT_REGEX.test(tok)) {
          this.ensure(ctx, ctx.type === "main" ? "pgn-mainline" : "pgn-variation");
          appendText(ctx.container, tok + " ");
          continue;
        }

        if (MOVE_NUMBER_REGEX.test(tok)) {
          // skip literal move numbers like "8."
          continue;
        }

        let stripped = tok
          .replace(/[^a-hKQRBN0-9=O0-]+$/g, "")
          .replace(/0/g, "O");
        const isSAN = PGNGameView.isSANCore(stripped);

        if (!isSAN) {
          // NAG: $nn
          if (tok[0] === "$") {
            const id = Number(tok.substring(1));
            if (NAG_MAP[id]) {
              this.ensure(
                ctx,
                ctx.type === "main" ? "pgn-mainline" : "pgn-variation"
              );
              appendText(ctx.container, NAG_MAP[id] + " ");
            }
            this.lastLiteralToken = tok;
            this.lastWasMove = false;
            continue;
          }

          const letters = /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(tok);
          if (EVAL_TOKEN.test(tok) && tok === this.lastLiteralToken) continue;

          if (letters) {
            if (ctx.type === "variation") {
              this.ensure(ctx, "pgn-variation");
              appendText(ctx.container, " " + tok);
            } else {
              const P = document.createElement("p");
              P.className = "pgn-comment";
              appendText(P, tok);
              this.wrapper.appendChild(P);
              ctx.container = null;
              ctx.lastWasInterrupt = false;
            }
          } else {
            this.ensure(ctx, ctx.type === "main" ? "pgn-mainline" : "pgn-variation");
            appendText(ctx.container, tok + " ");
          }

          this.lastLiteralToken = tok;
          this.lastWasMove = false;
          continue;
        }

        // SAN move
        this.ensure(ctx, ctx.type === "main" ? "pgn-mainline" : "pgn-variation");
        const sn = this.handleSAN(tok, ctx);
        if (!sn) appendText(ctx.container, makeCastlingUnbreakable(tok) + " ");
      }
    }

    applyFigurines() {
      const M = { K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘" };
      this.wrapper.querySelectorAll(".pgn-move").forEach((s) => {
        const m = s.textContent.match(/^([KQRBN])(.+?)(\s*)$/);
        if (m) s.textContent = M[m[1]] + m[2] + (m[3] || "");
      });
    }
  }

  class PGNRenderer {
    static renderAll(r) {
      (r || document)
        .querySelectorAll("pgn")
        .forEach((el) => new PGNGameView(el));
    }
    static init() {
      if (!ensureDeps()) return;
      PGNRenderer.renderAll(document);
      window.PGNRenderer = {
        run(root) {
          PGNRenderer.renderAll(root || document.body);
        }
      };
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => PGNRenderer.init());
  } else {
    PGNRenderer.init();
  }
})();
