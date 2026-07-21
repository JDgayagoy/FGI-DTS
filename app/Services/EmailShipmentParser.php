<?php

namespace App\Services;

use App\Models\Shipment;

class EmailShipmentParser
{
    /**
     * @return array{matched_ref: ?string, shipment: ?Shipment}
     */
    public function parse(string $from, string $subject, string $body): array
    {
        $haystack = $subject."\n".mb_substr($body, 0, 1000);
        $haystackLower = mb_strtolower($haystack);

        // Longest refs first so "FGI-10" wins over "FGI-1".
        $shipments = Shipment::query()
            ->whereNotNull('shipment_reference')
            ->where('shipment_reference', '!=', '')
            ->orderByRaw('LENGTH(shipment_reference) DESC')
            ->get(['shipment_id', 'shipment_reference']);

        foreach ($shipments as $shipment) {
            $ref = $shipment->shipment_reference;
            if (str_contains($haystackLower, mb_strtolower($ref))) {
                return [
                    'matched_ref' => $ref,
                    'shipment' => $shipment,
                ];
            }
        }

        return ['matched_ref' => null, 'shipment' => null];
    }
}
