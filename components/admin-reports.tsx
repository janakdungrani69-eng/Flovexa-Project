"use client";

import { useMemo, useState } from "react";
import { ChartNoAxesCombined } from "lucide-react";

export type AdminReportOrder = { total_paise: number; payment_status: string; created_at: string };
const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);

export default function AdminReports({ orders, now }: { orders: AdminReportOrder[]; now: string }) {
  const [range, setRange] = useState(30);
  const report = useMemo(() => {
    const since = new Date(now).getTime() - range * 24 * 60 * 60 * 1000;
    const periodOrders = orders.filter((order) => new Date(order.created_at).getTime() >= since);
    const paidOrders = periodOrders.filter((order) => order.payment_status === "captured");
    const revenue = paidOrders.reduce((sum, order) => sum + order.total_paise, 0);
    const buckets = new Map<string, { orders: number; revenue: number }>();
    for (const order of paidOrders) {
      const date = new Date(order.created_at);
      const key = date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
      const current = buckets.get(key) ?? { orders: 0, revenue: 0 };
      current.orders += 1; current.revenue += order.total_paise; buckets.set(key, current);
    }
    return { paidOrders, revenue, buckets: [...buckets.entries()] };
  }, [orders, now, range]);
  return <div className="admin-panel"><div className="admin-panel-tools"><h2>Sales performance</h2><label className="admin-filter">Period<select value={range} onChange={(event) => setRange(Number(event.target.value))}><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option><option value={365}>Last 12 months</option></select></label></div><p className="admin-report-scope">Revenue includes captured online payments only. The report uses the latest {orders.length} orders loaded for this store.</p><div className="admin-report-stats"><div><span>CAPTURED REVENUE</span><b>{money(report.revenue)}</b></div><div><span>PAID ORDERS</span><b>{report.paidOrders.length}</b></div><div><span>AVERAGE ORDER</span><b>{money(report.paidOrders.length ? Math.round(report.revenue / report.paidOrders.length) : 0)}</b></div></div>{!report.paidOrders.length ? <div className="admin-empty"><ChartNoAxesCombined size={24}/><b>No captured sales in this period</b><span>Completed online payments will appear in this report.</span></div> : <div className="admin-report-table"><div className="admin-report-row admin-report-header"><span>MONTH</span><span>PAID ORDERS</span><span>REVENUE</span></div>{report.buckets.map(([month, values]) => <div className="admin-report-row" key={month}><b>{month}</b><span>{values.orders}</span><strong>{money(values.revenue)}</strong></div>)}</div>}</div>;
}
