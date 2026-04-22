const { z } = require('zod');

const time = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Định dạng HH:mm hoặc HH:mm:ss');

const createShiftSchema = {
    body: z.object({
        shift_name: z.string().trim().min(2).max(100),
        start_time: time,
        end_time: time,
        allowed_late_mins: z.coerce.number().int().min(0).max(240).default(0),
    }),
};

const updateShiftSchema = createShiftSchema;

module.exports = { createShiftSchema, updateShiftSchema };
