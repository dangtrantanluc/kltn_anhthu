const db = require('../../config/db');

const getAllPayrolls = async (userId, role, year, month, filterUserId) => {
    let query, params;
    if (['ADMIN', 'HR', 'MANAGER'].includes(role)) {
        query = `
      SELECT py.*, u.full_name, u.employee_code, d.name AS department
      FROM payrolls py
      JOIN users u ON u.id = py.user_id
      LEFT JOIN departments d ON d.id = u.department_id
      WHERE 1=1
    `;
        params = [];
        if (year) { query += ' AND py.payroll_year = ?'; params.push(year); }
        if (month) { query += ' AND py.payroll_month = ?'; params.push(month); }
        if (filterUserId) { query += ' AND py.user_id = ?'; params.push(filterUserId); }
        query += ' ORDER BY py.payroll_year DESC, py.payroll_month DESC';
    } else {
        query = `SELECT * FROM payrolls WHERE user_id = ?`;
        params = [userId];
        if (year) { query += ' AND payroll_year = ?'; params.push(year); }
        if (month) { query += ' AND payroll_month = ?'; params.push(month); }
        query += ' ORDER BY payroll_year DESC, payroll_month DESC';
    }

    const [rows] = await db.execute(query, params);
    return rows;
};

const calculatePayroll = async (user_id, payroll_month, payroll_year) => {
    const [users] = await db.execute(
        `SELECT base_hourly_wage, salary_multiplier FROM users WHERE id = ?`,
        [user_id]
    );
    if (users.length === 0) return null;
    const { base_hourly_wage, salary_multiplier } = users[0];

    const [attn] = await db.execute(
        `SELECT COALESCE(SUM(total_worked_hours), 0) AS total_actual_hours
     FROM attendances
     WHERE user_id = ? AND MONTH(work_date) = ? AND YEAR(work_date) = ?
       AND status IN ('PRESENT','LATE')`,
        [user_id, payroll_month, payroll_year]
    );
    const totalActualHours = parseFloat(attn[0].total_actual_hours) || 0;

    const [leaves] = await db.execute(
        `SELECT COUNT(*) AS leave_days
     FROM requests
     WHERE user_id = ? AND request_type = 'LEAVE_REQUEST'
       AND leave_type = 'PAID' AND status = 'APPROVED'
       AND MONTH(target_date) = ? AND YEAR(target_date) = ?`,
        [user_id, payroll_month, payroll_year]
    );
    const totalPaidLeaveHours = (leaves[0].leave_days || 0) * 8;
    const totalCalculatedSalary = parseFloat(
        ((totalActualHours + totalPaidLeaveHours) * base_hourly_wage * salary_multiplier).toFixed(2)
    );

    const [result] = await db.execute(
        `INSERT INTO payrolls
       (user_id, payroll_month, payroll_year, total_actual_hours, total_paid_leave_hours,
        base_hourly_wage_snapshot, salary_multiplier_snapshot, total_calculated_salary, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT')
     ON DUPLICATE KEY UPDATE
       total_actual_hours          = VALUES(total_actual_hours),
       total_paid_leave_hours      = VALUES(total_paid_leave_hours),
       base_hourly_wage_snapshot   = VALUES(base_hourly_wage_snapshot),
       salary_multiplier_snapshot  = VALUES(salary_multiplier_snapshot),
       total_calculated_salary     = VALUES(total_calculated_salary),
       status                      = 'DRAFT'`,
        [user_id, payroll_month, payroll_year, totalActualHours, totalPaidLeaveHours,
            base_hourly_wage, salary_multiplier, totalCalculatedSalary]
    );

    return {
        payrollId: result.insertId || null,
        totalActualHours,
        totalPaidLeaveHours,
        totalCalculatedSalary,
    };
};

const approvePayroll = async (id) => {
    await db.execute(
        `UPDATE payrolls SET status = 'MANAGER_APPROVED' WHERE id = ?`,
        [id]
    );
};

const getPayrollById = async (id) => {
    const [rows] = await db.execute(
        `SELECT user_id, status FROM payrolls WHERE id = ?`,
        [id]
    );
    return rows[0] || null;
};

const confirmPayroll = async (id) => {
    await db.execute(
        `UPDATE payrolls SET status = 'USER_CONFIRMED' WHERE id = ?`,
        [id]
    );
};

module.exports = {
    getAllPayrolls,
    calculatePayroll,
    approvePayroll,
    getPayrollById,
    confirmPayroll
};
