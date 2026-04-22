const { z } = require('zod');

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng YYYY-MM-DD');
const time = z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Định dạng HH:mm')
    .optional()
    .nullable()
    .transform((v) => (v ? v.slice(0, 5) : null));

const createRequestSchema = {
    body: z
        .object({
            request_type: z.enum(['LEAVE_REQUEST', 'MISSING_PUNCH']),
            leave_type: z
                .union([z.enum(['PAID', 'UNPAID']), z.literal(''), z.null(), z.undefined()])
                .transform((v) => (v === '' || v == null ? null : v)),
            target_date: date,
            requested_check_in: time,
            requested_check_out: time,
            reason: z.string().trim().min(5, 'Lý do phải có ít nhất 5 ký tự').max(500),
        })
        .refine(
            (d) =>
                d.request_type !== 'LEAVE_REQUEST' ||
                d.leave_type,
            { message: 'LEAVE_REQUEST phải chọn leave_type', path: ['leave_type'] }
        )
        .refine(
            (d) =>
                d.request_type !== 'MISSING_PUNCH' ||
                (d.requested_check_in || d.requested_check_out),
            {
                message: 'MISSING_PUNCH phải có ít nhất giờ check-in hoặc check-out',
                path: ['requested_check_in'],
            }
        ),
};

const listRequestSchema = {
    query: z.object({
        status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
        request_type: z.enum(['LEAVE_REQUEST', 'MISSING_PUNCH']).optional(),
        scope: z.enum(['me', 'pending', 'all']).optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
    }),
};

const rejectSchema = {
    body: z.object({
        reject_reason: z.string().trim().min(3, 'Lý do từ chối bắt buộc').max(500),
    }),
};

module.exports = { createRequestSchema, listRequestSchema, rejectSchema };
