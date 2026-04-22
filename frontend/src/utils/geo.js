/**
 * Lấy vị trí hiện tại của trình duyệt.
 *   getCurrentPosition() → Promise<{latitude, longitude, accuracy}>
 */
export const getCurrentPosition = (options = {}) =>
    new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            return reject(new Error('Trình duyệt không hỗ trợ định vị.'));
        }
        navigator.geolocation.getCurrentPosition(
            (pos) =>
                resolve({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                }),
            (err) => {
                const msg = {
                    1: 'Bạn đã từ chối cấp quyền định vị.',
                    2: 'Không xác định được vị trí hiện tại.',
                    3: 'Quá thời gian chờ lấy vị trí.',
                }[err.code] || 'Lỗi định vị.';
                reject(new Error(msg));
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0, ...options }
        );
    });

const EARTH_RADIUS_M = 6371000;
const toRad = (deg) => (deg * Math.PI) / 180;

export const distanceMeters = (lat1, lng1, lat2, lng2) => {
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
