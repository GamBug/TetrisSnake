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

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        // Vận tốc văng ra ngẫu nhiên
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1; // 1 đến 4
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.gravity = 0.08; // Trọng lực nhẹ
        this.maxLife = Math.floor(Math.random() * 21) + 30; // 30-50 frames
        this.life = this.maxLife;
        this.size = Math.random() * 3 + 2; // Kích thước 2-5px
        this.alpha = 1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.life--;
        this.alpha = Math.max(0, this.life / this.maxLife);
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 6;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        const currentSize = this.size * this.alpha;
        ctx.arc(this.x, this.y, currentSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class ParticleSystem {
    constructor(ctx) {
        this.ctx = ctx;
        this.particles = [];
    }

    emit(x, y, color) {
        const count = Math.floor(Math.random() * 6) + 10; // 10-15 hạt
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.update();
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw() {
        this.particles.forEach(p => p.draw(this.ctx));
    }
}

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

        // 5. Trạng thái tạm dừng game và Cơ chế Lock Delay (Chờ khóa)
        this.gameState = 'MENU'; // Trạng thái game: MENU, PLAYING, PAUSED, GAME_OVER
        this.lockDelay = 500; // 0.5 giây
        this.lockTimeCounter = 0;
        this.isLocking = false;
        this.lockResets = 0;
        this.maxLockResets = 15;

        // 6. HUD elements
        this.scoreElement = document.getElementById('score');
        this.highScoreElement = document.getElementById('highScore');
        this.levelElement = document.getElementById('level');
        this.linesElement = document.getElementById('lines');
        this.levelSelect = document.getElementById('levelSelect');
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('snakeTetrisHighScore')) || 0;
        this.level = parseInt(this.levelSelect.value) || 1;
        this.lines = 0;

        // Trạng thái trừng phạt Wall Lock (Khóa Tường)
        this.straightDropCount = 0;
        this.isPunished = false;
        this.linesToClearToUnlock = 0;

        // Tốc độ ban đầu dựa theo cấp độ chọn
        this.dropInterval = Math.max(150, 1000 - (this.level - 1) * 100);

        // Lắng nghe thay đổi cấp độ bắt đầu trên UI
        this.levelSelect.addEventListener('change', (e) => {
            this.resetGame(parseInt(e.target.value));
        });

        // 7. Khởi tạo hệ thống hạt và đăng ký bộ lắng nghe sự kiện phím
        this.particleSystem = new ParticleSystem(this.ctx);
        this.ghostTrails = [];
        this.shakeDuration = 0;
        this.shakeMagnitude = 0;
        this.setupInputListener();
    }

    /**
     * Khởi chạy trò chơi và Game Loop
     */
    start() {
        this.gameState = 'MENU';
        this.apples = [];
        this.spawnSnake();
        for (let i = 0; i < 3; i++) {
            this.spawnApple();
        }
        this.updateHUD();
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }

    /**
     * Thiết lập lắng nghe sự kiện phím (inputListener)
     */
    setupInputListener() {
        window.addEventListener('keydown', (event) => {
            // Ngăn chặn mặc định cho phím điều hướng để tránh cuộn trang
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
                event.preventDefault();
            }

            // Nhấn Enter để bắt đầu lại từ MENU hoặc GAME_OVER
            if (event.key === 'Enter') {
                event.preventDefault();
                if (this.gameState === 'MENU') {
                    this.gameState = 'PLAYING';
                    this.lastTime = 0; // Đảm bảo delta time sạch khi bắt đầu
                    return;
                } else if (this.gameState === 'GAME_OVER') {
                    this.resetGame();
                    return;
                }
            }

            // Phím ESC hoặc P để bật/tắt PAUSED (chỉ khi đang chơi hoặc đang dừng)
            if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') {
                event.preventDefault();
                if (this.gameState === 'PLAYING') {
                    this.gameState = 'PAUSED';
                } else if (this.gameState === 'PAUSED') {
                    this.gameState = 'PLAYING';
                    this.lastTime = 0; // Đảm bảo delta time sạch khi chơi tiếp
                }
                return;
            }

            // Nếu không phải đang chơi (PLAYING), vô hiệu hóa hoàn toàn các phím di chuyển
            if (this.gameState !== 'PLAYING') {
                return;
            }

            // Thêm các biến đếm nếu chưa có để phát hiện spam nút Lên
            if (this.upSpamCount === undefined) this.upSpamCount = 0;

            switch (event.key) {
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    this.upSpamCount = 0;
                    this.slither(-1, 0);
                    break;

                case 'ArrowRight':
                case 'd':
                case 'D':
                    this.upSpamCount = 0;
                    this.slither(1, 0);
                    break;

                case 'ArrowDown':
                case 's':
                case 'S':
                    this.upSpamCount = 0;
                    this.slither(0, 1);
                    break;

                case 'ArrowUp':
                case 'w':
                case 'W':
                    this.upSpamCount++;
                    if (this.upSpamCount >= 5) {
                        this.upSpamCount = 0;
                        console.log("Phát hiện spam nút Lên 10 lần liên tục! Trừng phạt: Tự động kéo xuống đáy.");
                        this.hardDrop();
                    } else {
                        this.slither(0, -1);
                    }
                    break;

                case ' ':
                    this.upSpamCount = 0;
                    this.hardDrop();
                    break;
            }
        });
    }

    gameLoop(timestamp) {
        // Chỉ xử lý logic tính Delta Time và cập nhật trạng thái khi đang ở trạng thái PLAYING
        if (this.gameState === 'PLAYING') {
            if (!this.lastTime) this.lastTime = timestamp;
            const deltaTime = timestamp - this.lastTime;
            this.lastTime = timestamp;

            // Kiểm tra xem bề mặt dưới của Rắn có đang tiếp xúc với đáy/khối tĩnh hay không
            const isBottomTouching = this.checkCollision(0, 1);
            let justFrozen = false;

            if (isBottomTouching) {
                if (!this.isLocking) {
                    this.isLocking = true;
                    if (this.lockResets >= this.maxLockResets) {
                        this.lockTimeCounter = this.lockDelay;
                    } else {
                        this.lockTimeCounter = 0;
                    }
                } else {
                    this.lockTimeCounter += deltaTime;
                    if (this.lockTimeCounter >= this.lockDelay) {
                        console.log("Hết thời gian chờ (Lock Delay) -> Đóng băng Rắn!");
                        this.freezeSnake();
                        this.isLocking = false;
                        this.dropCounter = 0;
                        justFrozen = true;
                    }
                }
            } else {
                // Nếu không còn chạm bề mặt dưới (ví dụ người chơi trườn ra khỏi gờ rơi xuống), reset cơ chế chờ
                this.isLocking = false;
                this.lockTimeCounter = 0;
            }

            if (!justFrozen) {
                // Tích lũy thời gian rơi tự do (Trọng lực)
                this.dropCounter += deltaTime;
                if (this.dropCounter >= this.dropInterval) {
                    this.moveDown();
                    this.dropCounter = 0;
                }
            }

            // Cập nhật bóng mờ (ghost trails) sử dụng deltaTime
            if (this.ghostTrails) {
                for (let i = this.ghostTrails.length - 1; i >= 0; i--) {
                    const trail = this.ghostTrails[i];
                    trail.life -= deltaTime;
                    if (trail.life <= 0) {
                        this.ghostTrails.splice(i, 1);
                    }
                }
            }

            // Cập nhật rung màn hình (screen shake)
            if (this.shakeDuration > 0) {
                this.shakeDuration -= deltaTime;
                if (this.shakeDuration < 0) this.shakeDuration = 0;
            }
        } else {
            // Khi không ở trạng thái PLAYING, reset lastTime để tránh lỗi nhảy cóc thời gian khi chơi lại/tiếp tục
            this.lastTime = 0;
        }

        // Cập nhật hệ thống hạt (vẫn chạy ở ngoài để hiệu ứng nổ tan rã được hoàn thành mượt mà)
        this.particleSystem.update();

        this.draw();
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }

    /**
     * Di chuyển Rắn trườn (uốn éo) theo hướng (dx, dy).
     */
    slither(dx, dy) {
        if (this.snake.segments.length === 0) return;

        const head = this.snake.segments[0];
        const newHead = { x: head.x + dx, y: head.y + dy };

        // Kiểm tra điều kiện bị chặn biên hoặc khối tĩnh
        if (newHead.x < 0 || newHead.x >= this.cols || newHead.y < 0 || newHead.y >= this.rows) {
            console.log("Uốn éo bị chặn do đụng tường/đáy.");
            return;
        }

        if (this.grid[newHead.y][newHead.x] !== 0) {
            console.log("Uốn éo bị chặn do đụng khối tĩnh.");
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

            const appleCanvasX = newHead.x * this.blockSize + this.blockSize / 2;
            const appleCanvasY = newHead.y * this.blockSize + this.blockSize / 2;
            this.particleSystem.emit(appleCanvasX, appleCanvasY, '#ef4444');
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

        // Khi người chơi trườn thành công, reset lock delay để thêm thời gian ứng biến (giới hạn số lần chống Infinity exploit)
        if (this.isLocking) {
            if (this.lockResets < this.maxLockResets) {
                this.lockTimeCounter = 0;
                this.lockResets++;
            }
        }

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

                const appleCanvasX = head.x * this.blockSize + this.blockSize / 2;
                const appleCanvasY = nextHeadY * this.blockSize + this.blockSize / 2;
                this.particleSystem.emit(appleCanvasX, appleCanvasY, '#ef4444');

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
            // Không tự động freeze tức thời nữa. Việc freeze được quản lý bởi Lock Delay ở gameLoop.
            return false;
        }
    }

    /**
     * Cho Rắn rơi thẳng xuống đáy lập tức và khóa ngay lập tức (Hard Drop)
     */
    hardDrop() {
        const trailSegments = [];
        // Cho rơi nguyên khối liên tục cho đến khi chạm bề mặt dưới
        while (this.checkCollision(0, 1) === false) {
            // Ghi nhận vị trí trước khi rơi để tạo bóng mờ
            this.snake.segments.forEach(seg => {
                trailSegments.push({ x: seg.x, y: seg.y });
            });

            const head = this.snake.segments[0];
            const nextHeadY = head.y + 1;
            const appleIndex = this.apples.findIndex(apple => apple.x === head.x && apple.y === nextHeadY);
            if (appleIndex !== -1) {
                this.apples.splice(appleIndex, 1);
                this.spawnApple();
                this.score += 50 * this.level;
                this.updateHUD();

                const appleCanvasX = head.x * this.blockSize + this.blockSize / 2;
                const appleCanvasY = nextHeadY * this.blockSize + this.blockSize / 2;
                this.particleSystem.emit(appleCanvasX, appleCanvasY, '#ef4444');

                const lastSeg = this.snake.segments[this.snake.segments.length - 1];
                const oldTail = { x: lastSeg.x, y: lastSeg.y };

                for (const segment of this.snake.segments) {
                    segment.y += 1;
                }
                this.snake.segments.push(oldTail);
            } else {
                for (const segment of this.snake.segments) {
                    segment.y += 1;
                }
            }
        }

        // Đẩy thông tin bóng mờ nếu rơi được
        if (trailSegments.length > 0) {
            this.ghostTrails.push({
                segments: trailSegments,
                color: this.snake.color,
                life: 150, // Thời gian tồn tại vệt mờ: 150ms
                maxLife: 150
            });
        }
        
        // Khóa tức thì khi nhấn Space (Hard Drop)
        this.freezeSnake();
        this.dropCounter = 0;
        this.isLocking = false;

        // Kích hoạt rung màn hình (100ms, cường độ 6px)
        this.shakeDuration = 100;
        this.shakeMagnitude = 6;
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
        // Kiểm tra xem toàn bộ các đốt của rắn hiện tại có cùng tọa độ X hay không (Rắn thẳng đứng 100%)
        if (this.snake && this.snake.segments && this.snake.segments.length > 0) {
            const firstX = this.snake.segments[0].x;
            const isStraightVertical = this.snake.segments.every(seg => seg.x === firstX);
            if (isStraightVertical) {
                this.straightDropCount++;
            } else {
                this.straightDropCount = 0;
            }
            this.updateHUD();
        }

        for (const segment of this.snake.segments) {
            if (segment.y >= 0 && segment.y < this.rows && segment.x >= 0 && segment.x < this.cols) {
                this.grid[segment.y][segment.x] = this.snake.color;
            }
        }

        this.clearLines();

        // Kích hoạt hình phạt nếu đủ 3 lần xếp thẳng liên tiếp và chưa bị phạt
        if (this.straightDropCount === 3 && !this.isPunished) {
            this.triggerWallLockPunishment();
        }

        this.spawnSnake();

        // Đảm bảo reset trạng thái Lock Delay cho Rắn tiếp theo
        this.isLocking = false;
        this.lockTimeCounter = 0;
        this.lockResets = 0;
    }

    /**
     * Kích hoạt hình phạt Khóa Tường (Wall Lock) - Sinh đá nhọn cản đường
     */
    triggerWallLockPunishment() {
        this.isPunished = true;
        this.linesToClearToUnlock = 3;
        this.straightDropCount = 0;

        // Chọn ngẫu nhiên hàng Y ở giữa bản đồ (từ 8 đến 12)
        const Y = Math.floor(Math.random() * 5) + 8;

        // Chèn mỏm đá bên trái (cột 0, 1):
        // ■▢ (hàng Y-1)
        // ■■ (hàng Y)
        // ■▢ (hàng Y+1)
        this.grid[Y - 1][0] = 'ROCK';
        this.grid[Y][0] = 'ROCK';
        this.grid[Y][1] = 'ROCK';
        this.grid[Y + 1][0] = 'ROCK';

        // Chèn mỏm đá bên phải (cột 8, 9):
        // ▢■ (hàng Y-1)
        // ■■ (hàng Y)
        // ▢■ (hàng Y+1)
        this.grid[Y - 1][9] = 'ROCK';
        this.grid[Y][8] = 'ROCK';
        this.grid[Y][9] = 'ROCK';
        this.grid[Y + 1][9] = 'ROCK';

        // Dọn dẹp táo nếu trùng với vị trí mỏm đá vừa tạo
        if (this.apples) {
            this.apples = this.apples.filter(apple => this.grid[apple.y][apple.x] !== 'ROCK');
            const neededApples = 3 - this.apples.length;
            for (let i = 0; i < neededApples; i++) {
                this.spawnApple();
            }
        }
    }

    /**
     * Hóa giải hình phạt Khóa Tường - Dọn dẹp toàn bộ đá nhọn và phát hạt bụi xám
     */
    resolveWallLockPunishment() {
        this.isPunished = false;
        this.linesToClearToUnlock = 0;
        this.straightDropCount = 0;

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c] === 'ROCK') {
                    this.grid[r][c] = 0;
                    const px = c * this.blockSize + this.blockSize / 2;
                    const py = r * this.blockSize + this.blockSize / 2;
                    this.particleSystem.emit(px, py, '#888888');
                }
            }
        }
        this.updateHUD();
    }

    /**
     * Kiểm tra và xóa các hàng đã đầy
     */
    clearLines() {
        let linesClearedThisTurn = 0;

        for (let r = this.rows - 1; r >= 0; r--) {
            const isRowFull = this.grid[r].every(val => val !== 0);

            if (isRowFull) {
                // Tạo hiệu ứng hạt nổ dọc theo hàng ngang bị xóa trước khi xóa dữ liệu grid
                for (let c = 0; c < this.cols; c++) {
                    const blockColor = this.grid[r][c];
                    const px = c * this.blockSize + this.blockSize / 2;
                    const py = r * this.blockSize + this.blockSize / 2;
                    this.particleSystem.emit(px, py, blockColor === 'ROCK' ? '#888888' : blockColor);
                }

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

            // Xử lý giảm counter hóa giải hình phạt
            if (this.isPunished) {
                this.linesToClearToUnlock -= linesClearedThisTurn;
                if (this.linesToClearToUnlock <= 0) {
                    this.resolveWallLockPunishment();
                }
            }

            this.updateHUD();
        }

        // Loại bỏ táo bị trùng với khối tĩnh (do hàng dịch chuyển xuống) và bù táo mới
        if (this.apples) {
            this.apples = this.apples.filter(apple => this.grid[apple.y][apple.x] === 0);
            const neededApples = 3 - this.apples.length;
            for (let i = 0; i < neededApples; i++) {
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

    renderNext() {
        if (!this.nextSnake) return;

        // Xóa sạch canvas preview
        this.nextCtx.fillStyle = '#0d1321';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);

        // Vẽ lưới ô vuông mờ trong ô preview (5x5 ô để định hình)
        const previewGridSize = 5;
        const nextBlockSize = 16; // Vừa với canvas 90x90
        
        // Bắt đầu vẽ các đốt của Rắn tiếp theo
        const segments = this.nextSnake.segments;
        const minX = Math.min(...segments.map(s => s.x));
        const maxX = Math.max(...segments.map(s => s.x));
        const minY = Math.min(...segments.map(s => s.y));
        const maxY = Math.max(...segments.map(s => s.y));

        const w = maxX - minX + 1;
        const h = maxY - minY + 1;

        // Căn giữa Rắn trong canvas 80x80
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
                // Tự động scale vị trí và kích thước mắt theo nextBlockSize
                const eyeX1 = px + nextBlockSize * 0.35;
                const eyeX2 = px + nextBlockSize * 0.65;
                const eyeY = py + nextBlockSize * 0.4;
                const eyeRadius = nextBlockSize * 0.1;
                const pupilRadius = nextBlockSize * 0.04;

                this.nextCtx.fillStyle = '#ffffff';
                this.nextCtx.beginPath();
                this.nextCtx.arc(eyeX1, eyeY, eyeRadius, 0, Math.PI * 2);
                this.nextCtx.fill();
                this.nextCtx.beginPath();
                this.nextCtx.arc(eyeX2, eyeY, eyeRadius, 0, Math.PI * 2);
                this.nextCtx.fill();

                this.nextCtx.fillStyle = '#000000';
                this.nextCtx.beginPath();
                this.nextCtx.arc(eyeX1, eyeY, pupilRadius, 0, Math.PI * 2);
                this.nextCtx.arc(eyeX2, eyeY, pupilRadius, 0, Math.PI * 2);
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
        
        // Reset trạng thái trừng phạt Khóa Tường
        this.straightDropCount = 0;
        this.isPunished = false;
        this.linesToClearToUnlock = 0;
        this.upSpamCount = 0;

        this.level = startLevel || parseInt(this.levelSelect.value) || 1;
        this.dropInterval = Math.max(150, 1000 - (this.level - 1) * 100);
        this.dropCounter = 0;
        this.isLocking = false;
        this.lockTimeCounter = 0;
        this.lockResets = 0;
        
        this.nextSnake = null; // Reset hàng đợi preview Rắn tiếp theo
        this.apples = [];
        
        this.updateHUD();
        this.spawnSnake();

        for (let i = 0; i < 3; i++) {
            this.spawnApple();
        }
        this.gameState = 'PLAYING';
    }

    /**
     * Xử lý khi Game Over
     */
    gameOver() {
        this.gameState = 'GAME_OVER';
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('snakeTetrisHighScore', this.highScore);
            this.updateHUD();
        }
    }

    /**
     * Cập nhật các thông số lên HUD
     */
    updateHUD() {
        this.scoreElement.textContent = String(this.score).padStart(6, '0');
        if (this.highScoreElement) {
            this.highScoreElement.textContent = String(this.highScore).padStart(6, '0');
        }
        this.levelElement.textContent = this.level;
        this.linesElement.textContent = this.lines;

        // Cập nhật trạng thái hiển thị Wall Lock
        const statusEl = document.getElementById('wallLockStatus');
        const detailsEl = document.getElementById('wallLockDetails');
        
        if (statusEl && detailsEl) {
            if (this.isPunished) {
                statusEl.textContent = 'BỊ PHẠT!';
                statusEl.style.color = '#ef4444';
                statusEl.classList.add('pulse-text');
                detailsEl.textContent = `Cần xóa: ${this.linesToClearToUnlock} hàng`;
                detailsEl.style.color = '#f59e0b';
            } else {
                statusEl.textContent = 'Bình thường';
                statusEl.style.color = '#10b981';
                statusEl.classList.remove('pulse-text');
                detailsEl.textContent = `Đốt thẳng: ${this.straightDropCount}/3`;
                detailsEl.style.color = '';
            }
        }
    }

    /**
     * Vẽ toàn bộ bảng game, các khối và overlay tạm dừng lên Canvas
     */
    draw() {
        this.ctx.save();
        // Áp dụng rung màn hình (Screen Shake)
        if (this.shakeDuration > 0) {
            const dx = (Math.random() - 0.5) * this.shakeMagnitude;
            const dy = (Math.random() - 0.5) * this.shakeMagnitude;
            this.ctx.translate(dx, dy);
        }

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
                    if (color === 'ROCK') {
                        this.drawRockBlock(c, r);
                    } else {
                        this.drawBlock(c, r, color);
                    }
                }
            }
        }

        // Vẽ các quả táo lơ lửng trên không trung
        if (this.apples) {
            this.apples.forEach(apple => {
                this.drawApple(apple.x, apple.y);
            });
        }

        // Vẽ các vệt bóng mờ (Ghost Trails) của Hard Drop
        if (this.ghostTrails) {
            this.ghostTrails.forEach(trail => {
                const ratio = trail.life / trail.maxLife;
                const alpha = 0.2 * ratio;
                this.ctx.save();
                this.ctx.globalAlpha = alpha;
                this.ctx.fillStyle = trail.color;
                
                trail.segments.forEach(seg => {
                    const px = seg.x * this.blockSize;
                    const py = seg.y * this.blockSize;
                    const pad = 1;
                    this.ctx.fillRect(px + pad, py + pad, this.blockSize - pad * 2, this.blockSize - pad * 2);
                });
                this.ctx.restore();
            });
        }

        // 4. Vẽ Rắn hoạt động
        if (this.snake && this.snake.segments) {
            this.snake.segments.forEach((segment, index) => {
                const isHead = index === 0;
                const color = isHead ? this.adjustBrightness(this.snake.color, 30) : this.snake.color;
                this.drawBlock(segment.x, segment.y, color);

                if (isHead) {
                    this.drawEyes(segment.x, segment.y);
                }
            });
        }

        // Vẽ hệ thống hạt
        this.particleSystem.draw();

        // 5. Vẽ Overlay dựa trên trạng thái game
        if (this.gameState === 'MENU') {
            this.renderMenuOverlay();
        } else if (this.gameState === 'PAUSED') {
            this.renderPausedOverlay();
        } else if (this.gameState === 'GAME_OVER') {
            this.renderGameOverOverlay();
        }

        this.ctx.restore();
    }

    /**
     * Vẽ Overlay màn hình MENU
     */
    renderMenuOverlay() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; // Lớp phủ màu đen mờ (alpha = 0.7)
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Chữ Neon tiêu đề game
        this.ctx.font = 'bold 26px "Orbitron", sans-serif';
        this.ctx.fillStyle = '#10b981';
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = '#10b981';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('SNAKE X TETRIS', this.canvas.width / 2, this.canvas.height / 2 - 50);

        this.ctx.shadowBlur = 0;
        this.ctx.font = '400 13px "Outfit", sans-serif';
        this.ctx.fillStyle = '#9ca3af';
        this.ctx.fillText('Sự kết hợp độc đáo', this.canvas.width / 2, this.canvas.height / 2 - 20);

        // Hướng dẫn "NHẤN ENTER ĐỂ BẮT ĐẦU" nhấp nháy ở chính giữa
        if (Math.floor(Date.now() / 500) % 2 === 0) {
            this.ctx.font = 'bold 15px "Orbitron", sans-serif';
            this.ctx.fillStyle = '#3b82f6';
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = '#3b82f6';
            this.ctx.fillText('NHẤN ENTER ĐỂ BẮT ĐẦU', this.canvas.width / 2, this.canvas.height / 2 + 30);
            this.ctx.shadowBlur = 0;
        }

        this.ctx.font = '300 12px "Outfit", sans-serif';
        this.ctx.fillStyle = '#6b7280';
        this.ctx.fillText('Di chuyển: Phím mũi tên / WASD', this.canvas.width / 2, this.canvas.height / 2 + 70);
        this.ctx.fillText('Rơi ngay: Phím Space', this.canvas.width / 2, this.canvas.height / 2 + 90);
    }

    /**
     * Vẽ Overlay màn hình TẠM DỪNG (PAUSED)
     */
    renderPausedOverlay() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; // Lớp phủ mờ (alpha = 0.5)
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.font = 'bold 30px "Orbitron", sans-serif';
        this.ctx.fillStyle = '#60a5fa';
        this.ctx.shadowBlur = 12;
        this.ctx.shadowColor = '#3b82f6';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('TẠM DỪNG', this.canvas.width / 2, this.canvas.height / 2 - 20);

        this.ctx.shadowBlur = 0;
        this.ctx.font = '300 13px "Outfit", sans-serif';
        this.ctx.fillStyle = '#9ca3af';
        this.ctx.fillText('Nhấn ESC để tiếp tục', this.canvas.width / 2, this.canvas.height / 2 + 20);
    }

    /**
     * Vẽ Overlay màn hình GAME OVER
     */
    renderGameOverOverlay() {
        this.ctx.fillStyle = 'rgba(20, 0, 0, 0.8)'; // Lớp phủ mờ (alpha = 0.8) màu đỏ/đen
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.font = 'bold 32px "Orbitron", sans-serif';
        this.ctx.fillStyle = '#ef4444';
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = '#ef4444';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 50);

        this.ctx.shadowBlur = 0;
        this.ctx.font = '600 15px "Outfit", sans-serif';
        this.ctx.fillStyle = '#f59e0b';
        this.ctx.fillText(`Điểm số: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 - 15);
        this.ctx.fillText(`Kỷ lục: ${this.highScore}`, this.canvas.width / 2, this.canvas.height / 2 + 10);

        this.ctx.font = 'bold 15px "Orbitron", sans-serif';
        this.ctx.fillStyle = '#10b981';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#10b981';
        this.ctx.fillText('Nhấn Enter để chơi lại', this.canvas.width / 2, this.canvas.height / 2 + 55);
        this.ctx.shadowBlur = 0;
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
     * Vẽ mỏm đá nhọn ROCK với phong cách tối giản, sạch sẽ
     */
    drawRockBlock(x, y) {
        const px = x * this.blockSize;
        const py = y * this.blockSize;
        const pad = 1;

        // Hiệu ứng đổ bóng mờ màu xám đá
        this.ctx.shadowBlur = 4;
        this.ctx.shadowColor = '#4b5563';

        // Màu đá nền: Xám đậm trung tính
        this.ctx.fillStyle = '#4b5563';
        this.ctx.fillRect(px + pad, py + pad, this.blockSize - pad * 2, this.blockSize - pad * 2);

        this.ctx.shadowBlur = 0;

        // Vẽ viền trong mảnh màu xám nhạt để tạo chiều sâu khối hộp tối giản
        this.ctx.strokeStyle = '#9ca3af';
        this.ctx.lineWidth = 1.5;
        this.ctx.strokeRect(px + pad + 2, py + pad + 2, this.blockSize - pad * 2 - 4, this.blockSize - pad * 2 - 4);
        
        // Vẽ thêm một gạch chéo tinh xảo thể hiện vân nứt đá tối giản
        this.ctx.beginPath();
        this.ctx.moveTo(px + pad + 5, py + pad + 5);
        this.ctx.lineTo(px + this.blockSize - pad - 5, py + this.blockSize - pad - 5);
        this.ctx.stroke();
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
