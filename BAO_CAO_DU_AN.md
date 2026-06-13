# BÁO CÁO PHÂN TÍCH KỸ THUẬT: DỰ ÁN SNAKE X TETRIS HYBRID

Báo cáo này được lập nhằm cung cấp cái nhìn toàn diện về cấu trúc, cơ chế hoạt động và kiến trúc của trò chơi **Snake x Tetris Hybrid**. Tài liệu này sẵn sàng để gửi cho các hệ thống AI khác đánh giá và đề xuất cải tiến.

---

## 1. Ý tưởng Cốt lõi (Core Concept)
Trò chơi là sự kết hợp độc đáo giữa **Tetris cổ điển** và cơ chế di chuyển của **Snake (Rắn săn mồi)**:
*   **Trọng lực (Tetris-style)**: Rắn liên tục rơi xuống dưới theo dạng khối cứng do trọng lực.
*   **Di chuyển uốn lượn (Snake-slither)**: Người chơi điều khiển đầu rắn bằng các phím mũi tên hoặc `W`, `A`, `S`, `D`. Trườn sang trái/phải sẽ di chuyển đầu rắn và kéo theo các đốt thân di chuyển theo cơ chế Rắn truyền thống (uốn khúc tự do).
*   **Đóng băng & Xóa hàng**: Khi rắn va chạm với đáy hoặc các khối tĩnh (grid), toàn bộ cơ thể rắn sẽ đóng băng ngay lập tức tạo thành các khối gạch tĩnh. Khi một hàng ngang được lấp đầy bởi các khối tĩnh, hàng đó sẽ biến mất và người chơi được cộng điểm.
*   **Tư thế xuất hiện ngẫu nhiên**: Mỗi con rắn xuất hiện có màu sắc ngẫu nhiên, hình dáng ngẫu nhiên (I, L, J, Z, S, O) mô phỏng các Tetromino, và vị trí đầu Rắn cũng ngẫu nhiên ở 1 trong 2 đầu.

---

