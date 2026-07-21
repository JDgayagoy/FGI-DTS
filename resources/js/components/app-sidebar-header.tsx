import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { Bell, Mail, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePage } from '@inertiajs/react';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const { auth } = usePage().props;
    const initials = auth.user?.name
        ? auth.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
        : '??';

    return (
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border/50 px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4 bg-white dark:bg-[#020617]">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>

            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-800 pr-2 mr-2">
                    <Button variant="ghost" size="icon" className="size-8 text-slate-400 hover:text-blue-600">
                        <Bell className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8 text-slate-400 hover:text-blue-600">
                        <Mail className="size-4" />
                    </Button>
                </div>
                
                <div className="flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800/50 p-1 rounded-lg transition-colors cursor-pointer group">
                    <div className="size-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                        {initials}
                    </div>
                    <div className="hidden lg:flex flex-col text-left">
                        <span className="text-xs font-semibold leading-none text-slate-900 dark:text-white">
                            {auth.user?.name || 'User'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Administrator</span>
                    </div>
                    <ChevronDown className="size-3 text-slate-400" />
                </div>
            </div>
        </header>
    );
}
