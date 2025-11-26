var board = null;
var game = null;
var moveHistory = []; 
var currentMove = -1;
var moveNotation = []; // Stores the move objects with SAN notation

// Function to jump to a specific move index
function jumpToMove(index) {
    currentMove = index;
    displayPosition();
}

function displayPosition() {
    // Guard clause to prevent errors if the board hasn't been initialized yet.
    if (!board) {
        return;
    }
    
    if (currentMove < 0) {
        board.position('start');
    } else if (currentMove < moveHistory.length) {
        board.position(moveHistory[currentMove].fen, false);
    }

    // Update button states
    $('#startBtn').prop('disabled', currentMove < 0);
    $('#prevBtn').prop('disabled', currentMove < 0);
    
    // Disable forward buttons at the end
    $('#nextBtn').prop('disabled', currentMove === moveHistory.length - 1);
    $('#endBtn').prop('disabled', currentMove === moveHistory.length - 1);
    
    // Highlight current move
    $('#pgnDisplay a').removeClass('highlight');
    if (currentMove >= 0) {
        $(`#move-link-${currentMove}`).addClass('highlight');
    }
}

function toStart() {
    currentMove = -1;
    displayPosition();
}

function prevMove() {
    if (currentMove > -1) {
        currentMove--;
        displayPosition();
    }
}

function nextMove() {
    if (currentMove < moveHistory.length - 1) {
        currentMove++;
        displayPosition();
    }
}

function toEnd() {
    currentMove = moveHistory.length - 1;
    displayPosition();
}

$(document).ready(function() {
    if (typeof Chess === 'undefined' || typeof Chessboard === 'undefined') {
        console.error('Error: Libraries failed to load.'); 
        return;
    }

    // --- PGN Wrapper Logic REMOVED ---
    // The previous wrapper logic created a timing/reading issue.
    // We now read directly from the original <pgn id="pgn-source"> element.

    // Get the PGN content directly from the <pgn> tag.
    // Using .html() or .text() on the custom element should work, but we use .html() 
    // to capture the raw text content as intended.
    let pgnString = $('#pgn-source').html();
    
    if (pgnString) {
        pgnString = pgnString.trim();
        // Aggressively clean up potential invisible or non-standard characters
        pgnString = pgnString.replace(/[\u200B-\u200D\uFEFF]/g, '');
        pgnString = pgnString.replace(/[\u2654-\u265F]/g, '');
    }

    if (!pgnString) {
        // Now checks if the actual <pgn> tag content is empty.
        console.error('Error: No PGN found in the <pgn> source tag.');
        return;
    }

    try {
        game = new Chess();
        
        if (!game.load_pgn(pgnString, { sloppy: true })) {
            console.error("Error: PGN parsing failed.", pgnString);
            return; 
        }
    } catch (e) {
        console.error("Error initializing chess.js or loading PGN:", e);
        return; 
    }
    
    // 1. Get all moves with verbose information
    moveNotation = game.history({ verbose: true });
    
    // 2. Reset board and generate FEN history by replaying moves
    game.reset(); 
    for (let i = 0; i < moveNotation.length; i++) {
        game.move(moveNotation[i]);
        moveHistory.push({
            fen: game.fen(),
            turn: game.turn(),
            ply: game.history().length
        });
    }

    // 3. Construct PGN HTML with clickable links
    let pgnHtml = '';
    for (let i = 0; i < moveNotation.length; i++) {
        const move = moveNotation[i];

        if (i % 2 === 0) {
            // White's move: include move number
            const moveNumber = Math.floor(i / 2) + 1;
            // Use strong tag for move number for better visibility
            pgnHtml += ` <strong>${moveNumber}.</strong> `;
        }

        // Create the clickable link for the half-move
        // Added return false to the onclick to prevent default link action
        pgnHtml += `<a href="#" id="move-link-${i}" onclick="jumpToMove(${i}); return false;">${move.san}</a> `;
    }
    $('#pgnDisplay').html(pgnHtml);

    // 4. Initialize the board
    const boardConfig = {
        draggable: false,
        position: 'start',
        pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
    };
    board = Chessboard('board', boardConfig);

    // 5. Set initial display state
    toStart();
});