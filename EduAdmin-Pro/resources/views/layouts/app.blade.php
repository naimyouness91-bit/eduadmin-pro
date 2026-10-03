<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title', 'EduAdmin Pro')</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        primary: { 500: '#6366f1', 600: '#4f46e5' },
                    },
                },
            },
        };
    </script>
    @stack('styles')
</head>
<body class="h-full bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
    <div class="min-h-full">
        <header class="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-10">
            <div class="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                <a href="/" class="flex items-center gap-2 font-semibold text-primary-600">
                    <i class="fa-solid fa-graduation-cap"></i>
                    EduAdmin Pro
                </a>
                @auth
                    <div class="flex items-center gap-3 text-sm">
                        <span class="text-slate-500">{{ auth()->user()->name }}</span>
                        <span class="px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-600 capitalize">{{ auth()->user()->role }}</span>
                    </div>
                @endauth
            </div>
        </header>
        <main class="max-w-6xl mx-auto px-4 py-8">
            @yield('content')
        </main>
    </div>
    @stack('scripts')
</body>
</html>
