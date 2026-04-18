import React, { useState } from 'react';
import Sidebar from '../components/layout/Sidebar';
import { useTranslation } from 'react-i18next';
import { Plus, X, Search, FileText, CheckCircle2, XCircle, Clock } from 'lucide-react';

const MOCK_REQUESTS = [
    { id: 1, type: 'LEAVE_REQUEST', leaveType: 'PAID', date: '2026-02-15', reason: 'Nghỉ ốm', status: 'APPROVED', created: '2026-02-10' },
    { id: 2, type: 'MISSING_PUNCH', checkIn: '08:00', checkOut: '17:00', date: '2026-02-05', reason: 'Quên chấm công chiều', status: 'PENDING', created: '2026-02-06' },
];

export default function RequestsView() {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('my-requests');
    const [showModal, setShowModal] = useState(false);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'APPROVED': return <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-xs font-semibold border border-emerald-200"><CheckCircle2 className="w-3.5 h-3.5" /> Đã duyệt</span>;
            case 'REJECTED': return <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2.5 py-1 rounded-md text-xs font-semibold border border-red-200"><XCircle className="w-3.5 h-3.5" /> Từ chối</span>;
            default: return <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md text-xs font-semibold border border-amber-200"><Clock className="w-3.5 h-3.5" /> Chờ duyệt</span>;
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50/50">
            <Sidebar />
            <main className="flex-1 ml-[260px] p-8 lg:p-10">

                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Quản lý Đơn từ</h1>
                        <p className="text-gray-500 mt-2 text-sm font-medium">Tạo và theo dõi đơn xin nghỉ phép, bổ sung công</p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Tạo đơn mới
                    </button>
                </div>

                {/* Tabs & Search */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex gap-2 p-1 bg-gray-200/50 rounded-lg">
                        <button
                            onClick={() => setActiveTab('my-requests')}
                            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${activeTab === 'my-requests' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Đơn của tôi
                        </button>
                        <button
                            onClick={() => setActiveTab('approvals')}
                            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${activeTab === 'approvals' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Cần phê duyệt
                        </button>
                    </div>
                    <div className="relative">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm..."
                            className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-64"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="py-3.5 px-6 text-gray-500 font-semibold text-xs uppercase">BNgày xin</th>
                                <th className="py-3.5 px-6 text-gray-500 font-semibold text-xs uppercase">Loại đơn</th>
                                <th className="py-3.5 px-6 text-gray-500 font-semibold text-xs uppercase">Chi tiết</th>
                                <th className="py-3.5 px-6 text-gray-500 font-semibold text-xs uppercase">Lý do</th>
                                <th className="py-3.5 px-6 text-gray-500 font-semibold text-xs uppercase">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {MOCK_REQUESTS.map(req => (
                                <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="py-3.5 px-6 font-medium text-gray-900">{req.date}</td>
                                    <td className="py-3.5 px-6">
                                        <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs font-medium border border-indigo-100">
                                            {req.type === 'LEAVE_REQUEST' ? 'Nghỉ Phép' : 'Bổ Sung Công'}
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-6 text-gray-600">
                                        {req.type === 'LEAVE_REQUEST' ? `Loại: ${req.leaveType === 'PAID' ? 'Nghỉ hưởng lương' : 'Không lương'}` : `Check In: ${req.checkIn} | Out: ${req.checkOut}`}
                                    </td>
                                    <td className="py-3.5 px-6 text-gray-500 max-w-[200px] truncate" title={req.reason}>{req.reason}</td>
                                    <td className="py-3.5 px-6">{getStatusBadge(req.status)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {MOCK_REQUESTS.length === 0 && (
                        <div className="py-16 flex flex-col items-center justify-center text-gray-400">
                            <FileText className="w-10 h-10 mb-3 stroke-[1.5] text-gray-300" />
                            <p>Không có đơn từ nào.</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Basic Create Modal Mock */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-[500px] p-6 max-w-[90vw]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-900">Tạo Đơn từ mới</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full p-1.5 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form className="space-y-4" onSubmit={e => { e.preventDefault(); setShowModal(false); }}>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Loại đơn</label>
                                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                                    <option value="LEAVE_REQUEST">Xin nghỉ phép</option>
                                    <option value="MISSING_PUNCH">Bổ sung chấm công</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Ngày áp dụng</label>
                                <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Lý do</label>
                                <textarea rows="3" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" placeholder="Nhập lý do chi tiết..." />
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold text-sm rounded-lg hover:bg-gray-50">Hủy</button>
                                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm">Gửi đơn</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
