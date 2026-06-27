<?php

namespace App\Http\Controllers;

use App\Models\ShipmentEmail;
use App\Notifications\ShipmentEmailDetectedNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ShipmentEmailController extends Controller
{
    public function dismiss(Request $request, ShipmentEmail $shipmentEmail): RedirectResponse
    {
        $this->authorizeOwner($request, $shipmentEmail);
        $shipmentEmail->update(['action_taken' => 'dismissed']);
        $this->markRelatedNotificationRead($request, $shipmentEmail);

        return back();
    }

    public function markCreated(Request $request, ShipmentEmail $shipmentEmail): RedirectResponse
    {
        $this->authorizeOwner($request, $shipmentEmail);
        $shipmentEmail->update(['action_taken' => 'shipment_created']);
        $this->markRelatedNotificationRead($request, $shipmentEmail);

        return back();
    }

    private function authorizeOwner(Request $request, ShipmentEmail $email): void
    {
        abort_unless($email->user_id === $request->user()->id, 403);
    }

    private function markRelatedNotificationRead(Request $request, ShipmentEmail $email): void
    {
        $request->user()->unreadNotifications
            ->where('type', ShipmentEmailDetectedNotification::class)
            ->filter(fn ($n) => ($n->data['shipment_email_id'] ?? null) === $email->id)
            ->each->markAsRead();
    }
}
