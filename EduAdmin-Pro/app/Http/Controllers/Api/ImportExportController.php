<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DataImportJob;
use App\Services\Excel\DataExportService;
use App\Services\Excel\DataImportProcessor;
use App\Services\Excel\ImportDefinitionRegistry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ImportExportController extends Controller
{
    public function __construct(
        protected DataImportProcessor $importProcessor,
        protected DataExportService $exportService
    ) {}

    public function types(): JsonResponse
    {
        return response()->json([
            'import' => collect(ImportDefinitionRegistry::definitions())
                ->map(fn ($d, $key) => ['type' => $key, 'label' => $d['label']])
                ->values(),
            'export' => collect(ImportDefinitionRegistry::exportDefinitions())
                ->map(fn ($d, $key) => ['type' => $key, 'label' => $d['label']])
                ->values(),
        ]);
    }

    public function template(string $type): StreamedResponse
    {
        if (! ImportDefinitionRegistry::isValidImportType($type)) {
            abort(404, 'Invalid template type.');
        }

        return $this->exportService->template($type);
    }

    public function export(string $type): StreamedResponse
    {
        if (! ImportDefinitionRegistry::isValidExportType($type)) {
            abort(404, 'Invalid export type.');
        }

        return $this->exportService->export($type);
    }

    public function import(Request $request, string $type): JsonResponse
    {
        if (! ImportDefinitionRegistry::isValidImportType($type)) {
            return response()->json(['message' => 'Invalid import type.'], 422);
        }

        $request->validate([
            'file' => [
                'required',
                'file',
                'max:10240',
                'mimes:xlsx,xls,csv,txt',
            ],
        ]);

        $file = $request->file('file');

        $job = DataImportJob::create([
            'user_id' => $request->user()->id,
            'type' => $type,
            'status' => DataImportJob::STATUS_PENDING,
            'original_filename' => $file->getClientOriginalName(),
        ]);

        $job = $this->importProcessor->process($job, $file);

        return response()->json([
            'message' => $job->message ?? 'Import processed.',
            'data' => $this->jobPayload($job),
        ], $job->status === DataImportJob::STATUS_FAILED ? 422 : 200);
    }

    public function jobStatus(DataImportJob $job): JsonResponse
    {
        if ($job->user_id !== request()->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return response()->json(['data' => $this->jobPayload($job)]);
    }

    public function recentJobs(Request $request): JsonResponse
    {
        $jobs = DataImportJob::query()
            ->where('user_id', $request->user()->id)
            ->latest()
            ->limit(10)
            ->get()
            ->map(fn ($job) => $this->jobPayload($job));

        return response()->json(['data' => $jobs]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function jobPayload(DataImportJob $job): array
    {
        return [
            'id' => $job->id,
            'type' => $job->type,
            'status' => $job->status,
            'progress_percent' => $job->progressPercent(),
            'total_rows' => $job->total_rows,
            'processed_rows' => $job->processed_rows,
            'success_count' => $job->success_count,
            'skipped_count' => $job->skipped_count,
            'failed_count' => $job->failed_count,
            'errors' => $job->errors ?? [],
            'message' => $job->message,
            'original_filename' => $job->original_filename,
            'created_at' => $job->created_at,
        ];
    }
}
