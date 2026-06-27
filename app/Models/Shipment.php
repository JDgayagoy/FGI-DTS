<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Shipment extends Model
{
    use HasFactory;

    protected $table = 'shipments';

    protected $primaryKey = 'shipment_id';

    public $timestamps = true;

    protected $fillable = [
        'year',
        'month',
        'shipment_reference',
        'brand',
        'incoterm',
        'actual_time_of_arrival',
        'broker_id',
        'brand_manager',
        'shipment_type_id',
        'status_id',
        'archived_at',
    ];

    protected $casts = [
        'actual_time_of_arrival' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'archived_at' => 'datetime',
    ];

    public function scopeActive($query)
    {
        return $query->whereNull('archived_at');
    }

    public function scopeArchived($query)
    {
        return $query->whereNotNull('archived_at');
    }

    public function status()
    {
        return $this->belongsTo(ShipmentStatusList::class, 'status_id', 'status_id');
    }

    public function documents()
    {
        return $this->hasMany(ShipmentDocument::class, 'shipment_id', 'shipment_id');
    }

    public function emails()
    {
        return $this->hasMany(ShipmentEmail::class, 'shipment_id', 'shipment_id');
    }

    public function shipmentType()
    {
        return $this->belongsTo(ShipmentType::class, 'shipment_type_id', 'shipment_type_id');
    }

    public function broker()
    {
        return $this->belongsTo(Broker::class, 'broker_id', 'broker_id');
    }
}
