const { z } = require('zod');

const generateSchema = z.object({
    payroll_month: z.coerce.number().int().min(1).max(12),
    payroll_year: z.coerce.number().int().min(2000).max(2100),
    user_id: z.coerce.number().int().positive().optional().nullable(),
    department_id: z.coerce.number().int().positive().optional().nullable(),
});

const updateSchema = z.object({
    total_actual_hours: z.coerce.number().min(0).max(744).optional(),
    total_paid_leave_hours: z.coerce.number().min(0).max(744).optional(),
    base_hourly_wage_snapshot: z.coerce.number().min(0).optional(),
    salary_multiplier_snapshot: z.coerce.number().min(0).max(10).optional(),
});

module.exports = {
    generate: { body: generateSchema },
    update: { body: updateSchema },
};
