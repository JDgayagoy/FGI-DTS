export const StatusIcon = ({ type }: { type: string }) => {
    const t = type.toLowerCase();

    let iconType: 'ok' | 'error' | 'warning' | 'pending' = 'pending';
    if (['completed', 'ok', 'approved'].includes(t)) iconType = 'ok';
    else if (['failed', 'error', 'rejected'].includes(t)) iconType = 'error';
    else if (['processing', 'warning', 'incomplete'].includes(t)) iconType = 'warning';

    const config = {
        ok: { // Green
            classes: "bg-green-50 dark:bg-green-900/20 text-green-500 border-green-100 dark:border-green-800/30",
            icon: (
                <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            )
        },
        error: { // Red
            classes: "bg-red-50 dark:bg-red-900/20 text-red-500 border-red-100 dark:border-red-800/30",
            icon: (
                <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            )
        },
        warning: { // Yellow
            classes: "bg-amber-50 dark:bg-amber-900/20 text-amber-500 border-amber-100 dark:border-amber-800/30 border-dashed",
            icon: <div className="size-2.5 rounded-full border-2 border-amber-400 border-dotted animate-spin-slow" />
        },
        pending: { // Blue
            classes: "bg-blue-50 dark:bg-blue-900/20 text-blue-500 border-blue-100 dark:border-blue-800/30",
            icon: <div className="size-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
        }
    }[iconType];

    return (
        <div className={`size-5 flex items-center justify-center rounded-full border ${config.classes}`}>
            {config.icon}
        </div>
    );
};