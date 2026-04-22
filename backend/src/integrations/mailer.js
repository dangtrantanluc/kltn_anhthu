const nodemailer = require('nodemailer');

const isConfigured = () => !!(process.env.SMTP_HOST && process.env.SMTP_USER);

let transporter = null;

const getTransporter = () => {
    if (transporter) return transporter;
    if (!isConfigured()) return null;

    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: parseInt(process.env.SMTP_PORT) === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
        },
    });
    return transporter;
};

/**
 * sendMail({ to, subject, html, text })
 * Dev (SMTP_HOST trống): in ra console thay vì gửi thật.
 */
const sendMail = async ({ to, subject, html, text }) => {
    const from = process.env.SMTP_FROM || 'HRIS Portal <no-reply@hris.local>';
    const t = getTransporter();

    if (!t) {
        console.log('\n───────── ✉ MAILER (DEV) ─────────');
        console.log('From   :', from);
        console.log('To     :', to);
        console.log('Subject:', subject);
        console.log('Body   :', text || html);
        console.log('───────────────────────────────────\n');
        return { mocked: true };
    }

    return t.sendMail({ from, to, subject, text, html });
};

module.exports = { sendMail };
