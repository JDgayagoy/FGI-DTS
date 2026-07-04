import { usePage } from '@inertiajs/react';
import { Link } from '@inertiajs/react';
import {
    LayoutGrid,
    BarChart3,
    List,
    HelpCircle,
    Package,
    Users,
    Shield,
    Truck,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';

import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Shipments',
        href: '/shipments',
        icon: Package,
    },
    {
        title: 'Reports',
        href: '/reports',
        icon: BarChart3,
    },
    {
        title: 'Logs',
        href: '/logs',
        icon: List,
    },
    {
        title: 'FAQs',
        href: '#',
        icon: HelpCircle,
    },
];

export function AppSidebar() {
    const { userPermissions } = usePage().props;
    const hasPermissionName = (name: string) =>
        userPermissions?.includes(name) ?? false;

    console.log(userPermissions);

    const filteredMainItems = mainNavItems.filter((item) => {
        if (item.title === 'Shipments') {
            return hasPermissionName('view-shipments');
        }

        if (item.title === 'Reports') {
            return hasPermissionName('view-shipments');
        }

        if (item.title === 'Logs') {
            return hasPermissionName('view-logs');
        }

        return true; // Dashboard and others always visible
    });

    const managementItems: NavItem[] = [
        ...(hasPermissionName('create-user')
            ? [{ title: 'User Management', href: '/users', icon: Users }]
            : []),
        ...(hasPermissionName('manage-rbac')
            ? [{ title: 'Role Management', href: '/roles', icon: Shield }]
            : []),
        ...(hasPermissionName('view-brokers')
            ? //     ||
              // hasPermissionName('edit-brokers') ||
              // hasPermissionName('delete-brokers') ||
              // hasPermissionName('add-brokers')
              [{ title: 'Broker Management', href: '/brokers', icon: Truck }]
            : []),
    ];

    const navItems = [
        ...filteredMainItems,
        ...(managementItems.length > 0
            ? [
                  {
                      title: 'Management',
                      icon: BarChart3,
                      items: managementItems,
                  },
              ]
            : []),
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={navItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
