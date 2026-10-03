<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\View\View;

class ActivityLogViewController extends Controller
{
    public function __construct(
        protected ActivityLogService $activityLog
    ) {}

    public function index(Request $request): View
    {
        $user = $request->user();

        abort_unless($user && ($user->isSuperAdmin() || $user->isAdmin()), 403);

        $logs = $this->activityLog->filteredQuery($request)
            ->paginate(25)
            ->withQueryString();

        $actorIds = $this->activityLog->filteredQuery($request)
            ->whereNotNull('user_id')
            ->distinct()
            ->pluck('user_id');

        $actors = User::query()
            ->whereIn('id', $actorIds)
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role']);

        return view('admin.activity-log', [
            'logs' => $logs,
            'filters' => $request->only(['search', 'action', 'user_id', 'model_type', 'from', 'to']),
            'actionOptions' => $this->activityLog->actionLabels(),
            'actors' => $actors,
        ]);
    }
}
