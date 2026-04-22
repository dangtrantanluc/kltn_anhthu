import React, { useCallback, useEffect, useState } from 'react';
import { Filter, RefreshCcw, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import useUiStore from '../../store/uiStore';
import { auditService } from '../../services/api';
import { fmtDateTime } from '../../utils/format';

const PAGE_SIZE = 50;

const ACTION_COLOR = (action) => {
    if (action?.includes('DELETE') || action?.includes('REVOKE')) return 'bg-red-100 text-red-700';
    if (action?.includes('UPDATE') || action?.includes('EDIT')) return 'bg-amber-100 text-amber-700';
    if (action?.includes('APPROVE') || action?.includes('CONFIRM')) return 'bg-emerald-100 text-emerald-700';
    if (action?.includes('CREATE') || action?.includes('GENERATE')) return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-700';
};

export default function AuditLogsPage() {
    const toast = useUiStore((s) => s.toast);

    const [filters, setFilters] = useState({
        action: '', entity: '', actor_id: '', from: '', to: '',
    });
    const [page, setPage] = useState(1);
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [actions, setActions] = useState([]);
    const [expand, setExpand] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await auditService.list({
                ...filters,
                page,
                limit: PAGE_SIZE,
            });
            setRows(data.items || []);
            setTotal(data.total || 0);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không tải được audit log.');
        } finally {
            setLoading(false);
        }
    }, [filters, page, toast]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        auditService.actions().then(({ data }) => setActions(data.actions || [])).catch(() => { });
    }, []);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <div className="ml-[260px] min-h-screen bg-gray-50">
            <Sidebar />
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
                        <p className="text-gray-500 text-sm mt-1">Lịch sử thay đổi, duyệt, xuất file trong hệ thống.</p>
                    </div>
                    <button
                        onClick={load}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                        <RefreshCcw className="w-4 h-4" /> Tải lại
                    </button>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-end">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Action</label>
                        <select
                            value={filters.action}
                            onChange={(e) => { setFilters({ ...filters, action: e.target.value }); setPage(1); }}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[180px]"
                        >
                            <option value="">Tất cả</option>
                            {actions.map((a) => (<option key={a} value={a}>{a}</option>))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Entity</label>
                        <input
                            type="text"
                            value={filters.entity}
                            placeholder="users, payrolls, reports..."
                            onChange={(e) => { setFilters({ ...filters, entity: e.target.value }); setPage(1); }}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-[180px]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Actor ID</label>
                        <input
                            type="number"
                            value={filters.actor_id}
                            onChange={(e) => { setFilters({ ...filters, actor_id: e.target.value }); setPage(1); }}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-[120px]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Từ</label>
                        <input
                            type="datetime-local"
                            value={filters.from}
                            onChange={(e) => { setFilters({ ...filters, from: e.target.value }); setPage(1); }}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Đến</label>
                        <input
                            type="datetime-local"
                            value={filters.to}
                            onChange={(e) => { setFilters({ ...filters, to: e.target.value }); setPage(1); }}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                    </div>
                    <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
                        <Filter className="w-4 h-4" /> {total} dòng
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase">
                            <tr>
                                <th className="text-left px-4 py-3">Thời gian</th>
                                <th className="text-left px-4 py-3">Người thực hiện</th>
                                <th className="text-left px-4 py-3">Action</th>
                                <th className="text-left px-4 py-3">Entity</th>
                                <th className="text-left px-4 py-3">Entity ID</th>
                                <th className="text-left px-4 py-3">IP</th>
                                <th className="text-right px-4 py-3">Chi tiết</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {loading && <tr><td colSpan={7} className="text-center py-10 text-gray-400">Đang tải…</td></tr>}
                            {!loading && rows.length === 0 && (
                                <tr><td colSpan={7} className="text-center py-10 text-gray-400">Chưa có bản ghi.</td></tr>
                            )}
                            {rows.map((r) => (
                                <React.Fragment key={r.id}>
                                    <tr className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-xs text-gray-500">{fmtDateTime(r.created_at)}</td>
                                        <td className="px-4 py-3">
                                            {r.actor_name ? (
                                                <div className="flex flex-col leading-tight">
                                                    <span className="font-medium text-gray-900">{r.actor_name}</span>
                                                    <span className="text-xs text-gray-500">
                                                        {r.actor_code} • {r.actor_role}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">system</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-mono font-semibold ${ACTION_COLOR(r.action)}`}>
                                                {r.action}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">{r.entity || '—'}</td>
                                        <td className="px-4 py-3 text-gray-700">{r.entity_id || '—'}</td>
                                        <td className="px-4 py-3 text-gray-500 text-xs">{r.ip || '—'}</td>
                                        <td className="px-4 py-3 text-right">
                                            {r.diff_json && (
                                                <button
                                                    onClick={() => setExpand(expand === r.id ? null : r.id)}
                                                    className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    {expand === r.id ? 'Ẩn' : 'Xem'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                    {expand === r.id && (
                                        <tr>
                                            <td colSpan={7} className="bg-gray-50 px-4 py-3">
                                                <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">
                                                    {JSON.stringify(r.diff_json, null, 2)}
                                                </pre>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 text-sm">
                        <span className="text-gray-500">Trang {page}/{totalPages}</span>
                        <div className="flex gap-2">
                            <button
                                disabled={page <= 1}
                                onClick={() => setPage((p) => p - 1)}
                                className="inline-flex items-center gap-1 px-3 py-2 border rounded-lg bg-white disabled:opacity-40"
                            >
                                <ChevronLeft className="w-4 h-4" /> Trước
                            </button>
                            <button
                                disabled={page >= totalPages}
                                onClick={() => setPage((p) => p + 1)}
                                className="inline-flex items-center gap-1 px-3 py-2 border rounded-lg bg-white disabled:opacity-40"
                            >
                                Sau <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
