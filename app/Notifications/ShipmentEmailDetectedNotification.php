<?php

namespace App\Notifications;

use App\Models\ShipmentEmail;
use Illuminate\Notifications\Notification;

class ShipmentEmailDetectedNotification extends Notification
{
    public function __construct(public ShipmentEmail $email) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'shipment_email_id' => $this->email->id,
            'from_address' => $this->email->from_address,
            'from_name' => $this->email->from_name,
            'subject' => $this->email->subject,
            'matched_ref' => $this->email->matched_ref,
            'body_excerpt' => $this->email->body_excerpt,
            'received_at' => $this->email->received_at?->toIso8601String(),
        ];
    }
}
