<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DocumentStatusList extends Model
{
  use HasFactory;

  protected $table = 'document_status_list';
  protected $primaryKey = 'status_id';
  public $timestamps = false;

  protected $fillable = [
    'status_name',
  ];

  public function documentStatuses()
  {
    return $this->hasMany(DocumentStatus::class, 'status_id', 'status_id');
  }
}
