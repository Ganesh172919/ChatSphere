import { useMemo } from 'react';
import type { TimeSeriesData } from '../api/analytics';

interface BarChartProps {
  data: TimeSeriesData[];
  color?: string;
  label?: string;
  height?: number;
}

export function BarChart({ data, color = '#A855F7', label = 'Count', height = 160 }: BarChartProps) {
  const max = useMemo(() => Math.max(...data.map(d => d.count), 1), [data]);

  // Show last 14 items max for readability
  const visibleData = data.slice(-14);

  return (
    <div>
      <div className="flex items-end gap-[2px]" style={{ height }}>
        {visibleData.map((d) => {
          const pct = (d.count / max) * 100;
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center group relative">
              {/* Tooltip */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-navy-900 border border-navy-700/50 text-[9px] text-gray-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                {d.date.slice(5)}: {d.count}
              </div>
              {/* Bar */}
              <div
                className="w-full rounded-t-sm transition-all duration-300 hover:opacity-80"
                style={{
                  height: `${Math.max(pct, 2)}%`,
                  background: `linear-gradient(to top, ${color}50, ${color})`,
                  minHeight: 2,
                }}
              />
            </div>
          );
        })}
      </div>
      {/* X axis labels */}
      <div className="flex gap-[2px] mt-1">
        {visibleData.map((d, i) => (
          <div key={d.date} className="flex-1 text-center">
            {i % 2 === 0 && (
              <span className="text-[8px] text-gray-600">{d.date.slice(8)}</span>
            )}
          </div>
        ))}
      </div>
      <p className="text-[10px] text-gray-600 mt-1">{label}</p>
    </div>
  );
}

interface MiniStatProps {
  label: string;
  value: number | string;
  icon?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export function MiniStat({ label, value, icon, trend }: MiniStatProps) {
  return (
    <div className="p-4 rounded-xl bg-navy-900/50 border border-navy-700/30">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</span>
        {icon && <span className="text-sm">{icon}</span>}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-display font-bold text-white">{value}</span>
        {trend && (
          <span className={`text-[10px] mb-1 ${
            trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-gray-500'
          }`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '–'}
          </span>
        )}
      </div>
    </div>
  );
}

// Top rooms table
interface TopRoomsTableProps {
  rooms: Array<{
    roomId: string;
    name: string;
    messageCount: number;
    lastActivity: string;
  }>;
}

export function TopRoomsTable({ rooms }: TopRoomsTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-navy-700/30">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-navy-900/50">
            <th className="text-left px-4 py-2 text-[10px] text-gray-500 uppercase tracking-wider font-medium">#</th>
            <th className="text-left px-4 py-2 text-[10px] text-gray-500 uppercase tracking-wider font-medium">Room</th>
            <th className="text-right px-4 py-2 text-[10px] text-gray-500 uppercase tracking-wider font-medium">Messages</th>
          </tr>
        </thead>
        <tbody>
          {rooms.map((room, i) => (
            <tr key={room.roomId} className="border-t border-navy-700/20 hover:bg-navy-900/30 transition-colors">
              <td className="px-4 py-2.5 text-gray-600">{i + 1}</td>
              <td className="px-4 py-2.5 text-gray-300 font-medium">{room.name}</td>
              <td className="px-4 py-2.5 text-right text-gray-400">{room.messageCount.toLocaleString()}</td>
            </tr>
          ))}
          {rooms.length === 0 && (
            <tr>
              <td colSpan={3} className="px-4 py-6 text-center text-gray-600 text-xs">No data yet</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
