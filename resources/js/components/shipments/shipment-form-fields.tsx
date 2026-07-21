import type { emptyForm } from '@/pages/shipments/constants';
import { BRAND_MANAGERS } from '@/pages/shipments/constants';
import type {Broker, ShipmentType} from '@/pages/shipments/types';
import { IncotermSelect } from './incoterm-select';

export const ShipmentFormFields = ({
    form,
    setForm,
    errors = {},
    shipmentTypes,
    brokers,
}: {
    form: typeof emptyForm;
    setForm: (f: typeof emptyForm) => void;
    errors?: Record<string, string>;
    shipmentTypes: ShipmentType[];
    brokers: Broker[];
}) => (
    <div className="grid grid-cols-2 gap-4 px-5 py-4">
        <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Shipment Reference
            </label>
            <input
                type="text"
                value={form.shipment_reference}
                onChange={(e) => setForm({ ...form, shipment_reference: e.target.value })}
                className={`rounded-lg border bg-white dark:bg-slate-900/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.shipment_reference ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'}`}
                placeholder="e.g. 2025-SKDEVAN-001"
            />
            {errors.shipment_reference && <span className="text-xs text-red-500">{errors.shipment_reference}</span>}
        </div>
        <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Brand</label>
            <input
                type="text"
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                className={`rounded-lg border bg-white dark:bg-slate-900/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.brand ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'}`}
                placeholder="e.g. Brumate"
            />
            {errors.brand && <span className="text-xs text-red-500">{errors.brand}</span>}
        </div>
        <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Incoterm</label>
            <IncotermSelect value={form.incoterm} onChange={(val) => setForm({ ...form, incoterm: val })} />
            {errors.incoterm && <span className="text-xs text-red-500">{errors.incoterm}</span>}
        </div>
        <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Shipment Type
            </label>
            <select
                value={form.shipment_type_id}
                onChange={(e) => setForm({ ...form, shipment_type_id: e.target.value })}
                className={`rounded-lg border bg-white dark:bg-slate-900/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.shipment_type_id ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'}`}
            >
                <option value="" disabled>Select type</option>
                {shipmentTypes.map((t) => (
                    <option key={t.shipment_type_id} value={t.shipment_type_id}>
                        {t.shipment_type_name}
                    </option>
                ))}
            </select>
            {errors.shipment_type_id && <span className="text-xs text-red-500">{errors.shipment_type_id}</span>}
        </div>
        <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Broker</label>
            <select
                value={form.broker_id}
                onChange={(e) => setForm({ ...form, broker_id: e.target.value })}
                className={`rounded-lg border bg-white dark:bg-slate-900/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.broker_id ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'}`}
            >
                <option value="">Select broker</option>
                {brokers.map((b) => (
                    <option key={b.broker_id} value={b.broker_id}>
                        {b.broker_name}
                    </option>
                ))}
            </select>
            {errors.broker_id && <span className="text-xs text-red-500">{errors.broker_id}</span>}
        </div>
        <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Brand Manager
            </label>
            <select
                value={form.brand_manager}
                onChange={(e) => setForm({ ...form, brand_manager: e.target.value })}
                className={`rounded-lg border bg-white dark:bg-slate-900/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.brand_manager ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'}`}
            >
                <option value="" disabled>Select Brand Manager</option>
                {BRAND_MANAGERS.map((bm) => (
                    <option key={bm} value={bm}>{bm}</option>
                ))}
            </select>
            {errors.brand_manager && <span className="text-xs text-red-500">{errors.brand_manager}</span>}
        </div>
        <div className="col-span-2 flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Actual Time of Arrival
            </label>
            <input
                type="datetime-local"
                value={form.actual_time_of_arrival}
                onChange={(e) => setForm({ ...form, actual_time_of_arrival: e.target.value })}
                className={`rounded-lg border bg-white dark:bg-slate-900/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.actual_time_of_arrival ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'}`}
            />
            {errors.actual_time_of_arrival && <span className="text-xs text-red-500">{errors.actual_time_of_arrival}</span>}
        </div>
    </div>
);