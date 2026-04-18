const bcrypt = require('bcryptjs');
const db = require('./src/config/db');

const seedData = async () => {
    try {
        console.log('🌱 Bắt đầu tạo dữ liệu mẫu toàn diện...');

        // 1. Xóa dữ liệu cũ (Dùng Cẩn Thận - Tùy chọn)
        // await db.execute('SET FOREIGN_KEY_CHECKS = 0');
        // await db.execute('TRUNCATE table payrolls');
        // await db.execute('TRUNCATE table requests');
        // await db.execute('TRUNCATE table attendances');
        // await db.execute('TRUNCATE table punch_logs');
        // await db.execute('TRUNCATE table users');
        // await db.execute('TRUNCATE table shifts');
        // await db.execute('TRUNCATE table positions');
        // await db.execute('TRUNCATE table departments');
        // await db.execute('SET FOREIGN_KEY_CHECKS = 1');

        // 2. Tạo phòng ban
        await db.execute(`INSERT IGNORE INTO departments (id, code, name) VALUES (1, 'BOD', 'Ban Giám Đốc')`);
        await db.execute(`INSERT IGNORE INTO departments (id, code, name) VALUES (2, 'HR', 'Phòng Hành Chính Nhân Sự')`);
        await db.execute(`INSERT IGNORE INTO departments (id, code, name) VALUES (3, 'IT', 'Phòng Công Nghệ Thông Tin')`);
        await db.execute(`INSERT IGNORE INTO departments (id, code, name) VALUES (4, 'SALES', 'Phòng Kinh Doanh')`);

        // 3. Tạo chức vụ
        await db.execute(`INSERT IGNORE INTO positions (id, code, name) VALUES (1, 'DIR', 'Giám Đốc')`);
        await db.execute(`INSERT IGNORE INTO positions (id, code, name) VALUES (2, 'HR_MGR', 'Trưởng Phòng HCNS')`);
        await db.execute(`INSERT IGNORE INTO positions (id, code, name) VALUES (3, 'IT_MGR', 'Trưởng Phòng IT')`);
        await db.execute(`INSERT IGNORE INTO positions (id, code, name) VALUES (4, 'DEV', 'Lập Trình Viên')`);
        await db.execute(`INSERT IGNORE INTO positions (id, code, name) VALUES (5, 'SALES_NOOB', 'Nhân viên Kinh Doanh')`);

        // 4. Tạo ca làm việc
        await db.execute(`INSERT IGNORE INTO shifts (id, shift_name, start_time, end_time, allowed_late_mins) VALUES (1, 'Ca Hành Chính', '08:00:00', '17:00:00', 5)`);
        await db.execute(`INSERT IGNORE INTO shifts (id, shift_name, start_time, end_time, allowed_late_mins) VALUES (2, 'Ca Sáng', '06:00:00', '14:00:00', 0)`);
        await db.execute(`INSERT IGNORE INTO shifts (id, shift_name, start_time, end_time, allowed_late_mins) VALUES (3, 'Ca Chiều', '14:00:00', '22:00:00', 0)`);

        // 5. Mật khẩu chung
        const passwordHash = await bcrypt.hash('123456', 12);

        // 6. Tạo Users
        const users = [
            { id: 1, empCode: 'BOD-01', email: 'admin@test.com', name: 'Trần Văn Giám Đốc', role: 'ADMIN', dept: 1, pos: 1, shift: 1, wage: 200000, multi: 1.5, manager_id: null },
            { id: 2, empCode: 'HR-01', email: 'hr@test.com', name: 'Lê Thị Trưởng Phòng', role: 'HR', dept: 2, pos: 2, shift: 1, wage: 100000, multi: 1.2, manager_id: 1 },
            { id: 3, empCode: 'IT-01', email: 'manager@test.com', name: 'Phạm Trưởng Công Nghệ', role: 'MANAGER', dept: 3, pos: 3, shift: 1, wage: 150000, multi: 1.3, manager_id: 1 },
            { id: 4, empCode: 'IT-02', email: 'user@test.com', name: 'Nguyễn Văn Lập Trình', role: 'USER', dept: 3, pos: 4, shift: 1, wage: 50000, multi: 1.0, manager_id: 3 },
            { id: 5, empCode: 'SALES-01', email: 'sales1@test.com', name: 'Đỗ Thị Bán Hàng', role: 'USER', dept: 4, pos: 5, shift: 2, wage: 30000, multi: 1.0, manager_id: 1 },
            { id: 6, empCode: 'SALES-02', email: 'sales2@test.com', name: 'Hoàng Văn Telesales', role: 'USER', dept: 4, pos: 5, shift: 3, wage: 30000, multi: 1.0, manager_id: 1 },
        ];

        for (const u of users) {
            const [check] = await db.execute(`SELECT id FROM users WHERE email = ?`, [u.email]);
            if (check.length === 0) {
                await db.execute(
                    `INSERT IGNORE INTO users (id, employee_code, email, password_hash, full_name, role, department_id, position_id, shift_id, base_hourly_wage, salary_multiplier, manager_id)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [u.id, u.empCode, u.email, passwordHash, u.name, u.role, u.dept, u.pos, u.shift, u.wage, u.multi, u.manager_id]
                );
                console.log(`✅ Đã tạo user: ${u.email} (Quyền: ${u.role})`);
            }
        }

        // Cập nhật manager cho các bộ phận
        await db.execute(`UPDATE departments SET manager_id = 1 WHERE id = 1`);
        await db.execute(`UPDATE departments SET manager_id = 2 WHERE id = 2`);
        await db.execute(`UPDATE departments SET manager_id = 3 WHERE id = 3`);

        // 7. Tạo Punch Logs & Attendances cho user 4 (Lập trình viên - user@test.com)
        // Tạo dữ liệu cho tháng 2/2026
        const days = Array.from({ length: 15 }, (_, i) => i + 1); // Từ mùng 1 đến 15 tháng 2
        for (const day of days) {
            const dateStr = `2026-02-${day.toString().padStart(2, '0')}`;
            const dateObj = new Date(dateStr);
            const dayOfWeek = dateObj.getDay(); // 0 là Chủ nhật, 6 là Thứ bảy

            if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Bỏ qua cuối tuần

            let checkIn = `${dateStr} 07:55:00`;
            let checkOut = `${dateStr} 17:05:00`;
            let latemins = 0;
            let status = 'PRESENT';

            // Tạo các kịch bản khác nhau
            if (day === 5) {
                checkIn = `${dateStr} 08:30:00`; // Trễ 30 phút
                latemins = 30;
                status = 'LATE';
            } else if (day === 8) {
                checkOut = null; // Quên check-out
                status = 'MISSING_CHECKOUT';
            } else if (day === 12) {
                status = 'ABSENT'; // Vắng mặt cả ngày
            }

            if (status !== 'ABSENT') {
                // Thêm punch log IN
                await db.execute(`INSERT IGNORE INTO punch_logs (employee_code, punch_time, punch_type, is_processed) VALUES ('IT-02', ?, 'IN', 1)`, [checkIn]);

                // Thêm punch log OUT
                if (checkOut) {
                    await db.execute(`INSERT IGNORE INTO punch_logs (employee_code, punch_time, punch_type, is_processed) VALUES ('IT-02', ?, 'OUT', 1)`, [checkOut]);
                }

                // Trực tiếp tạo attendance record để khỏi chờ cron job chạy
                await db.execute(
                    `INSERT INTO attendances (user_id, work_date, check_in_time, check_out_time, late_mins, total_worked_hours, status)
                     VALUES (4, ?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE status=VALUES(status)`,
                    [dateStr, checkIn, checkOut, latemins, checkOut ? 9 : 0, status]
                );
            }
        }
        console.log('✅ Đã tạo dữ liệu chấm công cho Lập trình viên (user@test.com) tháng 2/2026');

        // 8. Tạo Requests
        const [reqCheck] = await db.execute(`SELECT count(*) as c FROM requests`);
        if (reqCheck[0].c === 0) {
            await db.execute(`INSERT INTO requests (user_id, request_type, leave_type, target_date, reason, status, reviewer_id)
                              VALUES (4, 'LEAVE_REQUEST', 'PAID', '2026-02-12', 'Nghỉ ốm sốt virus', 'APPROVED', 3)`);

            await db.execute(`INSERT INTO requests (user_id, request_type, target_date, requested_check_in, requested_check_out, reason, status)
                              VALUES (4, 'MISSING_PUNCH', '2026-02-08', '2026-02-08 07:50:00', '2026-02-08 18:00:00', 'Quên quẹt thẻ lúc ra về', 'PENDING')`);
            console.log('✅ Đã tạo các Đơn từ mẫu');
        }

        // 9. Tạo Payrolls
        const [payCheck] = await db.execute(`SELECT count(*) as c FROM payrolls`);
        if (payCheck[0].c === 0) {
            await db.execute(`INSERT INTO payrolls (user_id, payroll_month, payroll_year, total_actual_hours, total_paid_leave_hours, base_hourly_wage_snapshot, salary_multiplier_snapshot, total_calculated_salary, status)
                               VALUES (4, 1, 2026, 160, 8, 50000, 1.0, 8400000, 'MANAGER_APPROVED')`);
            console.log('✅ Đã tạo Bảng lương mẫu tháng 1/2026');
        }

        console.log('🎉 Seed DB thành công!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Lỗi:', err);
        process.exit(1);
    }
};

seedData();
