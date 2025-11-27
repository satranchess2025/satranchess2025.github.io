// assets/js/stickyboard.js
(function () {
    "use strict";

    if (typeof Chess === "undefined" || typeof Chessboard === "undefined") {
        console.warn("stickyboard.js: chess.js or chessboard.js missing");
        return;
    }

    var PIECE_THEME_URL =
        "https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png";

    var StickyBoard = {
        board: null,
        moves: [],
        moveSpans: [],
        currentPly: -1,

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

                // Smooth animated movement
                moveSpeed: 200,
                snapSpeed: 20,
                snapbackSpeed: 20,
                appearSpeed: 150
            });
        },

        loadMoves(history) {
            this.moves = history || [];
        },

        showPosition(plyIndex) {
            // Allow -1 for "start position"
            if (plyIndex < 0) {
                this.currentPly = -1;
                this.board.position("start", true);
                this.highlightMove(-1);
                return;
            }

            this.currentPly = plyIndex;

            var temp = new Chess();
            for (var i = 0; i <= plyIndex && i < this.moves.length; i++) {
                temp.move(this.moves[i]);
            }

            // animate = true
            this.board.position(temp.fen(), true);

            this.highlightMove(plyIndex);
        },

        highlightMove(plyIndex) {
            this.moveSpans.forEach(s => s.classList.remove("sticky-move-active"));

            var span = this.moveSpans.find(
                s => parseInt(s.dataset.ply, 10) === plyIndex
            );

            if (!span) return;

            span.classList.add("sticky-move-active");

            // Always scroll the active move into view
            this.scrollMoveIntoView(span);
        },

        scrollMoveIntoView(moveSpan) {
            // Simple, robust: always smooth scroll, center vertically
            moveSpan.scrollIntoView({
                behavior: "smooth",
                block: "center",
                inline: "nearest"
            });
        },

        gotoNext() {
            if (this.currentPly + 1 < this.moves.length) {
                this.showPosition(this.currentPly + 1);
            }
        },

        gotoPrev() {
            if (this.currentPly - 1 >= 0) {
                this.showPosition(this.currentPly - 1);
            } else {
                // Go back to the initial position (before any move)
                this.showPosition(-1);
            }
        },

        activate(root) {
            this.initBoard();

            var blocks = (root || document).querySelectorAll(".pgn-blog-block");

            blocks.forEach(block => {

                // Real PGN history from pgn.js
                if (block._pgnHistory && Array.isArray(block._pgnHistory)) {
                    StickyBoard.loadMoves(block._pgnHistory);
                } else {
                    console.warn("stickyboard.js: no _pgnHistory found on block");
                    return;
                }

                this.moveSpans = [];
                var plyCounter = 0;

                var spans = block.querySelectorAll("span");

                spans.forEach(span => {
                    // Strip move number prefix like "8."
                    var textSansNumber = span.textContent
                        .replace(/^\d+\.+/, "")
                        .trim();

                    var isSAN =
                        /(O-O|O-O-O|[KQRBN♔♕♖♗♘]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?[+#]?)/.test(textSansNumber);

                    var isMoveNumber = /^\d+\./.test(span.textContent.trim());

                    if (isSAN || isMoveNumber) {
                        span.classList.add("sticky-move");
                        span.style.cursor = "pointer";

                        if (isSAN) {
                            span.dataset.ply = plyCounter;
                            this.moveSpans.push(span);
                            plyCounter++;
                        } else {
                            // Move number itself uses current plyCounter
                            span.dataset.ply = plyCounter;
                        }

                        span.addEventListener("click", () => {
                            var p = parseInt(span.dataset.ply, 10);
                            this.showPosition(p);
                        });
                    }
                });
            });

            // Keyboard navigation
            window.addEventListener("keydown", (e) => {
                // Avoid interfering with text inputs / textareas
                var tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
                if (tag === "input" || tag === "textarea") return;

                if (e.key === "ArrowRight") {
                    e.preventDefault();
                    this.gotoNext();
                }
                if (e.key === "ArrowLeft") {
                    e.preventDefault();
                    this.gotoPrev();
                }
            });
        }
    };


    // ===== CSS =====
    var style = document.createElement("style");
    style.textContent = `
#sticky-chessboard {
    position: fixed;
    bottom: 1.2rem;
    right: 1.2rem;
    width: 300px !important;
    height: 300px !important;
    z-index: 9999;
    border: 2px solid #444;
    background: #fff;
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    border-radius: 4px;
}

/* No link-like styling */
.sticky-move:hover {
    text-decoration: none !important;
}

.sticky-move-active {
    background: #ffe38a;
    border-radius: 4px;
    padding: 2px 4px;
}
`;
    document.head.appendChild(style);


    // ===== Initialize after PGNRenderer =====
    document.addEventListener("DOMContentLoaded", () => {
        if (window.PGNRenderer && window.PGNRenderer.run) {
            StickyBoard.activate(document);
        } else {
            setTimeout(() => StickyBoard.activate(document), 300);
        }
    });

})();
