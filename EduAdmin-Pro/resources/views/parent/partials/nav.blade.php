<nav class="flex flex-wrap gap-2 text-sm mb-6">
    <a href="{{ route('parent.dashboard') }}"
       class="px-3 py-1.5 rounded-lg {{ request()->routeIs('parent.dashboard') ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-primary-500/10' }}">
        <i class="fa-solid fa-house mr-1"></i> Dashboard
    </a>
    @isset($student)
        <a href="{{ route('parent.children.show', $student) }}"
           class="px-3 py-1.5 rounded-lg {{ request()->routeIs('parent.children.show') ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-primary-500/10' }}">
            Profile
        </a>
        <a href="{{ route('parent.children.grades', $student) }}"
           class="px-3 py-1.5 rounded-lg {{ request()->routeIs('parent.children.grades') ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-primary-500/10' }}">
            Grades
        </a>
        <a href="{{ route('parent.children.attendance', $student) }}"
           class="px-3 py-1.5 rounded-lg {{ request()->routeIs('parent.children.attendance') ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-primary-500/10' }}">
            Attendance
        </a>
        <a href="{{ route('parent.children.schedule', $student) }}"
           class="px-3 py-1.5 rounded-lg {{ request()->routeIs('parent.children.schedule') ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-primary-500/10' }}">
            Schedule
        </a>
    @endisset
    <a href="{{ url('/dashboard') }}"
       class="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-primary-500/10 ml-auto">
        <i class="fa-solid fa-arrow-up-right-from-square mr-1"></i> React app
    </a>
</nav>
