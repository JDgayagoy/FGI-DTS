<?php

namespace App\Console\Commands;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Console\Command;

class SeedLogsPermission extends Command
{
    protected $signature = 'seed:logs-permission';

    protected $description = 'Seed the view_logs permission and assign to Super Admin and Supply chain manager roles';

    public function handle(): int
    {
        $permission = Permission::firstOrCreate(
            ['name' => 'view_logs'],
            ['resource' => 'logs', 'action' => 'view'],
        );

        $roles = Role::whereIn('role_name', ['Super Admin', 'Supply chain manager'])->get();

        foreach ($roles as $role) {
            $role->permissions()->syncWithoutDetaching([$permission->permission_id]);
        }

        $this->info("Done. Permission ID: {$permission->permission_id}, assigned to {$roles->count()} role(s).");

        return self::SUCCESS;
    }
}