## 2. Kiến trúc Hệ thống & Tệp tin
Dự án được xây dựng tối giản, hiệu năng cao bằng các công nghệ Web thuần túy:
1.  [index.html](file:///c:/Users/lucas/Documents/GitHub/TetrisSnake/index.html): Định nghĩa cấu trúc giao diện, bảng điều khiển bên (sidebar), Canvas chính vẽ màn chơi (`300x600`), Canvas phụ vẽ Rắn kế tiếp (`120x120`), và HUD hiển thị Điểm số, Cấp độ, Hàng đã xóa.
2.  [style.css](file:///c:/Users/lucas/Documents/GitHub/TetrisSnake/style.css): Định hình giao diện theo phong cách **Glassmorphism** và **Dark Neon**:
    *   Hỗ trợ Responsive (tự động chuyển sang bố cục dọc trên thiết bị di động).
    *   Sử dụng font chữ công nghệ `Orbitron` và `Outfit` từ Google Fonts.
    *   Hiệu ứng phát sáng neon (`shadow-glow`) trên Canvas và các panel.
3.  [game.js](file:///c:/Users/lucas/Documents/GitHub/TetrisSnake/game.js): Trái tim logic của trò chơi, quản lý trạng thái, xử lý va chạm, vẽ đồ họa và điều phối luồng lặp game.

---

## 3. Các Tính năng & Giải thuật Quan trọng

### A. Cấu trúc dữ liệu
*   **Grid tĩnh (`this.grid`)**: Mảng 2D kích thước `20x10` (Rows x Cols). Ô có giá trị `0` là ô trống, ô chứa mã màu hex (ví dụ: `"#10b981"`) đại diện cho khối tĩnh đã đóng băng.
*   **Rắn hoạt động (`this.snake`)**:
    *   `segments`: Mảng chứa tọa độ các đốt dạng `{x, y}`. Đốt đầu tiên `segments[0]` luôn là đầu rắn (có vẽ mắt).
    *   `color`: Mã màu hex hiện tại.

### B. Thuật toán Di chuyển
Trò chơi xử lý hai hình thức dịch chuyển khác nhau:
1.  **Rơi tự do (Trọng lực)**: Rắn rơi nguyên khối theo trục Y xuống dưới 1 ô.
    ```javascript
    moveDown() {
        if (!this.checkCollision(0, 1)) {
            for (const segment of this.snake.segments) { segment.y += 1; }
            return true;
        } else {
            this.freezeSnake();
            return false;
        }
    }
    ```
2.  **Trườn uốn khúc (Slither)**: Người chơi chủ động lái đầu rắn theo hướng `(dx, dy)`. Đầu rắn di chuyển tới vị trí mới, các đốt thân dịch chuyển tuần tự theo đốt phía trước của nó.
    *   *Hình phạt trọng lực*: Khi rắn cố gắng di chuyển ngược lên (`dy = -1`), trò chơi sẽ ngay lập tức ép rắn phải rơi xuống 1 ô (`moveDown()`) nhằm ngăn chặn việc người chơi liên tục đi lên để hoãn việc rơi xuống đáy.

### C. Cơ chế Va chạm và Đóng băng (`checkCollision` & `freezeSnake`)
*   **Va chạm**: Kiểm tra xem các đốt của Rắn có vượt quá biên (trái, phải, đáy) hoặc trùng với ô có giá trị khác `0` trên `this.grid` hay không.
*   **Đóng băng**: Lưu trữ màu sắc của các đốt rắn trực tiếp vào `this.grid` tại tọa độ tương ứng của chúng, sau đó kiểm tra xóa hàng và sinh Rắn mới.

### D. Hệ thống Tạo Rắn Ngẫu nhiên & Ô Preview
*   **Template tư thế**: Các tư thế khởi tạo được định nghĩa sẵn mô phỏng Tetromino:
    *   *I-Ngang, I-Đứng, L-Xuôi, L-Ngược, Z, S, Vuông (O)*.
*   **Spawning logic**:
    *   Mỗi khi sinh rắn mới, lấy trạng thái đã chuẩn bị từ `this.nextSnake`, căn giữa tọa độ X theo chiều rộng thực tế của hình dáng đó và gán vào `this.snake`.
    *   Ngẫu nhiên đảo ngược mảng đốt rắn để đầu rắn nằm ở một trong hai đầu ngẫu nhiên.
    *   Sinh mới `this.nextSnake` và vẽ lên ô Canvas preview thông qua `renderNext()`.

### E. Cơ chế Táo lơ lửng trên không trung (Floating Apples)
*   **Trạng thái Táo (`this.apples`)**: Mảng quản lý tọa độ của các quả táo lơ lửng (tối đa 3 quả). Táo được sinh ngẫu nhiên tại các ô trống (không có khối tĩnh, không trùng thân rắn hiện tại, không ở sát hàng đỉnh).
*   **Ăn táo khi trườn (Slither)** hoặc **rơi tự do (MoveDown)**: Khi đầu rắn di chuyển chạm vào quả táo:
    *   Táo bị ăn sẽ bị xóa, sinh ra một quả táo khác ở tọa độ trống mới.
    *   Rắn được cộng thêm điểm thưởng (`50 * level`).
    *   Độ dài rắn tăng thêm 1 đốt tại vị trí đuôi cũ (bản sao của đốt cuối cùng được giữ lại thay vì loại bỏ, khiến rắn dài ra ngay giữa không trung).
*   **Dọn dẹp táo khi dồn hàng (`clearLines`)**: Tránh trường hợp dồn dòng Tetris đè lên tọa độ của táo, game sẽ lọc và loại bỏ táo nằm đè trên các khối tĩnh sau khi dồn, sau đó tự động bù táo mới cho đủ số lượng.

---

## 4. Đánh giá Hiện trạng & Điểm mạnh
*   **Tính độc đáo**: Lối chơi lai kết hợp mượt mà giữa tự do điều hướng (uốn khúc) với áp lực không gian (Tetris grid).
*   **Visual ấn tượng**: Sử dụng canvas 2D kết hợp với hiệu ứng shadow neon và phong cách tối giản cao cấp giúp trò chơi trông hiện đại.
*   **Độ mượt mà**: Game loop tối ưu bằng `requestAnimationFrame`, độc lập tốc độ vẽ với tick-rate rơi của trọng lực.
*   **Trải nghiệm người dùng**: Có cơ chế tạm dừng (`Pause`), tùy chọn Cấp độ bắt đầu trên UI, thông tin phản hồi HUD trực quan.

---

## 5. Các Hướng Đề xuất để AI khác Đánh giá & Phát triển thêm
Nếu bạn gửi báo cáo này cho một AI khác để cải tiến, dưới đây là các câu hỏi/định hướng đề xuất:
1.  **Cân bằng Gameplay (Game Balancing)**: Làm thế nào để điều chỉnh tốc độ rơi (`dropInterval`) hợp lý hơn khi tăng cấp độ? Rắn dài 4 đốt có quá dễ/khó để lấp đầy hàng so với Tetris thông thường?
2.  **Cơ chế Quay khối (Rotation)**: Hiện tại trò chơi đã có phím `W`/`Mũi tên lên` để xoay khối, tuy nhiên do cấu trúc Rắn uốn éo linh hoạt nên cơ chế xoay cần định nghĩa rõ: Xoay toàn bộ cơ thể quanh tâm (giống Tetris) hay chỉ đơn thuần là đổi hướng đầu? AI có thể đề xuất thuật toán xoay rắn tối ưu không gây lỗi kẹt trong Grid.
3.  **Hệ thống Combo & Bảng xếp hạng**: Làm thế nào để thiết kế thêm cơ chế nhân điểm khi ăn nhiều hàng liên tục (Combos) và lưu trữ điểm cao cục bộ (Local Storage).
4.  **Cải tiến Đồ họa**: Đề xuất thuật toán vẽ thân rắn có các góc bo tròn (smooth curves) thay vì các khối vuông tách biệt để tạo cảm giác giống con giun/rắn thực sự hơn.
