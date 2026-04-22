const db = require('../../config/db');

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

const toMoney = (n) => parseFloat(Number(n || 0).toFixed(2));

const makeErr = (message, status = 400, code = null) => {
    const e = new Error(message);
    e.status = status;
    if (code) e.code = code;
    return e;
};

// ──────────────────────────────────────────────────────────
// Queries (scope-aware)
// ──────────────────────────────────────────────────────────

const listPayrolls = async ({ role, userId, departmentId, year, month, filterUserId, filterDepartmentId, status }) => {
    const where = ['1 = 1'];
    const params = [];

    if (role === 'USER') {
        where.push('py.user_id = ?');
        params.push(userId);
    } else if (role === 'MANAGER' && departmentId) {
        where.push('u.department_id = ?');
        params.push(departmentId);
    }

    if (filterUserId) { where.push('py.user_id = ?'); params.push(filterUserId); }
    if (filterDepartmentId) { where.push('u.department_id = ?'); params.push(filterDepartmentId); }
    if (year) { where.push('py.payroll_year = ?'); params.push(parseInt(year)); }
    if (month) { where.push('py.payroll_month = ?'); params.push(parseInt(month)); }
    if (status) { where.push('py.status = ?'); params.push(status); }

    const [rows] = await db.query(
        `SELECT py.id, py.user_id, py.payroll_month, py.payroll_year,
            py.total_actual_hours, py.total_paid_leave_hours,
            py.base_hourly_wage_snapshot, py.salary_multiplier_snapshot,
            py.total_calculated_salary, py.status,
            py.created_at, py.updated_at,
            u.full_name, u.employee_code, u.email,
            d.name AS department, d.id AS department_id,
            p.name AS position
       FROM payrolls py
       JOIN users u ON u.id = py.user_id
       LEFT JOIN departments d ON d.id = u.department_id
       LEFT JOIN positions   p ON p.id = u.position_id
      WHERE ${where.join(' AND ')}
      ORDER BY py.payroll_year DESC, py.payroll_month DESC, u.full_name ASC`,
        params
    );
    return rows;
};

const getDetail = async (id) => {
    const [rows] = await db.execute(
        `SELECT py.*,
            u.full_name, u.employee_code, u.email, u.department_id,
            d.name AS department, p.name AS position, s.shift_name
       FROM payrolls py
       JOIN users u ON u.id = py.user_id
       LEFT JOIN departments d ON d.id = u.department_id
       LEFT JOIN positions   p ON p.id = u.position_id
       LEFT JOIN shifts      s ON s.id = u.shift_id
      WHERE py.id = ? LIMIT 1`,
        [id]
    );
    return rows[0] || null;
};

const getUserDepartment = async (userId) => {
    const [rows] = await db.execute(
        'SELECT department_id FROM users WHERE id = ? LIMIT 1',
        [userId]
    );
    return rows[0]?.department_id || null;
};

// ──────────────────────────────────────────────────────────
// Core calc (pure function for testability)
// ──────────────────────────────────────────────────────────
const buildPayrollRow = ({
    user_id,
    payroll_month,
    payroll_year,
    totalActualHours,
    totalPaidLeaveHours,
    base_hourly_wage,
    salary_multiplier,
}) => {
    const baseWage = Number(base_hourly_wage || 0);
    const mult = Number(salary_multiplier || 1);
    const actual = toMoney(totalActualHours);
    const paidLeave = toMoney(totalPaidLeaveHours);
    const salary = toMoney((actual + paidLeave) * baseWage * mult);
    return {
        user_id,
        payroll_month,
        payroll_year,
        total_actual_hours: actual,
        total_paid_leave_hours: paidLeave,
        base_hourly_wage_snapshot: baseWage,
        salary_multiplier_snapshot: mult,
        total_calculated_salary: salary,
    };
};

