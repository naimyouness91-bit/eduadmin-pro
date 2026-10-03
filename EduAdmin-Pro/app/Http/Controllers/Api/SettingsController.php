<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function index(): JsonResponse
    {
        $settings = SystemSetting::query()
            ->orderBy('group')
            ->orderBy('key')
            ->get()
            ->groupBy('group')
            ->map(fn ($items, $group) => $items->map(fn (SystemSetting $s) => [
                'key' => $s->key,
                'value' => SystemSetting::get($s->key),
                'type' => $s->type,
                'group' => $s->group,
            ])->values());

        return response()->json(['data' => $settings]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'settings' => ['required', 'array', 'min:1'],
            'settings.*.key' => ['required', 'string'],
            'settings.*.value' => ['nullable'],
            'settings.*.type' => ['sometimes', 'string'],
            'settings.*.group' => ['sometimes', 'string'],
        ]);

        foreach ($data['settings'] as $item) {
            SystemSetting::set(
                $item['key'],
                $item['value'] ?? null,
                $item['type'] ?? 'string',
                $item['group'] ?? 'general'
            );
        }

        return response()->json(['message' => 'Settings updated successfully.']);
    }
}
