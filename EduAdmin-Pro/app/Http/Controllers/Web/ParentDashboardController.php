<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Services\ParentPortalService;
use Illuminate\Http\Request;
use Illuminate\View\View;

class ParentDashboardController extends Controller
{
    public function __construct(
        protected ParentPortalService $portal
    ) {}

    public function dashboard(Request $request): View
    {
        $user = $request->user();
        $data = $this->portal->dashboardData($user);

        return view('parent.dashboard', [
            'user' => $user,
            'data' => $data,
        ]);
    }

    public function childProfile(Request $request, Student $student): View
    {
        $this->authorize('view', $student);

        return view('parent.children.show', [
            'user' => $request->user(),
            'student' => $student,
            'data' => $this->portal->childDetail($student),
        ]);
    }

    public function childGrades(Request $request, Student $student): View
    {
        $this->authorize('view', $student);

        return view('parent.children.grades', [
            'user' => $request->user(),
            'student' => $student,
            'grades' => $this->portal->childGrades($student, $request->merge(['per_page' => 30])),
        ]);
    }

    public function childAttendance(Request $request, Student $student): View
    {
        $this->authorize('view', $student);

        return view('parent.children.attendance', [
            'user' => $request->user(),
            'student' => $student,
            'records' => $this->portal->childAttendance($student, $request->merge(['per_page' => 30])),
        ]);
    }

    public function childSchedule(Request $request, Student $student): View
    {
        $this->authorize('view', $student);

        return view('parent.children.schedule', [
            'user' => $request->user(),
            'student' => $student,
            'schedule' => $this->portal->childSchedule($student),
        ]);
    }
}
