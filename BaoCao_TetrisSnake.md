# Báo Cáo Phân Tích Kỹ Thuật: Snake x Tetris Hybrid

## 1. Tổng quan dự án
- **Tên dự án:** Snake x Tetris Hybrid
- **Mô tả:** Một sự kết hợp độc đáo giữa cơ chế trườn uốn éo của trò chơi Rắn Săn Mồi (Apple Worm) và cơ chế xếp gạch rớt khối của Tetris. Người chơi điều khiển một con rắn rơi từ trên xuống, ăn táo để dài ra, và cố gắng lấp đầy các hàng ngang để ghi điểm.
- **Ngôn ngữ & Công nghệ:** HTML5 Canvas, CSS3 Vanilla, JavaScript (ES6+).
- **Kiến trúc:** Game Loop sử dụng `requestAnimationFrame` kết hợp với Time-based Animation (Delta Time) để đảm bảo tốc độ rơi đồng đều trên các tần số quét màn hình khác nhau.

## 2. Cấu trúc mã nguồn
Dự án được chia thành 3 tệp tin chính:
- **`index.html`:** Xây dựng bố cục giao diện người dùng (HUD), thẻ Canvas chính cho trò chơi, và thẻ Canvas phụ cho bảng "Next" (Xem trước Rắn kế tiếp).
- **`style.css`:** Chứa toàn bộ bộ quy tắc thiết kế mang phong cách Arcade Neon, giao diện tối (Dark Mode), hiệu ứng bóng đổ (Glow/Box Shadow), và thiết kế Responsive.
- **`game.js`:** Chứa Class `Game` đóng gói toàn bộ logic của trò chơi, từ trạng thái khởi tạo, vòng lặp game, xử lý sự kiện phím bấm, tính toán va chạm, đến cơ chế render.

## 3. Các cơ chế Cốt lõi (Core Mechanics)
### 3.1. Lưới và Khối (Grid System)
- Kích thước lưới: 10 Cột x 20 Hàng (tiêu chuẩn Tetris).
- Lưới lưu trữ dưới dạng mảng 2 chiều (`this.grid`). Giá trị `0` là ô trống, các giá trị khác là mã màu Hex của các khối tĩnh.

### 3.2. Quản lý Rắn (Snake Entity)
- Khác với Tetris thông thường (các khối gạch liền khối), Rắn là một mảng tọa độ các đốt (`this.snake.segments`). 
- **Sinh Rắn (Spawning):** Rắn mới được lấy ra từ hàng đợi (`this.nextSnake`). Hình dáng ban đầu (Thẳng, L, Z, Vuông) và màu sắc được random ngẫu nhiên. Đặc biệt, Rắn có thể xuất hiện đảo ngược đầu đuôi.
- **Di chuyển (Slither):** Khi bấm phím điều hướng, chỉ đốt đầu Rắn dịch chuyển sang ô mới, các đốt sau sẽ trượt theo vị trí cũ của đốt trước đó.
- **Rơi tự do (Gravity):** Game liên tục dịch chuyển toàn bộ tọa độ các đốt của Rắn xuống 1 ô mỗi khoảng thời gian `dropInterval` (dựa trên Cấp độ hiện tại).

### 3.3. Cơ chế Ăn Táo (Apple Mechanic)
- Táo ngẫu nhiên xuất hiện trên không trung (tối đa 3 quả).
- Khi Rắn uốn éo hoặc rơi trúng táo, chiều dài Rắn lập tức tăng thêm 1 đốt (bằng cách giữ lại vị trí của đốt đuôi cũ sau khi di chuyển).
- Việc Rắn dài ra bất ngờ giữa không trung là cơ chế tạo độ khó và bất ngờ, buộc người chơi phải thay đổi chiến thuật xếp khối liên tục.

