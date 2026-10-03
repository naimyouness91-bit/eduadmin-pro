<?php

namespace App\Services\Backup;

use App\Models\SystemBackup;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use ZipArchive;

class BackupRestoreService
{
    public function __construct(
        protected DatabaseDumper $databaseDumper,
        protected DatabaseRestorer $databaseRestorer
    ) {}

    public function create(?User $user = null, bool $includeFiles = true): SystemBackup
    {
        $tempDir = storage_path('app/backup-temp/'.Str::uuid());
        File::ensureDirectoryExists($tempDir);

        try {
            $manifest = [
                'version' => 1,
                'app' => config('app.name', 'EduAdmin Pro'),
                'created_at' => now()->toIso8601String(),
                'database_driver' => config('database.connections.'.config('database.default').'.driver'),
                'includes_files' => $includeFiles,
                'files' => [],
            ];

            $dbRelative = $this->databaseDumper->dump($tempDir);
            $manifest['database_file'] = $dbRelative;
            $manifest['files'][$dbRelative] = $this->hashFile($tempDir.'/'.$dbRelative);

            if ($includeFiles) {
                $publicRoot = storage_path('app/public');
                if (File::isDirectory($publicRoot)) {
                    $destFiles = $tempDir.'/files/public';
                    File::ensureDirectoryExists($destFiles);
                    File::copyDirectory($publicRoot, $destFiles);
                    $this->addDirectoryHashes($destFiles, 'files/public', $manifest['files']);
                }
            }

            $manifestPath = $tempDir.'/manifest.json';
            File::put($manifestPath, json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            $manifest['files']['manifest.json'] = hash('sha256', File::get($manifestPath));

            $filename = 'eduadmin_backup_'.now()->format('Y-m-d_His').'.zip';
            $zipPath = $filename;

            $this->createZipFromDirectory($tempDir, Storage::disk('backups')->path($zipPath));

            $fullZip = Storage::disk('backups')->path($zipPath);
            $checksum = hash_file('sha256', $fullZip);

            return SystemBackup::create([
                'user_id' => $user?->id,
                'filename' => $filename,
                'disk' => 'backups',
                'path' => $zipPath,
                'size_bytes' => filesize($fullZip) ?: 0,
                'database_driver' => $manifest['database_driver'],
                'includes_files' => $includeFiles,
                'checksum' => $checksum,
                'status' => SystemBackup::STATUS_COMPLETED,
                'notes' => 'Database and storage backup',
            ]);
        } catch (\Throwable $e) {
            throw new RuntimeException('Backup failed: '.$e->getMessage(), 0, $e);
        } finally {
            File::deleteDirectory($tempDir);
        }
    }

    public function restore(SystemBackup $backup, bool $confirmed): array
    {
        if (! $confirmed) {
            throw new RuntimeException('Restore requires explicit confirmation.');
        }

        if (! Storage::disk($backup->disk)->exists($backup->path)) {
            throw new RuntimeException('Backup file not found.');
        }

        $zipPath = $backup->fullPath();
        $actualChecksum = hash_file('sha256', $zipPath);

        if ($backup->checksum && ! hash_equals($backup->checksum, $actualChecksum)) {
            throw new RuntimeException('Backup file integrity check failed (checksum mismatch).');
        }

        $extractDir = storage_path('app/backup-temp/restore-'.Str::uuid());
        File::ensureDirectoryExists($extractDir);

        try {
            $zip = new ZipArchive;
            if ($zip->open($zipPath) !== true) {
                throw new RuntimeException('Unable to open backup archive.');
            }
            $this->safeExtractZip($zip, $extractDir);
            $zip->close();

            $manifest = $this->loadAndVerifyManifest($extractDir);

            $preRestore = $this->create(auth()->user() ?? null, true);

            $dbFile = $manifest['database_file'] ?? (
                str_starts_with($manifest['database_driver'] ?? '', 'sqlite')
                    ? 'database/database.sqlite'
                    : 'database/database.sql'
            );

            $this->databaseRestorer->restore($extractDir, $dbFile);

            if ($manifest['includes_files'] ?? false) {
                $filesSource = $extractDir.'/files/public';
                if (File::isDirectory($filesSource)) {
                    $publicRoot = storage_path('app/public');
                    File::ensureDirectoryExists($publicRoot);
                    File::copyDirectory($filesSource, $publicRoot);
                }
            }

            return [
                'message' => 'System restored successfully from backup.',
                'restored_from' => $backup->id,
                'pre_restore_backup_id' => $preRestore->id,
            ];
        } catch (\Throwable $e) {
            throw new RuntimeException('Restore failed: '.$e->getMessage(), 0, $e);
        } finally {
            File::deleteDirectory($extractDir);
        }
    }

    public function restoreFromUpload(UploadedFile $file, bool $confirmed): array
    {
        if (! $confirmed) {
            throw new RuntimeException('Restore requires explicit confirmation.');
        }

        $tempZip = storage_path('app/backup-temp/upload-'.Str::uuid().'.zip');
        File::ensureDirectoryExists(dirname($tempZip));
        $file->move(dirname($tempZip), basename($tempZip));

        $extractDir = storage_path('app/backup-temp/restore-'.Str::uuid());
        File::ensureDirectoryExists($extractDir);

        try {
            $zip = new ZipArchive;
            if ($zip->open($tempZip) !== true) {
                throw new RuntimeException('Invalid backup archive.');
            }
            $this->safeExtractZip($zip, $extractDir);
            $zip->close();

            $manifest = $this->loadAndVerifyManifest($extractDir);
            $preRestore = $this->create(auth()->user() ?? null, true);

            $dbFile = $manifest['database_file'] ?? 'database/database.sql';
            $this->databaseRestorer->restore($extractDir, $dbFile);

            if ($manifest['includes_files'] ?? false) {
                $filesSource = $extractDir.'/files/public';
                if (File::isDirectory($filesSource)) {
                    File::copyDirectory($filesSource, storage_path('app/public'));
                }
            }

            return [
                'message' => 'System restored from uploaded backup.',
                'pre_restore_backup_id' => $preRestore->id,
            ];
        } finally {
            File::delete($tempZip);
            File::deleteDirectory($extractDir);
        }
    }

    public function delete(SystemBackup $backup): void
    {
        Storage::disk($backup->disk)->delete($backup->path);
        $backup->delete();
    }

    /**
     * @return array<string, mixed>
     */
    protected function loadAndVerifyManifest(string $extractDir): array
    {
        $manifestPath = $extractDir.'/manifest.json';

        if (! File::exists($manifestPath)) {
            throw new RuntimeException('Invalid backup: manifest.json missing.');
        }

        $manifest = json_decode(File::get($manifestPath), true);

        if (! is_array($manifest) || empty($manifest['version'])) {
            throw new RuntimeException('Invalid backup manifest.');
        }

        foreach ($manifest['files'] ?? [] as $relative => $expectedHash) {
            if ($relative === 'manifest.json') {
                continue;
            }
            $path = $extractDir.'/'.str_replace('/', DIRECTORY_SEPARATOR, $relative);
            if (! File::exists($path)) {
                throw new RuntimeException("Backup file missing: {$relative}");
            }
            $actual = $this->hashFile($path);
            if (! hash_equals($expectedHash, $actual)) {
                throw new RuntimeException("Integrity check failed for: {$relative}");
            }
        }

        return $manifest;
    }

    protected function createZipFromDirectory(string $sourceDir, string $zipPath): void
    {
        File::ensureDirectoryExists(dirname($zipPath));

        $zip = new ZipArchive;
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new RuntimeException('Could not create zip archive.');
        }

        $files = File::allFiles($sourceDir);
        foreach ($files as $file) {
            $relative = Str::after($file->getPathname(), $sourceDir.DIRECTORY_SEPARATOR);
            $zip->addFile($file->getPathname(), str_replace('\\', '/', $relative));
        }

        $zip->close();
    }

