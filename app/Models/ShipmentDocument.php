<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ShipmentDocument extends Model
{
  use HasFactory;

  protected $table = 'shipment_documents';
  protected $primaryKey = 'shipment_doc_id';
  public $timestamps = false;

  protected $fillable = [
    'shipment_id',
    'custom_doc_id',
    'file_path',    // add this
    'file_name',    // add this
  ];

  protected $casts = [
  ];

  public function shipment()
  {
    return $this->belongsTo(Shipment::class, 'shipment_id', 'shipment_id');
  }

  public function customDoc()
  {
    return $this->belongsTo(CustomDoc::class, 'custom_doc_id', 'custom_doc_id');
  }

  public function documentStatuses()
  {
    return $this->hasMany(DocumentStatus::class, 'shipment_doc_id', 'shipment_doc_id');
  }

  public function currentStatus()
  {
    return $this->hasOne(DocumentStatus::class, 'shipment_doc_id', 'shipment_doc_id')
      ->where('is_current', true);
  }
}
