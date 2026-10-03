<?php

namespace App\Services;

use App\Models\ParentModel;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class ParentService
{
    public function createParent(array $data): ParentModel
    {
        return DB::transaction(function () use ($data) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $data['password'],
                'phone' => $data['phone'] ?? null,
                'address' => $data['address'] ?? null,
                'email_verified_at' => now(),
            ]);
            $user->forceFill([
                'role' => 'parent',
                'is_active' => $data['is_active'] ?? true,
            ])->save();

            $parent = ParentModel::create([
                'user_id' => $user->id,
                'occupation' => $data['occupation'] ?? null,
                'relationship' => $data['relationship'] ?? 'guardian',
                'national_id' => $data['national_id'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            if (! empty($data['student_ids'])) {
                $this->syncStudents($parent, $data['student_ids'], $data['relationship'] ?? 'guardian');
            }

            return $parent->load(['user', 'students.user']);
        });
    }

    public function updateParent(ParentModel $parent, array $data): ParentModel
    {
        return DB::transaction(function () use ($parent, $data) {
            $userFields = ['name', 'email', 'password', 'phone', 'address', 'is_active'];
            if ($userPayload = Arr::only($data, $userFields)) {
                $parent->user->updateProfileAttributes($userPayload);
            }

            $parentFields = ['occupation', 'relationship', 'national_id', 'notes'];
            if ($parentPayload = Arr::only($data, $parentFields)) {
                $parent->update($parentPayload);
            }

            if (array_key_exists('student_ids', $data)) {
                $this->syncStudents($parent, $data['student_ids'] ?? [], $data['relationship'] ?? $parent->relationship ?? 'guardian');
            }

            return $parent->fresh(['user', 'students.user']);
        });
    }

    /**
     * @param  array<int, int>  $studentIds
     */
    public function syncStudents(ParentModel $parent, array $studentIds, string $relationship = 'guardian'): void
    {
        $studentIds = array_values(array_unique(array_map('intval', $studentIds)));
        $sync = [];

        foreach ($studentIds as $index => $studentId) {
            if (Student::whereKey($studentId)->exists()) {
                $sync[$studentId] = [
                    'relationship' => $relationship,
                    'is_primary' => $index === 0,
                ];
            }
        }

        $parent->students()->sync($sync);
    }

    public function deleteParent(ParentModel $parent): void
    {
        DB::transaction(function () use ($parent) {
            $parent->students()->detach();
            $user = $parent->user;
            $parent->delete();
            $user?->delete();
        });
    }
}
