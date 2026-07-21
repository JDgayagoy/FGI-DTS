<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ShipmentStatusList extends Model
{
  use HasFactory;

  protected $table = 'shipment_status_list';
  protected $primaryKey = 'status_id';
  public $timestamps = false;

  protected $fillable = [
    'status_name',
  ];

  public function shipments()
  {
    return $this->hasMany(Shipment::class, 'status_id', 'status_id');
  }
}
