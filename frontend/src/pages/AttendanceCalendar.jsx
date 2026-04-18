import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import { vi, enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import Sidebar from '../components/layout/Sidebar';
import { attendanceService } from '../services/api';
import { Clock, AlertCircle } from 'lucide-react';

const locales = {
    'vi': vi,
    'en': enUS
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

export default function AttendanceCalendar() {
    const { t, i18n } = useTranslation();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    // We load a wide range or just let backend give current month
    // For demo, we just load current month
    useEffect(() => {
        const fetchAttendance = async () => {
            setLoading(true);
            try {
                const now = new Date();
                const res = await attendanceService.getMyAttendance(now.getMonth() + 1, now.getFullYear());
                const data = res.data.attendances || [];

                const mappedEvents = data.map(d => {
                    let title = t('dashboard.stats.absent');
                    let bgColor = '#f3f4f6';
                    let textColor = '#4b5563';

                    if (d.status === 'PRESENT') {
                        title = `${format(new Date(d.check_in_time), 'HH:mm')} - ${d.check_out_time ? format(new Date(d.check_out_time), 'HH:mm') : '...'}`;
                        bgColor = '#d1fae5'; textColor = '#047857';
                    } else if (d.status === 'LATE') {
                        title = `${format(new Date(d.check_in_time), 'HH:mm')} (Late ${d.late_mins}m)`;
                        bgColor = '#fee2e2'; textColor = '#b91c1c';
                    } else if (d.status === 'MISSING_CHECKOUT') {
                        title = `${format(new Date(d.check_in_time), 'HH:mm')} - No Out`;
                        bgColor = '#fef3c7'; textColor = '#b45309';
                    }

                    return {
                        id: d.id,
                        title,
                        start: new Date(d.work_date),
                        end: new Date(d.work_date),
                        allDay: true,
                        status: d.status,
                        bgColor,
                        textColor,
                        rawData: d
                    };
                });

                setEvents(mappedEvents);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchAttendance();
    }, [i18n.language, t]);

    const eventStyleGetter = (event) => {
        return {
            style: {
                backgroundColor: event.bgColor,
                color: event.textColor,
                borderRadius: '6px',
                border: 'none',
                display: 'block',
                padding: '3px 6px',
                fontSize: '11px',
                fontWeight: '600',
                textAlign: 'center'
            }
        };
    };

    return (
        <div className="flex min-h-screen bg-gray-50/50">
            <Sidebar />
            <main className="flex-1 ml-[260px] p-8 lg:p-10">
                <div className="mb-6">
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                        {t('attendance.title')}
                    </h1>
                    <p className="text-gray-500 mt-2 text-sm font-medium">
                        {t('attendance.subtitle')}
                    </p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm h-[700px]">
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-gray-400">
                            <span className="animate-pulse">Đang tải lịch...</span>
                        </div>
                    ) : (
                        <Calendar
                            localizer={localizer}
                            events={events}
                            startAccessor="start"
                            endAccessor="end"
                            culture={i18n.language === 'vi' ? 'vi' : 'en'}
                            style={{ height: '100%', fontFamily: 'inherit' }}
                            views={['month', 'week']}
                            eventPropGetter={eventStyleGetter}
                            messages={{
                                next: ">",
                                previous: "<",
                                today: "Hôm nay",
                                month: "Tháng",
                                week: "Tuần",
                                day: "Ngày"
                            }}
                        />
                    )}
                </div>
            </main>
        </div>
    );
}
