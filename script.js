(function() {
  'use strict';

  const canvas = document.getElementById('board');
  if(!canvas || !canvas.getContext) return false;
  const ctx = canvas.getContext('2d');

  const BLACK =  1;
  const WHITE =  0;
  const OPPOSITE = [BLACK, WHITE];
  const EMPTY = Symbol();
  const CELL_NUM = 6;
  const ABBUNDANCE_RATIO = 1.2;
  const CELL_PIXEL = 480 / 8;
  const BOARD_PIXEL = CELL_PIXEL * CELL_NUM;
  const STONE_RADIUS = CELL_PIXEL * 0.4;
  const HINT_RADIUS = CELL_PIXEL * 0.05;
  const DIRECTIONS = [[-1, -1], [+0, -1], [+1, -1],
            [-1,  0],      [+1,  0],
            [-1, +1], [+0, +1], [+1, +1]];

  function createBoard() {
    ctx.fillStyle = 'green';
    ctx.fillRect(0, 0, BOARD_PIXEL, BOARD_PIXEL);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'white';
    ctx.beginPath();
    for (let i = 0; i <= CELL_NUM; i++) {
      ctx.moveTo(i * CELL_PIXEL, 0);
      ctx.lineTo(i * CELL_PIXEL, BOARD_PIXEL);
      ctx.moveTo(0          , i * CELL_PIXEL);
      ctx.lineTo(BOARD_PIXEL, i * CELL_PIXEL);
    }
    ctx.stroke();
  }

  function setText(id, text) {
    document.getElementById(id).innerHTML = text;
  }

  function drawCircle(x, y, color, radius) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc((x + 0.5) * CELL_PIXEL, (y + 0.5) * CELL_PIXEL, radius, 0, 2 * Math.PI);
    ctx.fill();
  }

  function isValidXY(x, y) {
    return (0 <= x && x < CELL_NUM && 0 <= y && y < CELL_NUM);
  }

  let othello = {
    boards: [[]],
    turn: 0,
    color: BLACK,
    black_num: 0,
    white_num: 0,

    initiation() {
      createBoard();
      for (let i = 0; i < 16; i++) {
        this.boards[0][i] = new Board(i);
      }
      this.total_case = 16;
      this.displayBoard();
    },

    isEmptyCell(x, y) {
      return (this.boards[this.turn][0][y][x] === EMPTY);
    },

    probabilityBlackStone(x, y) {
      let black_case = 0;
      const boards = this.boards[this.turn];
      for (const board of boards) {
        black_case += board[y][x] * board.probability_ratio;
      }
      return Math.round(100 * black_case / this.total_case);
    },

    canContinueGame() {
      for (let y = 0; y < CELL_NUM; y++) {
        for (let x = 0; x < CELL_NUM; x++) {
          if (this.canPutStone(x, y, BLACK)) {
            return true;
          }
        }
      }
      return false;
    },

    gameOver() {
      const black = this.black_num;
      const white = this.white_num;
      if (black > white) {
        setText('info', '黒の勝ち');
      } else if (black === white) {
        setText('info', '引き分け');
      } else if (black < white) {
        setText('info', '白の勝ち');
      }
    },

    displayBoard() {
      this.black_num = 0;
      this.white_num = 0;
      createBoard();
      for (let y = 0; y < CELL_NUM; y++) {
        for (let x = 0; x < CELL_NUM; x++) {
          if (this.canPutStone(x, y, this.color)) {
            drawCircle(x, y, 'black', HINT_RADIUS);
            continue;
          } else if (this.isEmptyCell(x, y)) {
            continue;
          }
          let probability = this.probabilityBlackStone(x, y);
          switch (probability) {
            case 0:
              drawCircle(x, y, 'white', STONE_RADIUS);
              this.white_num++;
              break;
            case 50:
              drawCircle(x, y, '#888', STONE_RADIUS);
              break;
            case 100:
              drawCircle(x, y, 'black', STONE_RADIUS);
              this.black_num++;
              break;
            default:
              ctx.font = "55px 'Times New Roman'";
              if (probability > 50) {
                ctx.fillStyle = 'black';
                this.black_num++;
              } else {
                ctx.fillStyle = 'white';
                this.white_num++;
              }
              ctx.fillText(probability, (x + 0.06) * CELL_PIXEL, (y + 0.8) * CELL_PIXEL);
          }
        }
      }
    },

    turnover() {
      if (this.canContinueGame()) {
        this.color = OPPOSITE[this.color];
        let text = (this.color === BLACK) ? '黒の番です' : '白の番です';
        setText('info', text);
      } else {
        this.gameOver();
      }
    },

    putStone(x, y) {
      if (!this.canPutStone(x, y, this.color)) return false;
      let previous_boards = this.boards[this.turn];
      this.counter = 0;
      this.total_case = 0;
         this.boards[this.turn + 1] = [];
      for (const previous_board of previous_boards) {
        if (previous_board.canPutStone(x, y, BLACK)) {
          this.generateNextBoard(x, y, previous_board, BLACK);
        }
        if (previous_board.canPutStone(x, y, WHITE)) {
          this.generateNextBoard(x, y, previous_board, WHITE);
        }
      }
      this.boards[this.turn] = [];
      this.turn++;
      this.displayBoard();
      setText('score', `黒${this.black_num} - 白${this.white_num}`);
      this.turnover();
    },

    canPutStone(x, y, color) {
      if (!this.isEmptyCell(x, y)) {
        return false;
      }
      for (const direction of DIRECTIONS) {
        let dx = direction[0];
        let dy = direction[1];
        if (isValidXY(x + 2 * dx, y + 2 * dy) &&
          !this.isEmptyCell(x + dx, y + dy) &&
          !this.isEmptyCell(x + 2 * dx, y + 2 * dy)) {
          let boards = this.boards[this.turn]
          for (const board of boards) {
            if (board.countReversibleStones(x, y, dx, dy, color) > 0) {
              return true;
            }
          }
        }
      }
      return false;
    },

    generateNextBoard(x, y, previous_board, color) {
      this.boards[this.turn + 1][this.counter] = previous_board.returnNextBoard(x, y, color);
      this.total_case += this.boards[this.turn + 1][this.counter].probability_ratio;
      this.counter++;
    }
  };

  class Board {
    constructor(num) {
      let initial_colors = [];
      const center = CELL_NUM / 2;
      for (let y = 0; y < CELL_NUM; y++) {
        this[y] = [];
        for (let x = 0; x < CELL_NUM; x++) {
          this[y][x] = EMPTY;
        }
      }
      // 初期配置される4個の石の色の組み合わせを生成
      for (let i = 0; i < 16; i++) {
        initial_colors[i] = num % 2;
        num = Math.floor(num / 2);
      }
      this[center-1][center-1] = initial_colors[0];
      this[center-1][center  ] = initial_colors[1];
      this[center  ][center-1] = initial_colors[2];
      this[center  ][center  ] = initial_colors[3];

      this.probability_ratio = 1;
    }

    canPutStone(x, y, color) {
      for (const direction of DIRECTIONS) {
        let dx = direction[0];
        let dy = direction[1];
        if (this.countReversibleStones(x, y, dx, dy, color) > 0) return true;
      }
      return false;
    }

    countReversibleStones(x, y, dx, dy, color) {
      for (let i = 0; i < CELL_NUM; i++) {
        x += dx;
        y += dy;
        if (!isValidXY(x, y) || this[y][x] === EMPTY) {
          return 0;
        } else if (this[y][x] === color) {
          return i;
        }
      }
      return 0;
    }

    returnNextBoard(x, y, color) {
      let copy = new Board(0);
      for (let y = 0; y < CELL_NUM; y++) {
        for (let x = 0; x < CELL_NUM; x++) {
          copy[y][x] = this[y][x];
        }
      }
      for (const direction of DIRECTIONS) {
        const dx = direction[0];
        const dy = direction[1];
        const num = copy.countReversibleStones(x, y, dx, dy, color);
        for (let i = 1; i <= num; i++) {
          copy[y + i * dy][x + i * dx] = color;
        }
      }
      copy[y][x] = color;
      if (othello.color === color) {
        copy.probability_ratio = this.probability_ratio * 1.2;
      } else {
        copy.probability_ratio = this.probability_ratio;
      }
      return copy;
    }
  }

  document.body.addEventListener('click', function(e) {
    const rect = canvas.getBoundingClientRect();
    const zeroX = rect.left + window.pageXOffset;
    const zeroY = rect.top + window.pageYOffset;
    const cellX = Math.floor((e.pageX - zeroX) / CELL_PIXEL);
    const cellY = Math.floor((e.pageY - zeroY) / CELL_PIXEL);
    if (!isValidXY(cellX, cellY)) return false;
    othello.putStone(cellX, cellY);
  });

  othello.initiation();
})();
