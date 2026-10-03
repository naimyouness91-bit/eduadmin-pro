<?php

namespace App\Services;

use App\Models\Course;
use App\Models\Message;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class SearchService
{
    public function search(User $user, string $query, int $limit = 6): array
    {
        $q = trim($query);
        $limit = max(1, min(10, $limit));

        if (strlen($q) < 2) {
            return $this->emptyPayload($q);
        }

        $students = $this->searchStudents($user, $q, $limit);
        $teachers = $this->searchTeachers($user, $q, $limit);
        $courses = $this->searchCourses($user, $q, $limit);
        $messages = $this->searchMessages($user, $q, $limit);

        return [
            'query' => $q,
            'students' => $students->values()->all(),
            'teachers' => $teachers->values()->all(),
            'courses' => $courses->values()->all(),
            'messages' => $messages->values()->all(),
            'total' => $students->count() + $teachers->count() + $courses->count() + $messages->count(),
        ];
    }

    protected function searchStudents(User $user, string $q, int $limit): Collection
    {
        if ($user->hasRole(['super_admin', 'admin', 'teacher'])) {
            return Student::query()
                ->select(['id', 'student_id', 'user_id', 'grade_level'])
                ->with('user:id,name,email')
                ->whereHas('user', fn ($uq) => $uq->whereNull('deleted_at'))
                ->where(function ($query) use ($q) {
                    $query->where('student_id', 'like', "%{$q}%")
                        ->orWhereHas('user', fn ($uq) => $uq->where('name', 'like', "%{$q}%")
                            ->orWhere('email', 'like', "%{$q}%"));
                })
                ->when($user->isTeacher() && $user->teacher, function ($query) use ($user) {
                    $courseIds = $user->teacher->courses()->pluck('courses.id');
                    $query->whereHas('courses', fn ($cq) => $cq->whereIn('courses.id', $courseIds));
                })
                ->limit($limit)
                ->get()
                ->map(fn (Student $s) => $this->formatStudent($s));
        }

        if ($user->isParent() && $user->parent) {
            return $user->parent->students()
                ->select(['students.id', 'students.student_id', 'students.user_id', 'students.grade_level'])
                ->with('user:id,name,email')
                ->where(function ($query) use ($q) {
                    $query->where('students.student_id', 'like', "%{$q}%")
                        ->orWhereHas('user', fn ($uq) => $uq->where('name', 'like', "%{$q}%")
                            ->orWhere('email', 'like', "%{$q}%"));
                })
                ->limit($limit)
                ->get()
                ->map(fn (Student $s) => $this->formatStudent($s));
        }

        if ($user->isStudent() && $user->student) {
            $s = $user->student->load('user:id,name,email');
            $matches = str_contains(strtolower($s->student_id ?? ''), strtolower($q))
                || str_contains(strtolower($s->user?->name ?? ''), strtolower($q));

            return $matches ? collect([$this->formatStudent($s)]) : collect();
        }

        return collect();
    }

    protected function searchTeachers(User $user, string $q, int $limit): Collection
    {
        if (! $user->hasRole(['super_admin', 'admin'])) {
            return collect();
        }

        return Teacher::query()
            ->select(['id', 'teacher_id', 'user_id', 'department'])
            ->with('user:id,name,email')
            ->whereHas('user', fn ($uq) => $uq->whereNull('deleted_at'))
            ->where(function ($query) use ($q) {
                $query->where('teacher_id', 'like', "%{$q}%")
                    ->orWhere('department', 'like', "%{$q}%")
                    ->orWhereHas('user', fn ($uq) => $uq->where('name', 'like', "%{$q}%")
                        ->orWhere('email', 'like', "%{$q}%"));
            })
            ->limit($limit)
            ->get()
            ->map(fn (Teacher $t) => [
                'id' => $t->id,
                'type' => 'teacher',
                'title' => $t->user?->name ?? 'Teacher',
                'subtitle' => trim(($t->teacher_id ?? '').($t->department ? " · {$t->department}" : '')),
                'url' => "/teachers/{$t->id}",
            ]);
    }

    protected function searchCourses(User $user, string $q, int $limit): Collection
    {
        $query = Course::query()
            ->select(['id', 'name', 'code', 'teacher_id'])
            ->where(function ($builder) use ($q) {
                $builder->where('name', 'like', "%{$q}%")
                    ->orWhere('code', 'like', "%{$q}%");
            });

        if ($user->isStudent() && $user->student) {
            $query->whereHas('students', fn ($sq) => $sq->where('students.id', $user->student->id));
        } elseif ($user->isTeacher() && $user->teacher) {
            $query->where('teacher_id', $user->teacher->id);
        } elseif ($user->isParent() && $user->parent) {
            $childIds = $user->parent->students()->pluck('students.id');
            $query->whereHas('students', fn ($sq) => $sq->whereIn('students.id', $childIds));
        }

        return $query->limit($limit)->get()->map(fn (Course $c) => [
            'id' => $c->id,
            'type' => 'course',
            'title' => $c->name,
            'subtitle' => $c->code,
            'url' => "/courses/{$c->id}",
        ]);
    }

    protected function searchMessages(User $user, string $q, int $limit): Collection
    {
        return Message::query()
            ->select(['id', 'sender_id', 'receiver_id', 'content', 'created_at'])
            ->where(fn ($builder) => $builder->where('sender_id', $user->id)->orWhere('receiver_id', $user->id))
            ->where('content', 'like', "%{$q}%")
            ->with(['sender:id,name', 'receiver:id,name'])
            ->latest()
            ->limit($limit)
            ->get()
            ->map(function (Message $m) use ($user) {
                $other = $m->sender_id === $user->id ? $m->receiver : $m->sender;

                return [
                    'id' => $m->id,
                    'type' => 'message',
                    'title' => $other?->name ?? 'Message',
                    'subtitle' => Str::limit($m->content, 72),
                    'url' => '/messages',
                ];
            });
    }

    protected function formatStudent(Student $s): array
    {
        return [
            'id' => $s->id,
            'type' => 'student',
            'title' => $s->user?->name ?? 'Student',
            'subtitle' => trim(($s->student_id ?? '').($s->grade_level ? " · Grade {$s->grade_level}" : '')),
            'url' => "/students/{$s->id}",
        ];
    }

    /**
     * @return array{query: string, students: array, teachers: array, courses: array, messages: array, total: int}
     */
    protected function emptyPayload(string $q): array
    {
        return [
            'query' => $q,
            'students' => [],
            'teachers' => [],
            'courses' => [],
            'messages' => [],
            'total' => 0,
        ];
    }
}
