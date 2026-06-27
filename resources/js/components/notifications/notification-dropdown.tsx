import { router, usePage } from '@inertiajs/react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { AppNotification } from '@/types';

interface Props {
    onSelect: (notification: AppNotification) => void;
}

export function NotificationDropdown({ onSelect }: Props) {
    const { props } = usePage<{
        notifications?: AppNotification[];
        unread_notification_count?: number;
    }>();

    const notifications = props.notifications ?? [];
    const count = props.unread_notification_count ?? 0;

    const handleClick = (n: AppNotification) => {
        router.post(`/notifications/${n.id}/read`, {}, { preserveScroll: true });
        onSelect(n);
    };

    const markAll = () => {
        router.post('/notifications/read-all', {}, { preserveScroll: true });
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9">
                    <Bell className="!size-5 opacity-80" />
                    {count > 0 && (
                        <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                            {count}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="max-h-96 w-80 overflow-y-auto p-0">
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <span className="text-sm font-semibold">Notifications</span>
                    {count > 0 && (
                        <button onClick={markAll} className="text-xs text-blue-600">
                            Mark all read
                        </button>
                    )}
                </div>
                {notifications.length === 0 ? (
                    <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                        No new notifications
                    </p>
                ) : (
                    <ul>
                        {notifications.map((n) => (
                            <li key={n.id}>
                                <button
                                    onClick={() => handleClick(n)}
                                    className={cn(
                                        'flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800',
                                        !n.read_at && 'border-l-2 border-blue-600 bg-blue-50 dark:bg-blue-950/30',
                                    )}
                                >
                                    <span className="text-sm font-medium">New shipment email</span>
                                    <span className="text-xs text-muted-foreground">
                                        {n.data.from_address}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                        {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </PopoverContent>
        </Popover>
    );
}
