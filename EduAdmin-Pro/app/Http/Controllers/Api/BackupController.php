<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SystemBackup;
use App\Services\Backup\BackupRestoreService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class BackupController extends Controller
{
    public function __construct(
        protected BackupRestoreService $backupService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $backups = SystemBackup::query()
            ->with('user:id,name,email')
            ->latest()
            ->paginate($request->integer('per_page', 20));

        return response()->json($backups);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'include_files' => ['sometimes', 'boolean'],
        ]);

        try {
            $backup = $this->backupService->create(
                $request->user(),
                $data['include_files'] ?? true
            );

            return response()->json([
                'message' => 'Backup created successfully.',
                'data' => $backup->load('user:id,name,email'),
            ], 201);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function download(SystemBackup $backup): StreamedResponse|JsonResponse
    {
        if (! Storage::disk($backup->disk)->exists($backup->path)) {
            return response()->json(['message' => 'Backup file not found.'], 404);
        }

        return Storage::disk($backup->disk)->download($backup->path, $backup->filename);
    }

    public function restore(Request $request, SystemBackup $backup): JsonResponse
    {
        $data = $request->validate([
            'confirm' => ['required', 'accepted'],
        ]);

        try {
            $result = $this->backupService->restore($backup, true);

            return response()->json([
                'message' => $result['message'],
                'data' => $result,
            ]);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function restoreUpload(Request $request): JsonResponse
    {
        $data = $request->validate([
            'file' => ['required', 'file', 'mimes:zip', 'max:512000'],
            'confirm' => ['required', 'accepted'],
        ]);

        try {
            $result = $this->backupService->restoreFromUpload($data['file'], true);

            return response()->json([
                'message' => $result['message'],
                'data' => $result,
            ]);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function destroy(SystemBackup $backup): JsonResponse
    {
        $this->backupService->delete($backup);

        return response()->json(['message' => 'Backup deleted successfully.']);
    }
}
