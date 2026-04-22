const { z } = require('zod');

const TYPES = z.enum([
    'ATTENDANCE_SUMMARY',
    'PAYROLL_SUMMARY',
    'HEADCOUNT',
    'LEAVE_SUMMARY',
]);

const generateSchema = z.object({
    report_type: TYPES,
    period_from: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng YYYY-MM-DD')
        .optional(),
    period_to: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng YYYY-MM-DD')
        .optional(),
    department_id: z.coerce.number().int().positive().optional().nullable(),
    file_format: z.enum(['XLSX', 'PDF']).optional().default('XLSX'),
    title: z.string().max(255).optional(),
});

module.exports = { generate: { body: generateSchema }, TYPES };
