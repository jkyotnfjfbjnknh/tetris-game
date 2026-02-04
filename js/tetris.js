// 游戏常量
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const COLORS = [
    null,
    '#FF0D72', // I
    '#0DC2FF', // J
    '#0DFF72', // L
    '#F538FF', // O
    '#FF8E0D', // S
    '#FFE138', // T
    '#3877FF'  // Z
];

// 方块形状定义
const SHAPES = [
    [],
    [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]], // I
    [[2,0,0], [2,2,2], [0,0,0]],                   // J
    [[0,0,3], [3,3,3], [0,0,0]],                   // L
    [[4,4], [4,4]],                                // O
    [[0,5,5], [5,5,0], [0,0,0]],                   // S
    [[0,6,0], [6,6,6], [0,0,0]],                   // T
    [[7,7,0], [0,7,7], [0,0,0]]                    // Z
];

// 游戏变量
let canvas, ctx, nextCanvas, nextCtx;
let board = [];
let score = 0;
let level = 1;
let lines = 0;
let gameOver = false;
let paused = false;
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let player = {
    pos: {x: 0, y: 0},
    matrix: null,
    score: 0
};

// 初始化游戏板
function createMatrix(w, h) {
    const matrix = [];
    while (h--) {
        matrix.push(new Array(w).fill(0));
    }
    return matrix;
}

// 创建随机方块
function createPiece() {
    const piece = Math.floor(Math.random() * 7) + 1;
    return SHAPES[piece].map(row => [...row]);
}

// 绘制方块
function drawMatrix(matrix, offset) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                ctx.fillStyle = COLORS[value];
                ctx.fillRect(
                    (x + offset.x) * BLOCK_SIZE,
                    (y + offset.y) * BLOCK_SIZE,
                    BLOCK_SIZE - 1,
                    BLOCK_SIZE - 1
                );
                
                // 添加方块边框效果
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.lineWidth = 1;
                ctx.strokeRect(
                    (x + offset.x) * BLOCK_SIZE,
                    (y + offset.y) * BLOCK_SIZE,
                    BLOCK_SIZE - 1,
                    BLOCK_SIZE - 1
                );
            }
        });
    });
}

// 绘制下一个方块
function drawNextPiece() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    nextCtx.fillStyle = '#111';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    if (player.nextPiece) {
        // 根据方块大小调整缩放比例
        const cellSize = Math.min(20, Math.floor(nextCanvas.width / player.nextPiece[0].length), Math.floor(nextCanvas.height / player.nextPiece.length));
        
        // 计算居中偏移
        const offsetX = (nextCanvas.width - player.nextPiece[0].length * cellSize) / 2;
        const offsetY = (nextCanvas.height - player.nextPiece.length * cellSize) / 2;
        
        player.nextPiece.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    nextCtx.fillStyle = COLORS[value];
                    nextCtx.fillRect(
                        offsetX + x * cellSize,
                        offsetY + y * cellSize,
                        cellSize - 1,
                        cellSize - 1
                    );
                    
                    nextCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                    nextCtx.lineWidth = 1;
                    nextCtx.strokeRect(
                        offsetX + x * cellSize,
                        offsetY + y * cellSize,
                        cellSize - 1,
                        cellSize - 1
                    );
                }
            });
        });
    }
}

// 检查碰撞
function collide(board, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
               (board[y + o.y] &&
                board[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

// 合并方块到面板
function merge(board, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                board[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

// 清除完整行
function sweepRows() {
    let rowCount = 0;
    outer: for (let y = board.length - 1; y >= 0; --y) {
        for (let x = 0; x < board[y].length; ++x) {
            if (board[y][x] === 0) {
                continue outer;
            }
        }

        const row = board.splice(y, 1)[0].fill(0);
        board.unshift(row);
        ++y;

        rowCount++;
    }
    
    if (rowCount > 0) {
        // 更新分数
        lines += rowCount;
        score += rowCount === 1 ? 100 * level : 
                 rowCount === 2 ? 300 * level : 
                 rowCount === 3 ? 500 * level : 
                 rowCount === 4 ? 800 * level : 0;
        
        // 更新等级（每清除10行升一级）
        level = Math.floor(lines / 10) + 1;
        dropInterval = Math.max(100, 1000 - (level - 1) * 100);
        
        // 更新显示
        document.getElementById('score').textContent = score;
        document.getElementById('level').textContent = level;
        document.getElementById('lines').textContent = lines;
    }
}

// 旋转方块
function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }

    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

// 旋转玩家方块
function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    
    while (collide(board, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

// 玩家移动
function playerMove(dir) {
    player.pos.x += dir;
    if (collide(board, player)) {
        player.pos.x -= dir;
    }
}

// 玩家下落
function playerDrop() {
    player.pos.y++;
    if (collide(board, player)) {
        player.pos.y--;
        merge(board, player);
        sweepRows();
        resetPlayer();
    }
    dropCounter = 0;
}

// 瞬间下落
function playerHardDrop() {
    while (!collide(board, player)) {
        player.pos.y++;
    }
    player.pos.y--; // 回退到最后一个有效位置
    merge(board, player);
    sweepRows();
    resetPlayer();
    dropCounter = 0;
}

// 重置玩家
function resetPlayer() {
    // 如果没有下一个方块，则创建一个
    if (!player.nextPiece) {
        player.nextPiece = createPiece();
    }
    
    // 设置当前方块为下一个方块
    player.matrix = player.nextPiece;
    player.nextPiece = createPiece(); // 生成新的下一个方块
    
    // 重置位置
    player.pos.y = 0;
    player.pos.x = Math.floor((board[0].length - player.matrix[0].length) / 2);
    
    // 绘制下一个方块预览
    drawNextPiece();
    
    // 检查游戏结束
    if (collide(board, player)) {
        gameOver = true;
        alert('游戏结束！最终得分: ' + score);
    }
}

// 绘制游戏板
function draw() {
    // 直接使用像素值绘制，而不是缩放后的网格
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制固定的游戏板背景网格
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x * BLOCK_SIZE, 0);
        ctx.lineTo(x * BLOCK_SIZE, ROWS * BLOCK_SIZE);
        ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * BLOCK_SIZE);
        ctx.lineTo(COLS * BLOCK_SIZE, y * BLOCK_SIZE);
        ctx.stroke();
    }
    
    // 绘制已固定的方块
    board.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                ctx.fillStyle = COLORS[value];
                ctx.fillRect(
                    x * BLOCK_SIZE,
                    y * BLOCK_SIZE,
                    BLOCK_SIZE - 1,
                    BLOCK_SIZE - 1
                );
                
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.lineWidth = 1;
                ctx.strokeRect(
                    x * BLOCK_SIZE,
                    y * BLOCK_SIZE,
                    BLOCK_SIZE - 1,
                    BLOCK_SIZE - 1
                );
            }
        });
    });
    
    // 绘制当前活动的方块
    if (player.matrix) {
        drawMatrix(player.matrix, player.pos);
    }
}

