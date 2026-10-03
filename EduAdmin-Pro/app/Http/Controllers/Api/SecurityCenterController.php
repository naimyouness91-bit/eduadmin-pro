<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Security\SecurityCenterService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

class SecurityCenterController extends Controller
{
    public function __construct(
        protected SecurityCenterService $security
    ) {}

    public function overview(): JsonResponse
    {
        return response()->json(['data' => $this->security->overview()]);
    }

    public function loginHistory(Request $request): JsonResponse
    {
        return response()->json(
            $this->security->loginHistoryQuery($request)
                ->paginate($request->integer('per_page', 20))
        );
    }

    public function failedAttempts(Request $request): JsonResponse
    {
        return response()->json(
            $this->security->failedAttemptsQuery($request)
                ->paginate($request->integer('per_page', 20))
        );
    }

    public function lastLogins(Request $request): JsonResponse
    {
        return response()->json(
            $this->security->lastLoginsQuery($request)
                ->paginate($request->integer('per_page', 20))
        );
    }

    public function sessions(Request $request): JsonResponse
    {
        $paginator = $this->security->activeSessionsQuery($request)
            ->paginate($request->integer('per_page', 20));

        $currentTokenId = $request->user()?->currentAccessToken()?->id;

        $paginator->getCollection()->transform(function (PersonalAccessToken $token) use ($currentTokenId) {
            $formatted = $this->security->formatSession($token);
            $formatted['is_current'] = $currentTokenId && $token->id === $currentTokenId;

            return $formatted;
        });

        return response()->json($paginator);
    }

    public function devices(Request $request): JsonResponse
    {
        $devices = $this->security->connectedDevicesQuery()->values();

        if ($request->filled('user_id')) {
            $devices = $devices->where('user_id', $request->integer('user_id'))->values();
        }

        if ($search = $request->query('search')) {
            $q = strtolower($search);
            $devices = $devices->filter(function ($d) use ($q) {
                return str_contains(strtolower($d['user_name'] ?? ''), $q)
                    || str_contains(strtolower($d['user_email'] ?? ''), $q)
                    || str_contains(strtolower($d['device_name'] ?? ''), $q);
            })->values();
        }

        return response()->json(['data' => $devices]);
    }

    public function accountActivity(Request $request): JsonResponse
    {
        return response()->json(
            $this->security->accountActivityQuery($request)
                ->paginate($request->integer('per_page', 20))
        );
    }

    public function revokeSession(Request $request, int $tokenId): JsonResponse
    {
        $token = PersonalAccessToken::query()
            ->where('tokenable_type', \App\Models\User::class)
            ->where('id', $tokenId)
            ->first();

        if (! $token) {
            return response()->json(['message' => 'Session not found.'], 404);
        }

        if ($request->user()?->currentAccessToken()?->id === $token->id) {
            return response()->json(['message' => 'Cannot revoke your current session from here. Use logout instead.'], 422);
        }

        $token->delete();

        return response()->json(['message' => 'Session revoked successfully.']);
    }
}
