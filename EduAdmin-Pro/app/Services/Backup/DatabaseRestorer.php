<?php

namespace App\Services\Backup;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;
use RuntimeException;

class DatabaseRestorer
{
    public function restore(string $extractDir, string $databaseRelativePath): void
    {
        $driver = config('database.default');
        $connection = config("database.connections.{$driver}");
        $fullPath = $extractDir.DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $databaseRelativePath);

        if (! File::exists($fullPath)) {
            throw new RuntimeException('Database file missing in backup archive.');
        }

        if (str_ends_with(strtolower($databaseRelativePath), '.sql')) {
            $this->restoreSqlFile($fullPath);

            return;
        }

        match ($connection['driver'] ?? $driver) {
            'sqlite' => $this->restoreSqlite($connection, $fullPath),
            'mysql' => $this->restoreMysql($connection, $fullPath),
            default => throw new RuntimeException("Unsupported database driver: {$driver}"),
        };
    }

    protected function restoreSqlFile(string $sqlPath): void
    {
        $sql = File::get($sqlPath);
        DB::disconnect();
        DB::unprepared($sql);
    }

    /**
     * @param  array<string, mixed>  $connection
     */
    protected function restoreSqlite(array $connection, string $backupDbPath): void
    {
        $database = $connection['database'] ?? database_path('database.sqlite');

        if ($database === ':memory:') {
            $this->restoreSqlFile($backupDbPath);

            return;
        }

        DB::disconnect();

        if (is_file($database)) {
            File::copy($database, $database.'.pre-restore-'.time());
        }

        File::copy($backupDbPath, $database);
    }

    /**
     * @param  array<string, mixed>  $connection
     */
    protected function restoreMysql(array $connection, string $sqlPath): void
    {
        $mysql = $this->findMysql();

        if ($mysql) {
            $result = Process::timeout(600)->run([
                $mysql,
                '-h', $connection['host'] ?? '127.0.0.1',
                '-P', (string) ($connection['port'] ?? 3306),
                '-u', $connection['username'] ?? 'root',
                ...($connection['password'] ? ['-p'.$connection['password']] : []),
                $connection['database'] ?? '',
                '-e', 'source '.$sqlPath,
            ]);

            if ($result->successful()) {
                return;
            }
        }

        $sql = File::get($sqlPath);
        DB::unprepared($sql);
    }

    protected function findMysql(): ?string
    {
        foreach (['mysql', 'C:\\xampp\\mysql\\bin\\mysql.exe', 'C:\\laragon\\bin\\mysql\\mysql-8.0.30-winx64\\bin\\mysql.exe'] as $bin) {
            $result = Process::run([$bin, '--version']);
            if ($result->successful()) {
                return $bin;
            }
        }

        return null;
    }
}
