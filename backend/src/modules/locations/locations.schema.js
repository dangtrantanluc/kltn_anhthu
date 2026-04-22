const { z } = require('zod');

const lat = z.coerce.number().min(-90).max(90);
const lng = z.coerce.number().min(-180).max(180);

const createLocationSchema = {
    body: z.object({
        name: z.string().trim().min(2).max(100),
        address: z.string().trim().max(255).optional().nullable(),
        latitude: lat,
        longitude: lng,
        radius_m: z.coerce.number().int().min(10).max(10000).default(100),
        is_active: z.coerce.boolean().default(true),
    }),
};

const updateLocationSchema = createLocationSchema;

module.exports = { createLocationSchema, updateLocationSchema };
