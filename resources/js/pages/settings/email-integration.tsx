import { Head } from '@inertiajs/react';
import Heading from '@/components/heading';

export default function EmailIntegration({
    setting,
    recentEmails,
}: {
    setting?: any;
    recentEmails?: any[];
}) {
    return (
        <>
            <Head title="Email integration settings" />

            <h1 className="sr-only">Email integration settings</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Email integration"
                    description="Configure your IMAP email settings"
                />

                <div>
                    {setting ? (
                        <div>
                            <p className="text-sm text-muted-foreground">
                                Email integration configured
                            </p>
                        </div>
                    ) : (
                        <div>
                            <p className="text-sm text-muted-foreground">
                                No email integration configured yet
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

EmailIntegration.layout = {
    breadcrumbs: [
        {
            title: 'Email integration settings',
            href: '#',
        },
    ],
};
