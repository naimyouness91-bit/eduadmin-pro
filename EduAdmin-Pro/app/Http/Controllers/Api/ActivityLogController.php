<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    public function __construct(
        protected ActivityLogService $activityLog
    ) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(
            $this->activityLog->filteredQuery($request)
                ->paginate($request->integer('per_page', 20))
        );
    }
}
