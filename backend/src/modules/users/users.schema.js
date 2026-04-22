const { z } = require('zod');

const ROLES = ['ADMIN', 'HR', 'MANAGER', 'ACCOUNTANT', 'USER'];
const GENDERS = ['MALE', 'FEMALE', 'OTHER'];

const toNullableInt = z
    .union([z.number().int(), z.string(), z.null(), z.undefined()])
    .transform((v) => {
        if (v === null || v === undefined || v === '') return null;
        const n = typeof v === 'number' ? v : parseInt(v, 10);
        return Number.isNaN(n) ? null : n;
    });

const baseFields = {
    employee_code: z.string().trim().min(1).max(50).optional().nullable(),
    email: z.string().trim().toLowerCase().email('Email không hợp lệ'),
    full_name: z.string().trim().min(2, 'Tên phải có ít nhất 2 ký tự').max(100),
    role: z
        .string()
        .transform((s) => s.toUpperCase())
        .refine((s) => ROLES.includes(s), `Role phải thuộc: ${ROLES.join(', ')}`)
        .default('USER'),
    gender: z
        .union([z.enum(GENDERS), z.literal(''), z.null(), z.undefined()])
        .transform((v) => (v === '' || v == null ? null : v)),
    birthdate: z
        .union([z.string(), z.null(), z.undefined()])
        .transform((v) => (v === '' || v == null ? null : v)),
    department_id: toNullableInt,
    position_id: toNullableInt,
    shift_id: toNullableInt,
    manager_id: toNullableInt,
    base_hourly_wage: z.coerce.number().nonnegative().default(0),
    salary_multiplier: z.coerce.number().positive().default(1),
};

const createUserSchema = {
    body: z.object({
        ...baseFields,
        password: z
            .string()
            .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
            .max(72),
    }),
};

const updateUserSchema = {
    body: z.object({
        ...baseFields,
        is_active: z.coerce.boolean().default(true),
    }),
};

const listUsersSchema = {
    query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        q: z.string().optional(),
        department_id: z.coerce.number().int().optional(),
        role: z.string().optional(),
        is_active: z
            .union([z.literal('true'), z.literal('false'), z.undefined()])
            .optional(),
    }),
};

// PATCH /users/me - nhân viên tự sửa (whitelist)
const updateMeSchema = {
    body: z.object({
        full_name: z.string().trim().min(2).max(100).optional(),
        gender: z
            .union([z.enum(GENDERS), z.literal(''), z.null(), z.undefined()])
            .transform((v) => (v === '' || v == null ? null : v))
            .optional(),
        birthdate: z
            .union([z.string(), z.null(), z.undefined()])
            .transform((v) => (v === '' || v == null ? null : v))
            .optional(),
    }),
};

module.exports = {
    createUserSchema,
    updateUserSchema,
    listUsersSchema,
    updateMeSchema,
    ROLES,
    GENDERS,
};
