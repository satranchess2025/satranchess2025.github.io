// assets/js/chess/figurine.js
// Global SAN → figurine converter
// Converts all chess moves in the page to figurine notation automatically
(function () {
  "use strict";

  const PIECE_MAP = {
    K: "♔",
    Q: "♕",
    R: "♖",
    B: "♗",
    N: "♘"
  };

  // SAN regex: captures castling, piece moves like Nf3, Qxe7+, Bb5, etc.
  const SAN_REGEX = /\b(O-O-O|O-O|[KQRBN][a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|[KQRBN]x[a-h][1-8](?:=[QRBN])?[+#]?)\b/g;

  // Tags to skip completely
  const SKIP_TAGS = new Set([
    "SCRIPT",
    "STYLE",
    "CODE",
    "PRE",
    "TEXTAREA",
    "INPUT",
    "SELECT",
    "OPTION",
    "NOSCRIPT"
  ]);

  // Heuristic: skip nodes unlikely to contain SAN
  function likelySAN(text) {
    return /[KQRBN]|O-O/.test(text);
  }

  // Convert a single text node
  function convertTextNode(node) {
    const text = node.nodeValue;
    if (!text || !likelySAN(text)) return;

    const replaced = text.replace(SAN_REGEX, (match) => {
      // Leave castling unchanged
      if (match === "O-O" || match === "O-O-O") return match;

      // Prefix piece symbol if applicable
      const firstChar = match.charAt(0);
      return PIECE_MAP[firstChar] ? PIECE_MAP[firstChar] + match.slice(1) : match;
    });

    if (replaced !== text) node.nodeValue = replaced;
  }

  // Walk all text nodes in a subtree
  function walk(root) {
    if (!root) return;

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentNode;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (SKIP_TAGS.has(parent.nodeName)) return NodeFilter.FILTER_REJECT;
          if (parent.closest && parent.closest("[data-no-figurine='true']")) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      },
      false
    );

    let n;
    while ((n = walker.nextNode())) {
      convertTextNode(n);
    }
  }

  // Debounced runner for performance
  let scheduled = null;
  function schedule(root) {
    if (scheduled) return;
    scheduled = requestIdleCallback
      ? requestIdleCallback(() => { scheduled = null; walk(root || document.body); }, { timeout: 300 })
      : setTimeout(() => { scheduled = null; walk(root || document.body); }, 120);
  }

  // Initialize on DOM ready and observe mutations
  function init() {
    walk(document.body);

    const mo = new MutationObserver((mutations) => {
      schedule(document.body);
    });

    mo.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    window.ChessFigurine = {
      run: (root) => walk(root || document.body),
      disconnectObserver: () => mo.disconnect()
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
