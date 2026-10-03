<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::withTrashed()->updateOrCreate(
            ['email' => 'superadmin@eduadmin.com'],
            [
                'name' => 'Super Admin',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );
        $user->forceFill(['role' => 'super_admin', 'is_active' => true])->save();

        if ($user->trashed()) {
            $user->restore();
        }
    }
}
