const db = require('../../config/db');

/**
 * GET /api/dashboard/admin
 * Tổng quan cho ADMIN / HR / MANAGER:
 *  - headcount, attendance hôm nay, pending requests, quỹ lương tháng hiện tại
 *  - biểu đồ chấm công 7 ngày gần nhất
 *  - quỹ lương 6 tháng gần nhất
 */
const adminOverview = async (req, res) => {
    try {
        const role = req.user.role;
        const [deptRow] = await db.execute(
            'SELECT department_id FROM users WHERE id = ? LIMIT 1',
            [req.user.userId]
        );
        const scopeDept = role === 'MANAGER' ? deptRow[0]?.department_id || null : null;

        // Headcount
        const [[hc]] = await db.query(
            `SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active,
          SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) AS inactive
         FROM users
         ${scopeDept ? 'WHERE department_id = ?' : ''}`,
            scopeDept ? [scopeDept] : []
        );

        // Attendance hôm nay
        const [[today]] = await db.query(
            `SELECT
          SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) AS present,
          SUM(CASE WHEN a.status = 'LATE' THEN 1 ELSE 0 END) AS late,
          SUM(CASE WHEN a.status = 'ABSENT' THEN 1 ELSE 0 END) AS absent,
          SUM(CASE WHEN a.status = 'MISSING_CHECKOUT' THEN 1 ELSE 0 END) AS missing_checkout
         FROM attendances a
         JOIN users u ON u.id = a.user_id
        WHERE a.work_date = CURDATE()
          ${scopeDept ? 'AND u.department_id = ?' : ''}`,
            scopeDept ? [scopeDept] : []
        );

        // Pending requests
        const [[pend]] = await db.query(
            `SELECT COUNT(*) AS pending
         FROM requests r
         JOIN users u ON u.id = r.user_id
        WHERE r.status = 'PENDING'
          ${scopeDept ? 'AND u.department_id = ?' : ''}`,
            scopeDept ? [scopeDept] : []
        );

        // Quỹ lương tháng hiện tại
        const now = new Date();
        const [[payrollNow]] = await db.query(
            `SELECT
          COUNT(*) AS count,
          COALESCE(SUM(py.total_calculated_salary), 0) AS total_salary
         FROM payrolls py
         JOIN users u ON u.id = py.user_id
        WHERE py.payroll_year = ? AND py.payroll_month = ?
          ${scopeDept ? 'AND u.department_id = ?' : ''}`,
            scopeDept
                ? [now.getFullYear(), now.getMonth() + 1, scopeDept]
                : [now.getFullYear(), now.getMonth() + 1]
        );

        // 7 ngày gần nhất: present vs late
        const [daily] = await db.query(
            `SELECT a.work_date,
              SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) AS present,
              SUM(CASE WHEN a.status = 'LATE' THEN 1 ELSE 0 END) AS late,
              SUM(CASE WHEN a.status = 'ABSENT' THEN 1 ELSE 0 END) AS absent
         FROM attendances a
         JOIN users u ON u.id = a.user_id
        WHERE a.work_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
          ${scopeDept ? 'AND u.department_id = ?' : ''}
        GROUP BY a.work_date
        ORDER BY a.work_date`,
            scopeDept ? [scopeDept] : []
        );

        // 6 tháng gần nhất: tổng quỹ lương
        const [monthlyPayroll] = await db.query(
            `SELECT py.payroll_year AS year, py.payroll_month AS month,
              COALESCE(SUM(py.total_calculated_salary), 0) AS total_salary,
              COUNT(*) AS count
         FROM payrolls py
         JOIN users u ON u.id = py.user_id
        WHERE (py.payroll_year * 12 + py.payroll_month) >=
              (? * 12 + ?) - 5
          AND (py.payroll_year * 12 + py.payroll_month) <=
              (? * 12 + ?)
          ${scopeDept ? 'AND u.department_id = ?' : ''}
        GROUP BY py.payroll_year, py.payroll_month
        ORDER BY py.payroll_year, py.payroll_month`,
            scopeDept
                ? [now.getFullYear(), now.getMonth() + 1,
                now.getFullYear(), now.getMonth() + 1, scopeDept]
                : [now.getFullYear(), now.getMonth() + 1,
                now.getFullYear(), now.getMonth() + 1]
        );

        // Headcount theo phòng ban
        const [byDepartment] = await db.query(
            `SELECT COALESCE(d.name, 'Chưa gán') AS department,
              SUM(CASE WHEN u.is_active = 1 THEN 1 ELSE 0 END) AS active
         FROM users u
         LEFT JOIN departments d ON d.id = u.department_id
         GROUP BY d.name
         ORDER BY active DESC`
        );

        return res.json({
            scope: { role, department_id: scopeDept },
            headcount: {
                total: Number(hc.total || 0),
                active: Number(hc.active || 0),
                inactive: Number(hc.inactive || 0),
            },
            todayAttendance: {
                present: Number(today?.present || 0),
                late: Number(today?.late || 0),
                absent: Number(today?.absent || 0),
                missing_checkout: Number(today?.missing_checkout || 0),
            },
            pendingRequests: Number(pend?.pending || 0),
            payrollThisMonth: {
                count: Number(payrollNow?.count || 0),
                total_salary: Number(payrollNow?.total_salary || 0),
            },
            daily: daily.map((d) => ({
                date: d.work_date,
                present: Number(d.present || 0),
                late: Number(d.late || 0),
                absent: Number(d.absent || 0),
            })),
            monthlyPayroll: monthlyPayroll.map((m) => ({
                period: `${String(m.month).padStart(2, '0')}/${m.year}`,
                total_salary: Number(m.total_salary || 0),
                count: Number(m.count || 0),
            })),
            byDepartment: byDepartment.map((d) => ({
                department: d.department,
                active: Number(d.active || 0),
            })),
        });
    } catch (err) {
        console.error('[Dashboard] admin error:', err);
        return res.status(500).json({ message: 'Lỗi server.' });
    }
};

module.exports = { adminOverview };