// 更新游戏状态
function update(time = 0) {
    if (paused || gameOver) return;
    
    const deltaTime = time - lastTime;
    lastTime = time;
    
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }
    
    draw();
    requestAnimationFrame(update);
}

// 初始化游戏
function init() {
    canvas = document.getElementById('board');
    ctx = canvas.getContext('2d');
    nextCanvas = document.getElementById('nextPiece');
    nextCtx = nextCanvas.getContext('2d');
    
    // 注意：这里不使用scale，而是直接计算像素坐标
    // 初始化游戏板
    board = createMatrix(COLS, ROWS);
    
    // 初始化分数显示
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = level;
    document.getElementById('lines').textContent = lines;
    
    // 绑定事件
    document.addEventListener('keydown', event => {
        if (paused || gameOver) return;
        
        if (event.keyCode === 80) { // P键暂停
            paused = !paused;
            if (!paused) update();
            return;
        }
        
        switch(event.keyCode) {
            case 37: // 左箭头
                playerMove(-1);
                break;
            case 39: // 右箭头
                playerMove(1);
                break;
            case 40: // 下箭头
                playerDrop();
                break;
            case 38: // 上箭头
                playerRotate(1);
                break;
            case 32: // 空格
                playerHardDrop();
                break;
        }
    });
    
    // 按钮事件
    document.getElementById('startBtn').addEventListener('click', () => {
        if (gameOver) {
            // 如果游戏结束，重置游戏
            board = createMatrix(COLS, ROWS);
            score = 0;
            level = 1;
            lines = 0;
            gameOver = false;
            
            // 更新显示
            document.getElementById('score').textContent = score;
            document.getElementById('level').textContent = level;
            document.getElementById('lines').textContent = lines;
            
            // 重置玩家
            player.nextPiece = createPiece();
            resetPlayer();
        }
        
        // 如果还没开始游戏，初始化第一个方块
        if (!player.matrix) {
            player.nextPiece = createPiece();
            resetPlayer();
        }
        
        paused = !paused;
        if (!paused) {
            lastTime = performance.now();
            update();
        }
    });
    
    document.getElementById('resetBtn').addEventListener('click', () => {
        // 重置游戏状态
        board = createMatrix(COLS, ROWS);
        score = 0;
        level = 1;
        lines = 0;
        gameOver = false;
        paused = false;
        
        // 更新显示
        document.getElementById('score').textContent = score;
        document.getElementById('level').textContent = level;
        document.getElementById('lines').textContent = lines;
        
        // 重置玩家
        player.nextPiece = createPiece();
        resetPlayer();
        
        // 如果没有暂停，开始游戏循环
        if (!paused) {
            lastTime = performance.now();
            update();
        }
    });
    
    // 初始化时不立即开始游戏，等待用户点击开始按钮
    paused = true;
    
    // 初始绘制
    draw();
}

// 触屏控制事件绑定
function bindTouchControls() {
    document.getElementById('leftBtn').addEventListener('click', () => {
        playerMove(-1);
    });
    
    document.getElementById('rightBtn').addEventListener('click', () => {
        playerMove(1);
    });
    
    document.getElementById('downBtn').addEventListener('click', () => {
        playerDrop();
    });
    
    document.getElementById('rotateBtn').addEventListener('click', () => {
        playerRotate(1);
    });
    
    document.getElementById('hardDropBtn').addEventListener('click', () => {
        playerHardDrop();
    });
}

// 页面加载完成后初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    init();
    bindTouchControls();
});