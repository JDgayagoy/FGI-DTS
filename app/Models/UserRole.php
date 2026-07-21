<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserRole extends Model
{
  use HasFactory;

  protected $table = 'user_roles';
  public $timestamps = false;
  protected $primaryKey = null;
  public $incrementing = false;

  protected $fillable = [
    'user_id',
    'role_id',
  ];

  public function user()
  {
    return $this->belongsTo(User::class, 'user_id', 'id');
  }

  public function role()
  {
    return $this->belongsTo(Role::class, 'role_id', 'role_id');
  }
}
