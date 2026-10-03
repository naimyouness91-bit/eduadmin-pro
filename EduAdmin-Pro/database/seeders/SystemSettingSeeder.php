<?php

namespace Database\Seeders;

use App\Models\SystemSetting;
use Illuminate\Database\Seeder;

class SystemSettingSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            ['school_name', 'EduAdmin Pro Academy', 'string', 'general'],
            ['school_email', 'contact@eduadmin.com', 'string', 'general'],
            ['school_phone', '+1 (555) 010-2000', 'string', 'general'],
            ['school_address', '123 Education Avenue, Learning City, LC 10001', 'string', 'general'],
            ['academic_year', '2024-2025', 'string', 'academic'],
            ['current_semester', 'Spring 2025', 'string', 'academic'],
            ['timezone', 'UTC', 'string', 'general'],
            ['allow_registration', '1', 'boolean', 'security'],
            ['require_2fa', '0', 'boolean', 'security'],
            ['max_file_size_mb', '10', 'integer', 'uploads'],
        ];

        foreach ($settings as [$key, $value, $type, $group]) {
            SystemSetting::set($key, $value, $type, $group);
        }
    }
}
