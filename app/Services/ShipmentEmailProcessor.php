<?php

namespace App\Services;

use App\Models\ShipmentEmail;
use App\Models\User;
use App\Notifications\ShipmentEmailDetectedNotification;

class ShipmentEmailProcessor
{
    public function __construct(private EmailShipmentParser $parser) {}

    /**
     * @param  array{uid:string,from_address:string,from_name:?string,subject:string,body:string,received_at:\Illuminate\Support\Carbon}  $message
     */
    public function process(User $user, array $message): ShipmentEmail
    {
        $parsed = $this->parser->parse(
            from: $message['from_address'],
            subject: $message['subject'],
            body: $message['body'],
        );

        $matchedRef = $parsed['matched_ref'];
        $shipment = $parsed['shipment'];

        if ($matchedRef !== null && $shipment !== null) {
            $action = 'matched';
        } elseif ($matchedRef !== null) {
            $action = 'pending_review';
        } else {
            $action = 'skipped';
        }

        $email = ShipmentEmail::create([
            'user_id' => $user->id,
            'shipment_id' => $shipment?->shipment_id,
            'imap_message_uid' => $message['uid'],
            'from_address' => $message['from_address'],
            'from_name' => $message['from_name'] ?? null,
            'subject' => $message['subject'],
            'body_excerpt' => mb_substr($message['body'], 0, 500),
            'matched_ref' => $matchedRef,
            'action_taken' => $action,
            'received_at' => $message['received_at'],
            'processed_at' => now(),
        ]);

        if ($action === 'pending_review') {
            $user->notify(new ShipmentEmailDetectedNotification($email));
        }

        return $email;
    }
}
