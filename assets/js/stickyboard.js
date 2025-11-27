// assets/js/stickyboard.js
(function () {
    "use strict";

    if (typeof Chessboard === "undefined") {
        console.warn("stickyboard.js: chessboard.js missing");
        return;
    }

    var PIECE_THEME_URL =
        "https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png";

    var StickyBoard = {
        board: null,
        fenMap: [],
        sanSpans: [],
        currentIndex: -1,

        initBoard() {
            if (document.getElementById("sticky-chessboard")) return;

            var div = document.createElement("div");
            div.id = "sticky-chessboard";
            div.className = "sticky-chessboard";
            document.body.appendChild(div);

            this.board = Chessboard("sticky-chessboard", {
                position: "start",
                draggable: false,
                pieceTheme: PIECE_THEME_URL,
                moveSpeed: 200,
                snapSpeed: 20,
                snapbackSpeed: 20,
                appearSpeed: 150
            });
        },

        showFEN(fen) {
            this.board.position(fen, true);
        },

        highlight(i) {
            this.sanSpans.forEach(s => s.classList.remove("sticky-move-active"));

            var span = this.sanSpans[i];
            if (!span) return;

            span.classList.add("sticky-move-active");

            span.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        },

        goto(i) {
            if (i < 0 || i >= this.fenMap.length) return;
            this.currentIndex = i;
            this.showFEN(this.fenMap[i].fen);
            this.highlight(i);
        },

        next() {
            this.goto(this.currentIndex + 1);
        },

        prev() {
            this.goto(this.currentIndex - 1);
        },

        activate(root) {
            this.initBoard();

            var blocks = (root || document).querySelectorAll(".pgn-blog-block");

            blocks.forEach(block => {

                if (!block._fenMap) return;
                this.fenMap = block._fenMap;

                // Extract all SAN in text
                var p = block.querySelector(".pgn-movelist");
                var text = p.innerHTML;

                // Replace SAN with clickable span
                var withSpans = text.replace(
                    /(O-O-O|O-O|[KQRBN♔♕♖♗♘]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?[+#]?)/g,
                    function (match) {
                        return `<span class="sticky-san">${match}</span>`;
                    }
                );

                p.innerHTML = withSpans;

                this.sanSpans = Array.from(p.querySelectorAll(".sticky-san"));

                // Add click listeners
                this.sanSpans.forEach((span, i) => {
                    span.style.cursor = "pointer";
                    span.classList.add("sticky-move");

                    span.addEventListener("click", () => {
                        StickyBoard.goto(i);
                    });
                });
            });

            // Keyboard
            window.addEventListener("keydown", e => {
                if (["input", "textarea"].includes((e.target.tagName || "").toLowerCase())) return;

                if (e.key === "ArrowRight") {
                    e.preventDefault();
                    this.next();
                }
                if (e.key === "ArrowLeft") {
                    e.preventDefault();
                    this.prev();
                }
            });
        }
    };

    // CSS
    var style = document.createElement("style");
    style.textContent = `
#sticky-chessboard {
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    width: 300px !important;
    height: 300px !important;
    border: 2px solid #444;
    box-shadow: 0 4px 14px rgba(0,0,0,0.3);
    background: #fff;
    z-index: 9999;
}

.sticky-move:hover {
    text-decoration: none !important;
    cursor: pointer;
}

.sticky-move-active {
    background: #ffe38a;
    border-radius: 4px;
    padding: 2px 3px;
}
`;
    document.head.appendChild(style);

    document.addEventListener("DOMContentLoaded", () => {
        if (window.PGNRenderer) StickyBoard.activate(document);
        else setTimeout(() => StickyBoard.activate(document), 300);
    });

})();