### 3.4. Cơ chế Chờ Khóa (Lock Delay) & Soft/Hard Drop
- **Lock Delay:** Khi bề mặt dưới của Rắn chạm đáy hoặc khối tĩnh, Rắn không bị đóng băng ngay. Người chơi có 0.5s để trườn Rắn sang trái/phải trên bề mặt tiếp xúc (tương tự DAS trong Tetris).
- **Anti-Infinity Exploit:** Đã áp dụng giới hạn reset `Lock Delay` tối đa 15 lần. Nếu người chơi cố tình lạm dụng trườn qua lại để câu giờ, Rắn sẽ lập tức bị đóng băng khi hết lượt reset.
- **Hard Drop (Space):** Cho phép rắn rớt thẳng băng xuống đáy và khóa ngay lập tức. Tính toán điểm rơi dựa trên toàn bộ thân Rắn.

### 3.5. Xử lý Hàng (Line Clear)
- Khi Rắn đóng băng, nó sẽ được hợp nhất vào `this.grid`.
- Hàm `clearLines()` duyệt qua các hàng ngang, nếu hàng nào đầy thì xóa và chèn hàng trống lên trên.
- Quét và loại bỏ các quả táo bị kẹt vào khối tĩnh sau khi dịch chuyển mảng do ăn hàng, đồng thời sinh bù táo mới.

## 4. Lịch sử Rà soát lỗi và Bảo mật (Code Audit Results)
Quá trình rà soát (Code Audit) đã phát hiện và xử lý triệt để các vấn đề sau:

1. **Bug Khung hình đầu tiên (First Frame deltaTime Bug):**
   - *Lỗi:* `this.lastTime` chưa được khởi tạo khiến khung hình đầu tiên nhận `timestamp` khổng lồ, làm Rắn rơi liên tiếp nhiều ô ngay khi vừa bắt đầu.
   - *Khắc phục:* Bổ sung logic khởi tạo `this.lastTime = timestamp` ở lần gọi `gameLoop` đầu tiên.

2. **Lỗi Vòng lặp vô hạn (Infinite Loop trong clearLines):**
   - *Lỗi:* Nếu màn hình gần đầy, `spawnApple()` thất bại 100 lần, táo không được sinh ra. Hàm `clearLines` kiểm tra `while (apples.length < 3)` liên tục gọi `spawnApple` tạo thành vòng lặp vô hạn gây treo trình duyệt.
   - *Khắc phục:* Chuyển từ vòng lặp vô hạn sang giới hạn số lần gọi bù bằng `for (let i = 0; i < neededApples; i++)`.

3. **Lạm dụng Lock Delay (Infinity Exploit):**
   - *Lỗi:* Người chơi có thể spam phím Trái/Phải liên tục trên bề mặt đáy để Rắn không bao giờ bị khóa.
   - *Khắc phục:* Thêm biến đếm `lockResets` với giới hạn 15 lần (theo chuẩn Guideline của Tetris).

4. **Trùng lặp trọng lực (Gravity applied on Spawn Frame):**
   - *Lỗi:* Trong cùng một frame `gameLoop`, sau khi đóng băng Rắn cũ và gọi `spawnSnake` sinh rắn mới, bộ đếm `dropCounter` vẫn được cộng dồn, có rủi ro ép Rắn mới rơi ngay lập tức. Nếu sửa bằng cách ngắt hàm (`early return`), trò chơi sẽ ngừng lập lịch cho các khung hình tiếp theo dẫn đến hiện tượng treo game hoàn toàn (game bị đơ).
   - *Khắc phục:* Sử dụng cờ hiệu `justFrozen` để bỏ qua tính toán trọng lực trong riêng frame sinh rắn mới, giữ nguyên dòng chảy điều khiển để `requestAnimationFrame` luôn được gọi tiếp tục bình thường.

5. **Sửa đổi văn bản mô tả phím điều khiển UI:**
   - Cập nhật text từ "Xoay khối" thành "Trườn lên" do đặc thù cơ chế uốn éo của Snake.

## 5. Kết luận
Chương trình được triển khai tốt với kiến trúc Class hướng đối tượng dễ đọc. Logic của sự kết hợp hai tựa game rất trơn tru. Hệ thống đã được audit bảo vệ chặt chẽ khỏi các lỗi logic kẹt bộ nhớ, lỗi gian lận vòng lặp. Code base hoàn toàn sạch sẽ, không có nguy cơ bảo mật hiển nhiên nào liên quan tới XSS hoặc Injection (do toàn bộ state đều ở Frontend và không có API ngoài). Đã sẵn sàng cho thử nghiệm Beta.
