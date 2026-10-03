<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application for a fresh production deployment.
     * Demo data seeders are intentionally excluded.
     */
    public function run(): void
    {
        $this->call([
            SystemSettingSeeder::class,
            UserSeeder::class,
            SampleLoginAccountsSeeder::class,
        ]);
    }
}