// ──────────────────────────────────────────────────────────
// Generate — single user
// ──────────────────────────────────────────────────────────
const calculatePayrollForUser = async (conn, { user_id, payroll_month, payroll_year }) => {
    const [users] = await conn.execute(
        `SELECT id, base_hourly_wage, salary_multiplier FROM users WHERE id = ? AND is_active = 1 LIMIT 1`,
        [user_id]
    );
    if (users.length === 0) return { skipped: true, reason: 'USER_INACTIVE_OR_NOT_FOUND' };
    const u = users[0];

    // Nếu đã MANAGER_APPROVED hoặc USER_CONFIRMED → không override
    const [existRows] = await conn.execute(
        `SELECT id, status FROM payrolls
          WHERE user_id = ? AND payroll_month = ? AND payroll_year = ? LIMIT 1`,
        [user_id, payroll_month, payroll_year]
    );
    const existing = existRows[0];
    if (existing && existing.status !== 'DRAFT') {
        return { skipped: true, reason: 'ALREADY_APPROVED', payrollId: existing.id, status: existing.status };
    }

    const [attn] = await conn.execute(
        `SELECT COALESCE(SUM(total_worked_hours), 0) AS total_actual_hours
           FROM attendances
          WHERE user_id = ? AND MONTH(work_date) = ? AND YEAR(work_date) = ?
            AND status IN ('PRESENT','LATE')`,
        [user_id, payroll_month, payroll_year]
    );
    const totalActualHours = parseFloat(attn[0].total_actual_hours) || 0;

    const [leaves] = await conn.execute(
        `SELECT COUNT(*) AS leave_days
           FROM requests
          WHERE user_id = ? AND request_type = 'LEAVE_REQUEST'
            AND leave_type = 'PAID' AND status = 'APPROVED'
            AND MONTH(target_date) = ? AND YEAR(target_date) = ?`,
        [user_id, payroll_month, payroll_year]
    );
    const totalPaidLeaveHours = (Number(leaves[0].leave_days) || 0) * 8;

    const row = buildPayrollRow({
        user_id,
        payroll_month,
        payroll_year,
        totalActualHours,
        totalPaidLeaveHours,
        base_hourly_wage: u.base_hourly_wage,
        salary_multiplier: u.salary_multiplier,
    });

    const [result] = await conn.execute(
        `INSERT INTO payrolls
       (user_id, payroll_month, payroll_year, total_actual_hours, total_paid_leave_hours,
        base_hourly_wage_snapshot, salary_multiplier_snapshot, total_calculated_salary, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT')
     ON DUPLICATE KEY UPDATE
       total_actual_hours         = VALUES(total_actual_hours),
       total_paid_leave_hours     = VALUES(total_paid_leave_hours),
       base_hourly_wage_snapshot  = VALUES(base_hourly_wage_snapshot),
       salary_multiplier_snapshot = VALUES(salary_multiplier_snapshot),
       total_calculated_salary    = VALUES(total_calculated_salary),
       status                     = 'DRAFT'`,
        [
            row.user_id, row.payroll_month, row.payroll_year,
            row.total_actual_hours, row.total_paid_leave_hours,
            row.base_hourly_wage_snapshot, row.salary_multiplier_snapshot,
            row.total_calculated_salary,
        ]
    );

    return { skipped: false, payrollId: result.insertId || existing?.id, ...row };
};

