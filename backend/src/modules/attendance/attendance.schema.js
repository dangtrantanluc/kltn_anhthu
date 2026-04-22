const { z } = require('zod');

const punchSchema = {
    body: z.object({
        type: z.enum(['IN', 'OUT']),
        latitude: z.coerce.number().min(-90).max(90),
        longitude: z.coerce.number().min(-180).max(180),
        device_id: z.string().trim().max(100).optional(),
    }),
};

const listSchema = {
    query: z.object({
        month: z.coerce.number().int().min(1).max(12).optional(),
        year: z.coerce.number().int().min(2000).max(2100).optional(),
        user_id: z.coerce.number().int().optional(),
        department_id: z.coerce.number().int().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
    }),
};

const editSchema = {
    body: z.object({
        check_in_time: z.string().optional().nullable(),
        check_out_time: z.string().optional().nullable(),
        status: z.enum(['PRESENT', 'LATE', 'MISSING_CHECKOUT', 'ABSENT']).optional(),
        note: z.string().max(500).optional(),
    }),
};

module.exports = { punchSchema, listSchema, editSchema };
