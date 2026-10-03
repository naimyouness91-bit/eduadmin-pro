<?php

namespace App\Console\Commands;

use App\Services\FreshDeploymentService;
use Illuminate\Console\Command;

class PrepareFreshDeploymentCommand extends Command
{
    protected $signature = 'eduadmin:prepare-fresh-deployment
                            {--force : Skip confirmation prompt}';

    protected $description = 'Remove all demo/sample data and keep only the Super Admin account and system settings';

    public function handle(FreshDeploymentService $service): int
    {
        if (! $this->option('force') && ! $this->confirm(
            'This will permanently delete all students, teachers, parents, courses, and related records. Continue?',
            false
        )) {
            $this->info('Operation cancelled.');

            return self::SUCCESS;
        }

        try {
            $result = $service->purgeDemoData();
        } catch (\Throwable $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        $this->newLine();
        $this->info('Fresh deployment preparation complete.');
        $this->line('Super Admin: '.$result['super_admin_email']);
        $this->line('Users remaining: '.$result['users_remaining']);
        $this->line('Tables cleared: '.count($result['tables_cleared']));
        $this->newLine();
        $this->comment('See docs/FRESH_DEPLOYMENT.md for adding Students, Teachers, and Parents.');

        return self::SUCCESS;
    }
}
