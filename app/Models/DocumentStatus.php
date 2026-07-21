<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DocumentStatus extends Model
{
  use HasFactory;

  protected $table = 'document_statuses';
  protected $primaryKey = 'doc_status_id';
  public $timestamps = false;

  protected $fillable = [
    'shipment_doc_id',
    'status_id',
    'is_current',
    'changed_at',
    'changed_by',
  ];

  protected $casts = [
    'changed_at' => 'datetime',
    'is_current' => 'boolean',
  ];

  public function shipmentDocument()
  {
    return $this->belongsTo(ShipmentDocument::class, 'shipment_doc_id', 'shipment_doc_id');
  }

  public function status()
  {
    return $this->belongsTo(DocumentStatusList::class, 'status_id', 'status_id');
  }

  public function changedByUser()
  {
    return $this->belongsTo(User::class, 'changed_by', 'id');
  }

  public function scopeCurrent($query)
  {
    return $query->where('is_current', true);
  }
}
