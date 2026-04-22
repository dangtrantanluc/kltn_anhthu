/**
 * Haversine distance — khoảng cách giữa 2 toạ độ (lat, lng) tính bằng mét.
 */
const EARTH_RADIUS_M = 6371000;

const toRad = (deg) => (deg * Math.PI) / 180;

const distanceMeters = (lat1, lng1, lat2, lng2) => {
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_M * c;
};

/**
 * Tìm location gần nhất từ list, return { location, distance }
 * locations: [{ id, latitude, longitude, radius_m, ... }]
 */
const findNearestLocation = (locations, lat, lng) => {
    let best = null;
    for (const loc of locations) {
        const d = distanceMeters(
            Number(lat),
            Number(lng),
            Number(loc.latitude),
            Number(loc.longitude)
        );
        if (!best || d < best.distance) best = { location: loc, distance: d };
    }
    return best;
};

module.exports = { distanceMeters, findNearestLocation };
