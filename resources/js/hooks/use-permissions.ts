import { usePage } from '@inertiajs/react';

interface SharedProps {
    auth: {
        user: any;
        roles: string[];
        permissions: string[];
    };
    [key: string]: any;
}

export function usePermissions() {
    const { auth } = usePage<SharedProps>().props;

    const hasRole = (role: string) => {
        return auth.roles?.includes(role) ?? false;
    };

    const hasPermission = (permission: string) => {
        return auth.permissions?.includes(permission) ?? false;
    };

    const hasAnyPermission = (permissions: string[]) => {
        return permissions.some(hasPermission);
    };

    const hasAllPermissions = (permissions: string[]) => {
        return permissions.every(hasPermission);
    };

    return {
        hasRole,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        roles: auth.roles ?? [],
        permissions: auth.permissions ?? [],
    };
}
