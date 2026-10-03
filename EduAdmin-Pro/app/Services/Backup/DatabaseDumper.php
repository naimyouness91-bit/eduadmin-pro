<?php

namespace App\Services\Backup;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;
use RuntimeException;

class DatabaseDumper
{
    public function dump(string $targetPath): string
    {
        $driver = config('database.default');
        $connection = config("database.connections.{$driver}");

        return match ($connection['driver'] ?? $driver) {
            'sqlite' => $this->dumpSqlite($connection, $targetPath),
            'mysql' => $this->dumpMysql($connection, $targetPath),
            default => throw new RuntimeException("Unsupported database driver: {$driver}"),
        };
    }

    /**
     * @param  array<string, mixed>  $connection
     */
    protected function dumpSqlite(array $connection, string $targetDir): string
    {
        $database = $connection['database'] ?? database_path('database.sqlite');

        if ($database === ':memory:') {
            File::ensureDirectoryExists($targetDir.'/database');
            $outputFile = $targetDir.'/database/database.sql';
            $this->dumpSqlViaPhp($outputFile);

            return 'database/database.sql';
        }

        if (! is_file($database)) {
            throw new RuntimeException('SQLite database file not found.');
        }

        $relative = 'database/database.sqlite';
        File::ensureDirectoryExists($targetDir.'/database');
        File::copy($database, $targetDir.'/'.$relative);

        return $relative;
    }

    protected function dumpSqlViaPhp(string $outputFile): void
    {
        $driver = DB::connection()->getDriverName();
        $sql = "-- EduAdmin Pro SQL backup\n";

        if ($driver === 'mysql') {
            $sql .= "SET FOREIGN_KEY_CHECKS=0;\n\n";
        }

        $tables = $this->listTables();

        foreach ($tables as $name) {
            if ($driver === 'sqlite') {
                $create = DB::selectOne("SELECT sql FROM sqlite_master WHERE type='table' AND name = ?", [$name]);
                if ($create?->sql) {
                    $sql .= "DROP TABLE IF EXISTS \"{$name}\";\n{$create->sql};\n\n";
                }
            } elseif ($driver === 'mysql') {
                $create = DB::selectOne("SHOW CREATE TABLE `{$name}`");
                $createSql = $create->{'Create Table'} ?? null;
                if ($createSql) {
                    $sql .= "DROP TABLE IF EXISTS `{$name}`;\n{$createSql};\n\n";
                }
            }

            foreach (DB::table($name)->cursor() as $row) {
                $row = (array) $row;
                $columns = array_map(fn ($c) => '`'.$c.'`', array_keys($row));
                $values = array_map(fn ($v) => $v === null ? 'NULL' : DB::getPdo()->quote((string) $v), array_values($row));
                $sql .= 'INSERT INTO `'.$name.'` ('.implode(',', $columns).') VALUES ('.implode(',', $values).");\n";
            }
            $sql .= "\n";
        }

        if ($driver === 'mysql') {
            $sql .= "SET FOREIGN_KEY_CHECKS=1;\n";
        }

        File::put($outputFile, $sql);
    }

    /**
     * @return array<int, string>
     */
    protected function listTables(): array
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'sqlite') {
            return array_column(
                DB::select("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"),
                'name'
            );
        }

        $dbName = config('database.connections.'.config('database.default').'.database');
        $key = 'Tables_in_'.$dbName;

        return array_map(fn ($t) => $t->{$key}, DB::select('SHOW TABLES'));
    }

    /**
     * @param  array<string, mixed>  $connection
     */
    protected function dumpMysql(array $connection, string $targetDir): string
    {
        File::ensureDirectoryExists($targetDir.'/database');
        $outputFile = $targetDir.'/database/database.sql';

        $mysqldump = $this->findMysqldump();

        if ($mysqldump) {
            $result = Process::timeout(300)->run([
                $mysqldump,
                '-h', $connection['host'] ?? '127.0.0.1',
                '-P', (string) ($connection['port'] ?? 3306),
                '-u', $connection['username'] ?? 'root',
                ...($connection['password'] ? ['-p'.$connection['password']] : []),
                '--single-transaction',
                '--routines=0',
                '--triggers=0',
                $connection['database'] ?? '',
            ]);

            if ($result->successful()) {
                File::put($outputFile, $result->output());

                return 'database/database.sql';
            }
        }

        $this->dumpSqlViaPhp($outputFile);

        return 'database/database.sql';
    }

    protected function findMysqldump(): ?string
    {
        foreach (['mysqldump', 'C:\\xampp\\mysql\\bin\\mysqldump.exe', 'C:\\laragon\\bin\\mysql\\mysql-8.0.30-winx64\\bin\\mysqldump.exe'] as $bin) {
            $result = Process::run([$bin, '--version']);
            if ($result->successful()) {
                return $bin;
            }
        }

        return null;
    }
}
