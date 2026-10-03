<?php

namespace App\Console\Commands;

use Database\Seeders\MoroccanDemoDataSeeder;
use Illuminate\Console\Command;

class SeedMoroccanDemoCommand extends Command
{
    protected $signature = 'eduadmin:seed-moroccan-demo
                            {--force : Skip confirmation prompt}';

    protected $description = 'Replace demo users with Moroccan names and populate realistic data using existing courses';

    public function handle(): int
    {
        if (! $this->option('force') && ! $this->confirm(
            'This will replace all non-admin users and regenerate demo activity data. Continue?',
            false
        )) {
            $this->info('Operation cancelled.');

            return self::SUCCESS;
        }

        $this->call('db:seed', ['--class' => MoroccanDemoDataSeeder::class, '--force' => true]);

        $this->newLine();
        $this->info('Moroccan demo data seeded successfully.');
        $this->line('Default password for all demo users: password');
        $this->line('Example student: youssef.el.amrani@student.eduadmin.com');
        $this->line('Example teacher: mohamed.el.alaoui@teacher.eduadmin.com');
        $this->line('Example parent: ahmed.el.amrani@parent.eduadmin.com');

        return self::SUCCESS;
    }
}
