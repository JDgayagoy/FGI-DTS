import type { InertiaLinkProps } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';

export type BreadcrumbItem = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
};

export type NavItem = {
    title: string;
    href?: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    isActive?: boolean;
    items?: NavItem[];
};

export interface AppNotification {
    id: string;
    data: {
        shipment_email_id: number;
        from_address: string;
        from_name: string | null;
        subject: string;
        matched_ref: string | null;
        body_excerpt: string;
        received_at: string | null;
    };
    read_at: string | null;
    created_at: string | null;
}
