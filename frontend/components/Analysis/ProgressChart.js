import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function ProgressChart({ snapshots = [] }) {
  const chartData = useMemo(
    () => snapshots.map((item) => ({
      date: new Date(item.snapshot_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      match: Number(item.match_percentage),
    })),
    [snapshots]
  );

  const deltaText = useMemo(() => {
    if (chartData.length <= 1) {
      return { label: 'Analyze again to see your progress', accent: 'text-gray-600' };
    }

    const first = chartData[0]?.match || 0;
    const last = chartData[chartData.length - 1]?.match || 0;
    const delta = Number((last - first).toFixed(1));
    const sign = delta >= 0 ? '+' : '-';
    return {
      label: `${sign}${Math.abs(delta)}% in the last ${chartData.length > 1 ? 'period' : '30 days'}`,
      accent: delta >= 0 ? 'text-emerald-600' : 'text-red-600',
    };
  }, [chartData]);

  if (!chartData.length) {
    return (
      <div className="text-center py-10 text-gray-500">
        <p>No readiness snapshots yet.</p>
        <p className="mt-2 text-sm">Analyze a role or update your skill set to start tracking progress.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold">Readiness Progress</h3>
          <p className="text-gray-600">Track your match score over time for the selected role.</p>
        </div>
        <div className={`text-sm font-semibold ${deltaText.accent}`}>
          {deltaText.label}
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tickLine={false} axisLine={false} />
            <YAxis domain={[0, 100]} tickLine={false} axisLine={false} />
            <Tooltip formatter={(value) => `${value}%`} />
            <Line type="monotone" dataKey="match" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
