const { z } = require('zod');

const email = z.string().trim().toLowerCase().email('Email không hợp lệ');
const password = z
    .string()
    .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
    .max(72, 'Mật khẩu quá dài');

// Login nhận cả email lẫn username thuần (VD: "admin")
const loginIdentifier = z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Tên đăng nhập phải có ít nhất 3 ký tự')
    .max(255);

const loginSchema = {
    body: z.object({
        email: loginIdentifier,
        password: z.string().min(1, 'Mật khẩu là bắt buộc'),
        rememberMe: z.boolean().optional().default(false),
    }),
};

const refreshSchema = {
    body: z.object({
        refreshToken: z.string().min(10, 'refreshToken bắt buộc'),
    }),
};

const logoutSchema = {
    body: z.object({
        refreshToken: z.string().min(10).optional(),
    }),
};

const forgotSchema = {
    body: z.object({ email }),
};

const resetSchema = {
    body: z.object({
        token: z.string().min(10, 'token bắt buộc'),
        password,
    }),
};

const changePasswordSchema = {
    body: z
        .object({
            oldPassword: z.string().min(1),
            newPassword: password,
        })
        .refine((d) => d.oldPassword !== d.newPassword, {
            message: 'Mật khẩu mới phải khác mật khẩu cũ',
            path: ['newPassword'],
        }),
};

module.exports = {
    loginSchema,
    refreshSchema,
    logoutSchema,
    forgotSchema,
    resetSchema,
    changePasswordSchema,
};