// ──────────────────────────────────────────────────────────
// Generate — cả phòng ban hoặc toàn công ty (monthly)
// ──────────────────────────────────────────────────────────
const generateMonthly = async ({ payroll_month, payroll_year, department_id, user_id }) => {
    if (!payroll_month || !payroll_year) {
        throw makeErr('payroll_month và payroll_year là bắt buộc.', 400);
    }

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const where = ['u.is_active = 1'];
        const params = [];
        if (user_id) { where.push('u.id = ?'); params.push(user_id); }
        if (department_id) { where.push('u.department_id = ?'); params.push(department_id); }

        const [users] = await conn.query(
            `SELECT u.id FROM users u WHERE ${where.join(' AND ')}`,
            params
        );

        const results = { generated: 0, skipped: 0, details: [] };
        for (const u of users) {
            const r = await calculatePayrollForUser(conn, {
                user_id: u.id,
                payroll_month,
                payroll_year,
            });
            if (r.skipped) results.skipped += 1;
            else results.generated += 1;
            results.details.push({ user_id: u.id, ...r });
        }

        await conn.commit();
        return results;
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

// ──────────────────────────────────────────────────────────
// Update DRAFT (ACCOUNTANT/HR)
// ──────────────────────────────────────────────────────────
const updateDraft = async (id, patch) => {
    const existing = await getDetail(id);
    if (!existing) throw makeErr('Không tìm thấy phiếu lương.', 404);
    if (existing.status !== 'DRAFT') {
        throw makeErr('Chỉ được sửa phiếu lương ở trạng thái DRAFT.', 409);
    }

    const row = buildPayrollRow({
        user_id: existing.user_id,
        payroll_month: existing.payroll_month,
        payroll_year: existing.payroll_year,
        totalActualHours: patch.total_actual_hours ?? existing.total_actual_hours,
        totalPaidLeaveHours: patch.total_paid_leave_hours ?? existing.total_paid_leave_hours,
        base_hourly_wage: patch.base_hourly_wage_snapshot ?? existing.base_hourly_wage_snapshot,
        salary_multiplier: patch.salary_multiplier_snapshot ?? existing.salary_multiplier_snapshot,
    });

    await db.execute(
        `UPDATE payrolls SET
           total_actual_hours         = ?,
           total_paid_leave_hours     = ?,
           base_hourly_wage_snapshot  = ?,
           salary_multiplier_snapshot = ?,
           total_calculated_salary    = ?
         WHERE id = ?`,
        [
            row.total_actual_hours, row.total_paid_leave_hours,
            row.base_hourly_wage_snapshot, row.salary_multiplier_snapshot,
            row.total_calculated_salary, id,
        ]
    );
    return getDetail(id);
};

// ──────────────────────────────────────────────────────────
// Manager approve — phải cùng phòng ban, phải đang DRAFT
// ──────────────────────────────────────────────────────────
const managerApprove = async (id, { actorRole, actorDeptId }) => {
    const existing = await getDetail(id);
    if (!existing) throw makeErr('Không tìm thấy phiếu lương.', 404);
    if (existing.status !== 'DRAFT') {
        throw makeErr('Phiếu lương không ở trạng thái DRAFT.', 409);
    }
    if (actorRole === 'MANAGER' && existing.department_id !== actorDeptId) {
        throw makeErr('Bạn chỉ được duyệt phiếu lương thuộc phòng ban mình.', 403);
    }
    await db.execute(
        `UPDATE payrolls SET status = 'MANAGER_APPROVED' WHERE id = ?`,
        [id]
    );
    return getDetail(id);
};

// ──────────────────────────────────────────────────────────
// Employee confirm — phải là owner, phải MANAGER_APPROVED
// ──────────────────────────────────────────────────────────
const employeeConfirm = async (id, userId) => {
    const existing = await getDetail(id);
    if (!existing) throw makeErr('Không tìm thấy phiếu lương.', 404);
    if (existing.user_id !== userId) {
        throw makeErr('Chỉ chủ sở hữu mới có thể xác nhận.', 403);
    }
    if (existing.status !== 'MANAGER_APPROVED') {
        throw makeErr('Phiếu lương chưa được duyệt bởi quản lý.', 409);
    }
    await db.execute(
        `UPDATE payrolls SET status = 'USER_CONFIRMED' WHERE id = ?`,
        [id]
    );
    return getDetail(id);
};

module.exports = {
    // Queries
    listPayrolls,
    getDetail,
    getUserDepartment,
    // Mutations
    generateMonthly,
    updateDraft,
    managerApprove,
    employeeConfirm,
    // Pure helpers (test)
    buildPayrollRow,
};
