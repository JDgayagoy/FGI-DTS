export function GaugeMeter({ percent = 0 }: { percent: number }) {
    const r = 70;
    const cx = 90;
    const cy = 90;

    const segments = [
        { pct: 0.25, color: '#22c55e' },
        { pct: 0.25, color: '#3b82f6' },
        { pct: 0.25, color: '#ef4444' },
        { pct: 0.125, color: '#eab308' },
        { pct: 0.125, color: '#d1d5db' },
    ];

    let currentAngle = Math.PI;
    const paths = segments.map((seg) => {
        const sweep = seg.pct * Math.PI;
        const x1 = cx + r * Math.cos(currentAngle);
        const y1 = cy + r * Math.sin(currentAngle);
        currentAngle -= sweep;
        const x2 = cx + r * Math.cos(currentAngle);
        const y2 = cy + r * Math.sin(currentAngle);
        const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;
        return { d, color: seg.color };
    });

    const needleAngle = Math.PI - (percent / 100) * Math.PI;
    const nx = cx + (r - 12) * Math.cos(needleAngle);
    const ny = cy + (r - 12) * Math.sin(needleAngle);

    return (
        <svg viewBox="0 0 180 100" className="w-48 h-28">
            {paths.map((p, i) => <path key={i} d={p.d} fill={p.color} />)}
            <circle cx={cx} cy={cy} r={30} fill="white" />
            <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#1e293b" strokeWidth={2.5} strokeLinecap="round" />
            <circle cx={cx} cy={cy} r={4} fill="#1e293b" />
            <text x={cx} y={cy - 4} textAnchor="middle" fontSize={17} fontWeight="800" fill="#1e293b">{percent}%</text>
            <text x={cx} y={cy + 10} textAnchor="middle" fontSize={6} fill="#64748b">Completion Rate</text>
        </svg>
    );
}