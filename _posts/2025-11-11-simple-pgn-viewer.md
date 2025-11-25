---
layout: category-post
title:  "Simple PGN viewer"
date:   2025-11-11
categories: writing
FEN: rnbqkb1r%2Fpp3ppp%2F4pn2%2F2p5%2F3P4%2FN1P2N2%2FPP3PPP%2FR1BQKB1R+w+KQkq+-+2+7
---
<div id="myBoard" style="width: 400px"></div>
<script>
  var board = Chessboard('myBoard', {
    position: 'start',
    pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png' 
});
</script>
<style>
  #myBoard *,
  #myBoard *::before,
  #myBoard *::after {
    /* This is the key fix for the 8th square wrapping */
    box-sizing: content-box !important; 
  }
</style>