  /**
     * @param  array<string, string>  $hashes
     */
    protected function addDirectoryHashes(string $directory, string $prefix, array &$hashes): void
    {
        if (! File::isDirectory($directory)) {
            return;
        }

        foreach (File::allFiles($directory) as $file) {
            $relative = $prefix.'/'.Str::after($file->getPathname(), $directory.DIRECTORY_SEPARATOR);
            $hashes[str_replace('\\', '/', $relative)] = hash_file('sha256', $file->getPathname());
        }
    }

    protected function hashFile(string $path): string
    {
        if (! File::exists($path)) {
            throw new RuntimeException("Cannot hash missing file: {$path}");
        }

        return hash_file('sha256', $path);
    }

    protected function safeExtractZip(ZipArchive $zip, string $destination): void
    {
        File::ensureDirectoryExists($destination);
        $destinationReal = realpath($destination);
        if ($destinationReal === false) {
            throw new RuntimeException('Invalid extraction directory.');
        }

        $destinationPrefix = rtrim(str_replace('\\', '/', $destinationReal), '/').'/';

        for ($i = 0; $i < $zip->numFiles; $i++) {
            $entryName = str_replace('\\', '/', (string) $zip->getNameIndex($i));
            if ($entryName === '' || str_contains($entryName, '..') || str_starts_with($entryName, '/')) {
                throw new RuntimeException('Invalid archive entry path.');
            }

            $resolved = str_replace('\\', '/', $destinationReal.'/'.$entryName);
            if (! str_starts_with($resolved.'/', $destinationPrefix)) {
                throw new RuntimeException('Archive entry escapes extraction directory.');
            }
        }

        if (! $zip->extractTo($destinationReal)) {
            throw new RuntimeException('Failed to extract backup archive.');
        }
    }
}
