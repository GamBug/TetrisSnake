/**
 * Snake x Tetris Hybrid Game Core
 * 
 * Phiên bản hỗ trợ tạm dừng game và sinh đầu Rắn ngẫu nhiên trái/phải:
 * - Phím P hoặc Escape giúp tạm dừng/tiếp tục trò chơi. Màn hình tạm dừng hiển thị overlay mờ neon đẹp mắt.
 *   Khi tạm dừng, mọi thao tác di chuyển của Rắn đều bị chặn.
 * - Khi sinh Rắn mới, đầu Rắn sẽ xuất hiện ngẫu nhiên ở phía bên trái hoặc bên phải của thân.
 * - Giữ nguyên toàn bộ logic uốn éo, va chạm đóng băng lập tức, Tetris line clears, và tùy chỉnh level bắt đầu.
 * 
 * @author Antigravity AI Engine
 * @version 1.6.0
 */

class Game {
    constructor() {
        // 1. Thiết lập Canvas và Context
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Canvas & Context cho ô preview Rắn tiếp theo
        this.nextCanvas = document.getElementById('nextCanvas');
        this.nextCtx = this.nextCanvas.getContext('2d');

        // Kích thước ô lưới (Block size) tính bằng pixel
        this.blockSize = 30;
        this.cols = 10;
        this.rows = 20;

        // 2. Ma trận 2D lưu trữ các khối tĩnh (đã đóng băng ở đáy)
        this.grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));

        // 3. Khởi tạo trạng thái thực thể Rắn đang rơi (Snake)
        this.snake = {
            segments: [],
            color: '#10b981'
        };
        this.nextSnake = null;
        this.apples = [];

        // Các hình dáng/tư thế xuất hiện ngẫu nhiên ban đầu của Rắn (4 đốt)
        this.templates = [
            // Dạng thẳng ngang (I-Horizontal)
            [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }],
            // Dạng thẳng đứng (I-Vertical)
            [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 }],
            // Dạng chữ L xuôi
            [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
            // Dạng chữ L ngược
            [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 0, y: 2 }],
            // Dạng chữ Z
            [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
            // Dạng chữ S
            [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 0 }, { x: 2, y: 0 }],
            // Dạng hình vuông (O-shape / Snake quấn vòng)
            [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]
        ];

        // 4. Thiết lập hệ thống Tick Rate cho Trọng lực (Fall Timer)
        this.lastTime = 0;
        this.dropCounter = 0;
        this.dropInterval = 1000;

        // 5. Trạng thái tạm dừng game
        this.isPaused = false;

        // 6. HUD elements
        this.scoreElement = document.getElementById('score');
        this.levelElement = document.getElementById('level');
        this.linesElement = document.getElementById('lines');
        this.levelSelect = document.getElementById('levelSelect');
        this.score = 0;
        this.level = parseInt(this.levelSelect.value) || 1;
        this.lines = 0;

        // Tốc độ ban đầu dựa theo cấp độ chọn
        this.dropInterval = Math.max(150, 1000 - (this.level - 1) * 100);

        // Lắng nghe thay đổi cấp độ bắt đầu trên UI
        this.levelSelect.addEventListener('change', (e) => {
            this.resetGame(parseInt(e.target.value));
        });

        // 7. Đăng ký bộ lắng nghe sự kiện phím
        this.setupInputListener();
    }

    /**
     * Khởi chạy trò chơi và Game Loop
     */
    start() {
        this.apples = [];
        this.spawnSnake();
        for (let i = 0; i < 3; i++) {
            this.spawnApple();
        }
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }

    /**
     * Thiết lập lắng nghe sự kiện phím (inputListener)
     */
    setupInputListener() {
        window.addEventListener('keydown', (event) => {
            // Phím tạm dừng hoạt động độc lập bất kể trạng thái game
            if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') {
                event.preventDefault();
                this.isPaused = !this.isPaused;
                console.log(this.isPaused ? "Game Tạm dừng" : "Game Tiếp tục");
                return;
            }

            // Nếu game đang tạm dừng, chặn tất cả các tương tác phím khác
            if (this.isPaused) {
                return;
            }

            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
                event.preventDefault();
            }

            switch (event.key) {
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    this.slither(-1, 0);
                    break;

                case 'ArrowRight':
                case 'd':
                case 'D':
                    this.slither(1, 0);
                    break;

                case 'ArrowDown':
                case 's':
                case 'S':
                    this.slither(0, 1);
                    break;

                case 'ArrowUp':
                case 'w':
                case 'W':
                    this.slither(0, -1);
                    break;

                case ' ':
                    this.hardDrop();
                    break;
            }
        });
    }

    /**
     * Vòng lặp Game Loop chính của game
     */
    gameLoop(timestamp) {
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        // Chỉ tích lũy thời gian rơi tự do nếu game đang chạy (không tạm dừng)
        if (!this.isPaused) {
            this.dropCounter += deltaTime;

            if (this.dropCounter >= this.dropInterval) {
                this.moveDown();
                this.dropCounter = 0;
            }
        }

        // Vẫn vẽ lại màn hình để hỗ trợ overlay Tạm dừng mượt mà
        this.render();
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }

    /**
     * Di chuyển Rắn trườn (uốn éo) theo hướng (dx, dy).
     */
    slither(dx, dy) {
        if (this.snake.segments.length === 0) return;

        const head = this.snake.segments[0];
        const newHead = { x: head.x + dx, y: head.y + dy };

        // Kiểm tra điều kiện bị chặn
        if (newHead.x < 0 || newHead.x >= this.cols || newHead.y < 0) {
            console.log("Uốn éo bị chặn do đụng tường trái/phải/trên.");
            return;
        }

        let selfCollide = false;
        for (let i = 0; i < this.snake.segments.length - 1; i++) {
            if (newHead.x === this.snake.segments[i].x && newHead.y === this.snake.segments[i].y) {
                selfCollide = true;
                break;
            }
        }
        if (selfCollide) {
            console.log("Uốn éo bị chặn do đụng vào chính thân mình.");
            return;
        }

        // Kiểm tra điều kiện đóng băng lập tức
        if (newHead.y >= this.rows || this.grid[newHead.y][newHead.x] !== 0) {
            console.log("Rắn uốn éo đụng đáy/khối tĩnh -> Đóng băng lập tức tại vị trí hiện tại!");
            this.freezeSnake();
            return;
        }

        // Kiểm tra nếu ăn được Táo lơ lửng
        let ateApple = false;
        const appleIndex = this.apples.findIndex(apple => apple.x === newHead.x && apple.y === newHead.y);
        if (appleIndex !== -1) {
            ateApple = true;
            this.apples.splice(appleIndex, 1);
            this.spawnApple();
            this.score += 50 * this.level; // Cộng thêm điểm
            this.updateHUD();
            console.log("Rắn ăn Táo khi uốn éo! Độ dài tăng lên.");
        }

        // Cập nhật vị trí mới theo cơ chế trượt của Snake
        const newSegments = [newHead];
        for (let i = 1; i < this.snake.segments.length; i++) {
            newSegments.push({ x: this.snake.segments[i - 1].x, y: this.snake.segments[i - 1].y });
        }
        
        // Nếu ăn táo, giữ lại đốt đuôi cũ để tăng độ dài
        if (ateApple) {
            const lastSeg = this.snake.segments[this.snake.segments.length - 1];
            newSegments.push({ x: lastSeg.x, y: lastSeg.y });
        }
        
        this.snake.segments = newSegments;

        // Hình phạt trọng lực đối với phím đi Lên (dy === -1): Ép buộc rơi 1 ô ngay lập tức
        if (dy === -1) {
            this.moveDown();
            this.dropCounter = 0;
        }
    }

    /**
     * Di chuyển Rắn rơi xuống dưới 1 ô (Do trọng lực, di chuyển nguyên khối)
     */
    moveDown() {
        if (!this.checkCollision(0, 1)) {
            const head = this.snake.segments[0];
            const nextHeadY = head.y + 1;
            
            // Kiểm tra nếu ăn được Táo lơ lửng khi đang rơi
            const appleIndex = this.apples.findIndex(apple => apple.x === head.x && apple.y === nextHeadY);
            if (appleIndex !== -1) {
                this.apples.splice(appleIndex, 1);
                this.spawnApple();
                this.score += 50 * this.level;
                this.updateHUD();
                console.log("Rắn ăn Táo khi đang rơi tự do! Độ dài tăng lên.");

                // Lưu lại đuôi cũ trước khi dịch chuyển
                const lastSeg = this.snake.segments[this.snake.segments.length - 1];
                const oldTail = { x: lastSeg.x, y: lastSeg.y };

                // Dịch chuyển toàn bộ thân xuống 1 ô
                for (const segment of this.snake.segments) {
                    segment.y += 1;
                }
                
                // Thêm lại đốt đuôi cũ để làm rắn dài ra
                this.snake.segments.push(oldTail);
                return true;
            }

            // Di chuyển bình thường
            for (const segment of this.snake.segments) {
                segment.y += 1;
            }
            return true;
        } else {
            console.log("Rắn rơi chạm đáy/khối tĩnh -> Đóng băng lập tức tại vị trí hiện tại!");
            this.freezeSnake();
            return false;
        }
    }

    /**
     * Cho Rắn rơi thẳng xuống đáy lập tức
     */
    hardDrop() {
        while (this.moveDown()) {
            // Rơi nguyên khối xuống đáy
        }
        this.dropCounter = 0;
    }

    /**
     * Kiểm tra va chạm khi dịch chuyển nguyên khối
     */
    checkCollision(dx, dy) {
        for (const segment of this.snake.segments) {
            const nextX = segment.x + dx;
            const nextY = segment.y + dy;

            if (nextX < 0 || nextX >= this.cols || nextY >= this.rows) {
                return true;
            }

            if (nextY < 0) {
                continue;
            }

            if (this.grid[nextY][nextX] !== 0) {
                return true;
            }
        }
        return false;
    }

    /**
     * Đóng băng Rắn và xử lý ăn hàng
     */
    freezeSnake() {
        for (const segment of this.snake.segments) {
            if (segment.y >= 0 && segment.y < this.rows && segment.x >= 0 && segment.x < this.cols) {
                this.grid[segment.y][segment.x] = this.snake.color;
            }
        }

        this.clearLines();
        this.spawnSnake();
    }

    /**
     * Kiểm tra và xóa các hàng đã đầy
     */
    clearLines() {
        let linesClearedThisTurn = 0;

        for (let r = this.rows - 1; r >= 0; r--) {
            const isRowFull = this.grid[r].every(val => val !== 0);

            if (isRowFull) {
                this.grid.splice(r, 1);
                this.grid.unshift(Array(this.cols).fill(0));
                r++; 
                linesClearedThisTurn++;
            }
        }

        if (linesClearedThisTurn > 0) {
            this.lines += linesClearedThisTurn;
            const scoreMultiplier = [0, 100, 300, 500, 800];
            this.score += scoreMultiplier[Math.min(linesClearedThisTurn, 4)] * this.level;
            
            // Tính level mới dựa trên level xuất phát và số hàng đã xóa
            const startLevel = parseInt(this.levelSelect.value) || 1;
            this.level = Math.floor(this.lines / 5) + startLevel;
            
            this.dropInterval = Math.max(150, 1000 - (this.level - 1) * 100);
            this.updateHUD();
        }

        // Loại bỏ táo bị trùng với khối tĩnh (do hàng dịch chuyển xuống) và bù táo mới
        if (this.apples) {
            this.apples = this.apples.filter(apple => this.grid[apple.y][apple.x] === 0);
            while (this.apples.length < 3) {
                this.spawnApple();
            }
        }
    }

    /**
     * Tạo Rắn mới ở đỉnh với màu sắc ngẫu nhiên và hình dáng ngẫu nhiên
     */
    spawnSnake() {
        const colors = [
            '#10b981', // Xanh lá Worm
            '#3b82f6', // Xanh dương neon
            '#ef4444', // Đỏ ruby
            '#f59e0b', // Vàng hổ phách
            '#8b5cf6', // Tím thạch anh
            '#ec4899', // Hồng neon
            '#06b6d4'  // Xanh ngọc neon
        ];
        
        // Helper tạo trạng thái Rắn ngẫu nhiên (chưa dịch chuyển vào bàn chơi)
        const generateRandomSnakeState = () => {
            const template = this.templates[Math.floor(Math.random() * this.templates.length)];
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            // Sao chép sâu tọa độ template
            let segments = template.map(s => ({ ...s }));
            
            // Ngẫu nhiên đầu Rắn nằm ở đầu hoặc cuối danh sách đốt
            const isReversed = Math.random() < 0.5;
            if (isReversed) {
                segments.reverse();
            }
            
            return { segments, color };
        };

        // Khởi tạo nextSnake nếu chưa có
        if (!this.nextSnake) {
            this.nextSnake = generateRandomSnakeState();
        }

        // Lấy thông tin từ nextSnake gán cho Rắn hiện tại
        const currentSnakeState = this.nextSnake;
        this.snake.color = currentSnakeState.color;

        // Dịch chuyển Rắn hiện tại ra giữa đỉnh bàn chơi
        const minX = Math.min(...currentSnakeState.segments.map(s => s.x));
        const maxX = Math.max(...currentSnakeState.segments.map(s => s.x));
        const width = maxX - minX + 1;
        const startX = Math.floor((this.cols - width) / 2) - minX;

        this.snake.segments = currentSnakeState.segments.map(s => ({
            x: s.x + startX,
            y: s.y
        }));

        // Sinh tiếp con Rắn kế tiếp cho lượt sau
        this.nextSnake = generateRandomSnakeState();

        // Vẽ preview Rắn tiếp theo
        this.renderNext();

        // Kiểm tra kẹt khi vừa sinh ra
        let isSpawningBlocked = false;
        for (const segment of this.snake.segments) {
            if (segment.y >= 0 && segment.y < this.rows && segment.x >= 0 && segment.x < this.cols) {
                if (this.grid[segment.y][segment.x] !== 0) {
                    isSpawningBlocked = true;
                    break;
                }
            }
        }

        if (isSpawningBlocked) {
            this.gameOver();
        }
    }

    /**
     * Vẽ Rắn tiếp theo ở ô preview
     */
    renderNext() {
        if (!this.nextSnake) return;

        // Xóa sạch canvas preview
        this.nextCtx.fillStyle = '#0d1321';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);

        // Vẽ lưới ô vuông mờ trong ô preview (5x5 ô để định hình)
        const previewGridSize = 5;
        const nextBlockSize = 20;
        
        // Bắt đầu vẽ các đốt của Rắn tiếp theo
        const segments = this.nextSnake.segments;
        const minX = Math.min(...segments.map(s => s.x));
        const maxX = Math.max(...segments.map(s => s.x));
        const minY = Math.min(...segments.map(s => s.y));
        const maxY = Math.max(...segments.map(s => s.y));

        const w = maxX - minX + 1;
        const h = maxY - minY + 1;

        // Căn giữa Rắn trong canvas 120x120
        const offsetX = (this.nextCanvas.width - w * nextBlockSize) / 2 - minX * nextBlockSize;
        const offsetY = (this.nextCanvas.height - h * nextBlockSize) / 2 - minY * nextBlockSize;

        segments.forEach((segment, index) => {
            const isHead = index === 0;
            const color = isHead ? this.adjustBrightness(this.nextSnake.color, 30) : this.nextSnake.color;
            
            const px = segment.x * nextBlockSize + offsetX;
            const py = segment.y * nextBlockSize + offsetY;
            const pad = 1;

            this.nextCtx.shadowBlur = 4;
            this.nextCtx.shadowColor = color;
            this.nextCtx.fillStyle = color;
            this.nextCtx.fillRect(px + pad, py + pad, nextBlockSize - pad * 2, nextBlockSize - pad * 2);
            this.nextCtx.shadowBlur = 0;

            // Highlight viền trên và trái
            this.nextCtx.fillStyle = 'rgba(255, 255, 255, 0.25)';
            this.nextCtx.fillRect(px + pad, py + pad, nextBlockSize - pad * 2, 2);
            this.nextCtx.fillRect(px + pad, py + pad, 2, nextBlockSize - pad * 2);

            // Shadow viền dưới và phải
            this.nextCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.nextCtx.fillRect(px + pad, py + nextBlockSize - pad - 2, nextBlockSize - pad * 2, 2);
            this.nextCtx.fillRect(px + nextBlockSize - pad - 2, py + pad, 2, nextBlockSize - pad * 2);

            if (isHead) {
                // Vẽ mắt nhỏ hơn tương ứng size preview
                this.nextCtx.fillStyle = '#ffffff';
                this.nextCtx.beginPath();
                this.nextCtx.arc(px + 7, py + 8, 2, 0, Math.PI * 2);
                this.nextCtx.fill();
                this.nextCtx.beginPath();
                this.nextCtx.arc(px + 13, py + 8, 2, 0, Math.PI * 2);
                this.nextCtx.fill();

                this.nextCtx.fillStyle = '#000000';
                this.nextCtx.beginPath();
                this.nextCtx.arc(px + 7, py + 8, 0.8, 0, Math.PI * 2);
                this.nextCtx.arc(px + 13, py + 8, 0.8, 0, Math.PI * 2);
                this.nextCtx.fill();
            }
        });
    }

    /**
     * Reset game về trạng thái ban đầu
     */
    resetGame(startLevel) {
        this.grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));
        this.score = 0;
        this.lines = 0;
        
        this.level = startLevel || parseInt(this.levelSelect.value) || 1;
        this.dropInterval = Math.max(150, 1000 - (this.level - 1) * 100);
        this.dropCounter = 0;
        this.isPaused = false; // Bỏ tạm dừng khi reset
        
        this.nextSnake = null; // Reset hàng đợi preview Rắn tiếp theo
        this.apples = [];
        
        this.updateHUD();
        this.spawnSnake();

        for (let i = 0; i < 3; i++) {
            this.spawnApple();
        }
    }

    /**
     * Xử lý khi Game Over
     */
    gameOver() {
        alert("GAME OVER!\nĐiểm số của bạn: " + this.score);
        this.resetGame();
    }

    /**
     * Cập nhật các thông số lên HUD
     */
    updateHUD() {
        this.scoreElement.textContent = String(this.score).padStart(6, '0');
        this.levelElement.textContent = this.level;
        this.linesElement.textContent = this.lines;
    }

    /**
     * Vẽ toàn bộ bảng game, các khối và overlay tạm dừng lên Canvas
     */
    render() {
        // 1. Xóa sạch Canvas
        this.ctx.fillStyle = '#0d1321';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 2. Vẽ lưới kẻ ô (Grid lines)
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        this.ctx.lineWidth = 1;
        
        for (let c = 0; c <= this.cols; c++) {
            const x = c * this.blockSize;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        for (let r = 0; r <= this.rows; r++) {
            const y = r * this.blockSize;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }

        // 3. Vẽ khối tĩnh
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const color = this.grid[r][c];
                if (color !== 0) {
                    this.drawBlock(c, r, color);
                }
            }
        }

        // Vẽ các quả táo lơ lửng trên không trung
        if (this.apples) {
            this.apples.forEach(apple => {
                this.drawApple(apple.x, apple.y);
            });
        }

        // 4. Vẽ Rắn hoạt động
        this.snake.segments.forEach((segment, index) => {
            const isHead = index === 0;
            const color = isHead ? this.adjustBrightness(this.snake.color, 30) : this.snake.color;
            this.drawBlock(segment.x, segment.y, color);

            if (isHead) {
                this.drawEyes(segment.x, segment.y);
            }
        });

        // 5. Nếu game đang tạm dừng, vẽ màn hình phủ mờ neon "PAUSED"
        if (this.isPaused) {
            this.ctx.fillStyle = 'rgba(13, 19, 33, 0.75)'; // Phủ tối mờ
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Vẽ chữ PAUSED phát sáng
            this.ctx.font = 'bold 30px "Orbitron", sans-serif';
            this.ctx.fillStyle = '#60a5fa';
            this.ctx.shadowBlur = 12;
            this.ctx.shadowColor = '#3b82f6';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2 - 20);

            // Tắt shadow phát sáng để viết dòng phụ
            this.ctx.shadowBlur = 0;
            this.ctx.font = '300 13px "Outfit", sans-serif';
            this.ctx.fillStyle = '#9ca3af';
            this.ctx.fillText('Nhấn P hoặc ESC để tiếp tục', this.canvas.width / 2, this.canvas.height / 2 + 20);
        }
    }

    /**
     * Helper làm sáng màu Hex cho đầu Rắn
     */
    adjustBrightness(hex, percent) {
        let R = parseInt(hex.substring(1, 3), 16);
        let G = parseInt(hex.substring(3, 5), 16);
        let B = parseInt(hex.substring(5, 7), 16);

        R = parseInt((R * (100 + percent)) / 100);
        G = parseInt((G * (100 + percent)) / 100);
        B = parseInt((B * (100 + percent)) / 100);

        R = R < 255 ? R : 255;
        G = G < 255 ? G : 255;
        B = B < 255 ? B : 255;

        const rHex = R.toString(16).padStart(2, '0');
        const gHex = G.toString(16).padStart(2, '0');
        const bHex = B.toString(16).padStart(2, '0');

        return `#${rHex}${gHex}${bHex}`;
    }

    /**
     * Vẽ khối
     */
    drawBlock(x, y, color) {
        const px = x * this.blockSize;
        const py = y * this.blockSize;
        const pad = 1;

        this.ctx.shadowBlur = 4;
        this.ctx.shadowColor = color;

        this.ctx.fillStyle = color;
        this.ctx.fillRect(px + pad, py + pad, this.blockSize - pad * 2, this.blockSize - pad * 2);

        this.ctx.shadowBlur = 0;

        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        this.ctx.fillRect(px + pad, py + pad, this.blockSize - pad * 2, 3);
        this.ctx.fillRect(px + pad, py + pad, 3, this.blockSize - pad * 2);

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(px + pad, py + this.blockSize - pad - 3, this.blockSize - pad * 2, 3);
        this.ctx.fillRect(px + this.blockSize - pad - 3, py + pad, 3, this.blockSize - pad * 2);
    }

    /**
     * Vẽ mắt Rắn (tự động đảo mắt theo vị trí đầu của Rắn)
     */
    drawEyes(x, y) {
        const px = x * this.blockSize;
        const py = y * this.blockSize;
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(px + 10, py + 12, 3, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(px + 20, py + 12, 3, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(px + 10, py + 12, 1.2, 0, Math.PI * 2);
        this.ctx.arc(px + 20, py + 12, 1.2, 0, Math.PI * 2);
        this.ctx.fill();
    }

    /**
     * Sinh một quả táo ngẫu nhiên trên ô lưới trống không trùng Rắn hoặc khối tĩnh
     */
    spawnApple() {
        let attempts = 0;
        while (attempts < 100) {
            const rx = Math.floor(Math.random() * this.cols);
            const ry = Math.floor(Math.random() * this.rows);

            // Tránh sinh táo quá sát đỉnh đầu để người chơi kịp trở tay
            if (ry < 3) {
                attempts++;
                continue;
            }

            // Kiểm tra trùng khối tĩnh
            if (this.grid[ry][rx] !== 0) {
                attempts++;
                continue;
            }

            // Kiểm tra trùng Rắn hoạt động
            const onSnake = this.snake.segments.some(s => s.x === rx && s.y === ry);
            if (onSnake) {
                attempts++;
                continue;
            }

            // Kiểm tra trùng quả táo khác đã có
            const onApple = this.apples.some(a => a.x === rx && a.y === ry);
            if (onApple) {
                attempts++;
                continue;
            }

            this.apples.push({ x: rx, y: ry });
            break;
        }
    }

    /**
     * Vẽ quả táo dạng hình tròn phát sáng neon đơn giản
     */
    drawApple(x, y) {
        const px = x * this.blockSize;
        const py = y * this.blockSize;
        const radius = this.blockSize / 2 - 4;
        const centerX = px + this.blockSize / 2;
        const centerY = py + this.blockSize / 2;

        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#ef4444'; // Neon Red glow

        // Vẽ hình tròn màu đỏ
        this.ctx.fillStyle = '#ef4444';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.shadowBlur = 0;
    }
}

// Khởi chạy game khi trang web đã được load xong hoàn toàn
window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.start();
});
