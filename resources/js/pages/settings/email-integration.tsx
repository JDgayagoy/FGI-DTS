import { Head, router, usePage } from '@inertiajs/react';
import { Mail } from 'lucide-react';
import { useState } from 'react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ImapSetting {
    has_password: boolean;
    imap_host: string;
    imap_port: number;
    username: string;
    encryption: 'ssl' | 'tls' | 'none';
    poll_interval_min: '1' | '5' | '10';
    is_enabled: boolean;
    last_synced_at: string | null;
}

interface RecentEmail {
    id: number;
    matched_ref: string | null;
    action_taken: string;
    processed_at: string | null;
}

interface PageProps {
    setting: ImapSetting | null;
    recentEmails: RecentEmail[];
    imapTest?: { ok: boolean; message: string };
    [key: string]: unknown;
}

export default function EmailIntegration() {
    const { props } = usePage<PageProps>();
    const setting = props.setting;

    const [form, setForm] = useState({
        imap_host: setting?.imap_host ?? '',
        imap_port: setting?.imap_port ?? 993,
        username: setting?.username ?? '',
        password: '',
        encryption: setting?.encryption ?? 'ssl',
        poll_interval_min: setting?.poll_interval_min ?? '5',
        is_enabled: setting?.is_enabled ?? false,
    });
    const [passwordTouched, setPasswordTouched] = useState(false);

    const update = (key: string, value: unknown) =>
        setForm((f) => ({ ...f, [key]: value }));

    const disabled = !form.is_enabled;

    const save = () => {
        router.put('/settings/imap', form, { preserveScroll: true });
    };

    const testConnection = () => {
        router.post('/settings/imap/test', {}, { preserveScroll: true });
    };

    const remove = () => {
        if (confirm('Remove email integration? Credentials will be deleted.')) {
            router.delete('/settings/imap', { preserveScroll: true });
        }
    };

    return (
        <>
            <Head title="Email Integration" />
            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Email Integration"
                    description="Connect your inbox to automatically track shipment emails."
                />

                <label className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        checked={form.is_enabled}
                        onChange={(e) => update('is_enabled', e.target.checked)}
                        className="size-4"
                    />
                    <span className="text-sm font-medium">Enable email tracking</span>
                </label>

                <div className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="imap_host">IMAP Host</Label>
                        <Input
                            id="imap_host"
                            value={form.imap_host}
                            disabled={disabled}
                            onChange={(e) => update('imap_host', e.target.value)}
                            placeholder="imap.gmail.com"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="imap_port">Port</Label>
                            <Input
                                id="imap_port"
                                type="number"
                                value={form.imap_port}
                                disabled={disabled}
                                onChange={(e) => update('imap_port', Number(e.target.value))}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="encryption">Encryption</Label>
                            <select
                                id="encryption"
                                value={form.encryption}
                                disabled={disabled}
                                onChange={(e) => update('encryption', e.target.value)}
                                className="h-9 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
                            >
                                <option value="ssl">SSL</option>
                                <option value="tls">TLS</option>
                                <option value="none">None</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                            id="username"
                            value={form.username}
                            disabled={disabled}
                            onChange={(e) => update('username', e.target.value)}
                            placeholder="you@example.com"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            value={passwordTouched ? form.password : ''}
                            disabled={disabled}
                            onChange={(e) => {
                                setPasswordTouched(true);
                                update('password', e.target.value);
                            }}
                            placeholder={setting?.has_password ? '••••••••' : ''}
                        />
                        <p className="text-xs text-muted-foreground">Use an app password.</p>
                    </div>

                    <div className="grid gap-2">
                        <Label>Poll Interval</Label>
                        <div className="flex flex-col gap-1">
                            {(['1', '5', '10'] as const).map((v) => (
                                <label key={v} className="flex items-center gap-2 text-sm">
                                    <input
                                        type="radio"
                                        name="poll_interval_min"
                                        value={v}
                                        checked={form.poll_interval_min === v}
                                        disabled={disabled}
                                        onChange={() => update('poll_interval_min', v)}
                                    />
                                    Every {v} min{v === '1' ? '' : 's'}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <Button variant="outline" onClick={testConnection} disabled={disabled}>
                        Test Connection
                    </Button>
                    <Button onClick={save}>Save Settings</Button>
                </div>

                {props.flash?.imapTest && (
                    <p className={props.flash.imapTest.ok ? 'text-sm text-green-600' : 'text-sm text-red-600'}>
                        {props.flash.imapTest.ok ? '✓ ' : '✕ '}
                        {props.flash.imapTest.message}
                    </p>
                )}

                {setting?.last_synced_at && (
                    <p className="text-xs text-muted-foreground">
                        Last synced: {new Date(setting.last_synced_at).toLocaleString()}
                    </p>
                )}

                <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Recent Activity</h3>
                    {props.recentEmails.length === 0 && (
                        <p className="text-xs text-muted-foreground">No activity yet.</p>
                    )}
                    <ul className="space-y-1">
                        {props.recentEmails.map((e) => (
                            <li key={e.id} className="flex items-center gap-3 text-xs">
                                <Mail className="size-3 text-slate-400" />
                                <span className="w-28 font-medium">{e.action_taken}</span>
                                <span className="w-20">{e.matched_ref ?? '—'}</span>
                                <span className="text-muted-foreground">
                                    {e.processed_at ? new Date(e.processed_at).toLocaleString() : ''}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>

                {setting && (
                    <Button variant="destructive" onClick={remove}>
                        Remove integration
                    </Button>
                )}
            </div>
        </>
    );
}

EmailIntegration.layout = {
    breadcrumbs: [
        {
            title: 'Email Integration',
            href: '/settings/email-integration',
        },
    ],
};
