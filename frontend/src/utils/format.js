/**
 * Formatter cho tiền VND, ngày tháng và số giờ.
 */
export const fmtVND = (n) =>
    new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(Number(n || 0));

export const fmtNumber = (n, decimals = 2) =>
    new Intl.NumberFormat('vi-VN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals,
    }).format(Number(n || 0));

export const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString('vi-VN') : '';

export const fmtDateTime = (d) =>
    d ? new Date(d).toLocaleString('vi-VN') : '';

export const fmtMonth = (month, year) =>
    `${String(month).padStart(2, '0')}/${year}`;

export const fmtHours = (h) => `${fmtNumber(h, 2)} giờ`;

export const fmtPayrollStatus = (status) => {
    const map = {
        DRAFT: { label: 'Chưa duyệt', color: 'bg-amber-100 text-amber-700' },
        MANAGER_APPROVED: { label: 'Quản lý đã duyệt', color: 'bg-blue-100 text-blue-700' },
        USER_CONFIRMED: { label: 'Đã xác nhận', color: 'bg-emerald-100 text-emerald-700' },
    };
    return map[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
};
