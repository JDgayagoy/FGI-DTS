<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;

#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, TwoFactorAuthenticatable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    public function roles()
    {
        return $this->belongsToMany(Role::class, 'user_roles', 'user_id', 'role_id');
    }

    public function documentStatuses()
    {
        return $this->hasMany(DocumentStatus::class, 'changed_by', 'id');
    }

    /**
     * Check if user has a specific role.
     */
    public function hasRole($roleName): bool
    {
        return $this->roles()->where('role_name', $roleName)->exists();
    }

    /**
     * Check if user has a specific permission.
     */
    public function hasPermission(string $action, string $resource): bool
    {
        // Eager load roles and permissions if not loaded
        if (! $this->relationLoaded('roles')) {
            $this->load('roles.permissions');
        }

        foreach ($this->roles as $role) {
            foreach ($role->permissions as $permission) {
                if ($permission->action === $action && $permission->resource === $resource) {
                    return true;
                }
            }
        }

        return false;
    }
}
