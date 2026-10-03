<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="EduAdmin Pro — Smart school management platform for students, teachers, attendance, grades, and analytics.">
    <title>EduAdmin Pro — School Management Platform</title>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Sora:wght@600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" crossorigin="anonymous">

    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
                        display: ['"Sora"', 'sans-serif'],
                    },
                    colors: {
                        primary: { 50:'#eef2ff', 400:'#818cf8', 500:'#6366f1', 600:'#4f46e5', 700:'#4338ca', 900:'#312e81' },
                        surface: { 50:'#f8fafc', 100:'#f1f5f9', 200:'#e2e8f0', 400:'#94a3b8', 500:'#64748b', 600:'#475569', 700:'#334155', 800:'#1e293b', 900:'#0f172a', 950:'#020617' },
                    },
                },
            },
        };
    </script>

    <style>
        .gradient-text {
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .glass {
            background: rgba(255,255,255,0.08);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255,255,255,0.12);
        }
        .dark .glass {
            background: rgba(15,23,42,0.55);
            border: 1px solid rgba(255,255,255,0.07);
        }
        .glass-card {
            background: rgba(255,255,255,0.6);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255,255,255,0.7);
        }
        .dark .glass-card {
            background: rgba(30,41,59,0.6);
            border: 1px solid rgba(255,255,255,0.08);
        }
        .btn-primary {
            background: linear-gradient(135deg, #6366f1, #4f46e5);
            box-shadow: 0 4px 20px rgba(99,102,241,0.4);
            transition: all 0.2s ease;
        }
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 32px rgba(99,102,241,0.55);
        }
        .hero-bg {
            background:
                radial-gradient(ellipse 80% 50% at 50% -10%, rgba(99,102,241,0.35) 0%, transparent 60%),
                radial-gradient(ellipse 50% 40% at 80% 60%, rgba(139,92,246,0.2) 0%, transparent 50%),
                radial-gradient(ellipse 40% 30% at 10% 80%, rgba(6,182,212,0.15) 0%, transparent 50%);
        }
        .dot-grid {
            background-image: radial-gradient(circle, rgba(99,102,241,0.12) 1px, transparent 1px);
            background-size: 28px 28px;
        }
        .feature-card {
            transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
        }
        .feature-card:hover {
            transform: translateY(-6px);
            box-shadow: 0 20px 48px rgba(99,102,241,0.18);
            border-color: rgba(99,102,241,0.4) !important;
        }
        .dashboard-mock { animation: float 6s ease-in-out infinite; }
        @keyframes float {
            0%,100% { transform: translateY(0px); }
            50%      { transform: translateY(-18px); }
        }
        .reveal {
            opacity: 0;
            transform: translateY(28px);
            transition: opacity 0.65s ease, transform 0.65s ease;
        }
        .reveal.visible { opacity:1; transform:translateY(0); }
        .reveal-delay-1 { transition-delay: 0.1s; }
        .reveal-delay-2 { transition-delay: 0.2s; }
        .reveal-delay-3 { transition-delay: 0.3s; }
        .reveal-delay-4 { transition-delay: 0.4s; }
        #navbar { transition: background 0.3s, box-shadow 0.3s; }
        #navbar.scrolled {
            background: rgba(255,255,255,0.85) !important;
            backdrop-filter: blur(20px);
            box-shadow: 0 1px 24px rgba(0,0,0,0.08);
            border-bottom: 1px solid rgba(99,102,241,0.12);
        }
        .dark #navbar.scrolled {
            background: rgba(9,14,27,0.88) !important;
        }
        #mobile-menu {
            max-height: 0; overflow: hidden; opacity: 0;
            transition: max-height 0.35s ease, opacity 0.3s ease;
        }
        #mobile-menu.open { max-height: 400px; opacity: 1; }
        .testimonial-card { transition: transform 0.25s ease, box-shadow 0.25s ease; }
        .testimonial-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(0,0,0,0.1); }
        .social-link { transition: transform 0.2s; }
        .social-link:hover { transform: translateY(-3px); }
        #scroll-top { transition: opacity 0.3s ease, transform 0.3s ease; }
    </style>
</head>
<body class="font-sans bg-white dark:bg-surface-950 text-surface-900 dark:text-surface-100 antialiased">

<script>
    (function(){
        const t = localStorage.getItem('edu-theme') ||
            (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        if (t === 'dark') document.documentElement.classList.add('dark');
    })();
</script>

{{-- NAVBAR --}}
<nav id="navbar" class="fixed top-0 left-0 right-0 z-50 bg-transparent border-b border-transparent">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16 lg:h-[4.5rem]">
            <a href="#hero" class="flex items-center gap-2.5 shrink-0">
                <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-lg">
                    <i class="fas fa-graduation-cap text-white text-sm"></i>
                </div>
                <span class="font-display font-bold text-lg">
                    <span class="text-surface-900 dark:text-white">EduAdmin</span>
                    <span class="text-primary-500">Pro</span>
                </span>
            </a>

            <div class="hidden md:flex items-center gap-1">
                <a href="#hero" class="nav-link px-4 py-2 rounded-xl text-sm font-medium text-surface-600 dark:text-surface-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">Home</a>
                <a href="#features" class="nav-link px-4 py-2 rounded-xl text-sm font-medium text-surface-600 dark:text-surface-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">Features</a>
                <a href="#about" class="nav-link px-4 py-2 rounded-xl text-sm font-medium text-surface-600 dark:text-surface-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">About</a>
                <a href="#contact" class="nav-link px-4 py-2 rounded-xl text-sm font-medium text-surface-600 dark:text-surface-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">Contact</a>
            </div>

            <div class="flex items-center gap-2 sm:gap-3">
                <button id="theme-btn" type="button" class="w-9 h-9 rounded-xl border border-surface-200 dark:border-surface-700 flex items-center justify-center text-surface-600 dark:text-surface-400 hover:border-primary-400 hover:text-primary-500 transition-colors" aria-label="Toggle theme">
                    <i id="theme-icon" class="fas fa-moon text-sm"></i>
                </button>
                <a href="{{ route('login') }}" class="hidden sm:inline-flex px-4 py-2 rounded-xl text-sm font-medium border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 hover:border-primary-400 hover:text-primary-600 transition-colors">Login</a>
                <a href="{{ route('register') }}" class="hidden sm:inline-flex btn-primary px-5 py-2 rounded-xl text-white text-sm font-semibold">Get Started</a>
                <button id="menu-btn" type="button" class="md:hidden w-9 h-9 rounded-xl border border-surface-200 dark:border-surface-700 flex items-center justify-center text-surface-600 dark:text-surface-400" aria-label="Menu">
                    <i id="menu-icon" class="fas fa-bars"></i>
                </button>
            </div>
        </div>

        <div id="mobile-menu" class="md:hidden border-t border-surface-200 dark:border-surface-800">
            <div class="py-4 space-y-1">
                <a href="#hero" class="mobile-nav block px-4 py-2.5 text-sm font-medium text-surface-600 dark:text-surface-400 hover:text-primary-600">Home</a>
                <a href="#features" class="mobile-nav block px-4 py-2.5 text-sm font-medium text-surface-600 dark:text-surface-400 hover:text-primary-600">Features</a>
                <a href="#about" class="mobile-nav block px-4 py-2.5 text-sm font-medium text-surface-600 dark:text-surface-400 hover:text-primary-600">About</a>
                <a href="#contact" class="mobile-nav block px-4 py-2.5 text-sm font-medium text-surface-600 dark:text-surface-400 hover:text-primary-600">Contact</a>
                <div class="pt-3 px-4 flex flex-col gap-2">
                    <a href="{{ route('login') }}" class="text-center px-4 py-2.5 rounded-xl text-sm font-medium border border-surface-200 dark:border-surface-700">Login</a>
                    <a href="{{ route('register') }}" class="text-center btn-primary px-4 py-2.5 rounded-xl text-white text-sm font-semibold">Get Started</a>
                </div>
            </div>
        </div>
    </div>
</nav>

<main>
    {{-- HERO --}}
    <section id="hero" class="relative min-h-screen flex items-center pt-16 overflow-hidden hero-bg dot-grid bg-white dark:bg-surface-950">
        <div class="absolute top-20 left-10 w-72 h-72 rounded-full bg-primary-400/10 blur-3xl pointer-events-none animate-pulse"></div>
        <div class="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-purple-400/10 blur-3xl pointer-events-none animate-pulse"></div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-cyan-400/[0.08] blur-3xl pointer-events-none animate-pulse"></div>

        <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 w-full">
            <div class="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                <div class="reveal">
                    <div class="inline-flex items-center gap-2.5 rounded-full glass border border-primary-200/30 dark:border-primary-500/20 px-4 py-2 mb-6">
                        <span class="relative flex h-2.5 w-2.5">
                            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                        <span class="text-sm font-medium text-primary-600 dark:text-primary-400">#1 School Management Platform</span>
                    </div>

                    <h1 class="font-display font-bold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-tight text-surface-900 dark:text-white mb-6">
                        Smart School<br>
                        <span class="gradient-text">Management</span><br>
                        Platform
                    </h1>

                    <p class="text-lg text-surface-500 dark:text-surface-400 max-w-xl mb-8 leading-relaxed">
                        Manage students, teachers, attendance, grades, schedules and communication
                        in one intelligent platform built for modern education.
                    </p>

                    <div class="flex flex-col sm:flex-row gap-4 mb-10">
                        <a href="{{ route('register') }}" class="btn-primary inline-flex items-center justify-center gap-3 rounded-2xl px-7 py-4 text-base font-bold text-white">
                            <i class="fas fa-rocket"></i>
                            Get Started Free
                            <i class="fas fa-arrow-right opacity-80"></i>
                        </a>
                        <a href="{{ route('login') }}" class="glass-card group inline-flex items-center justify-center gap-3 rounded-2xl px-7 py-4 text-base font-semibold border border-surface-200 dark:border-surface-700 text-surface-800 dark:text-white hover:border-primary-300 hover:shadow-lg transition-all">
                            <i class="fas fa-sign-in-alt text-primary-500"></i>
                            Login to Dashboard
                            <i class="fas fa-chevron-right text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity"></i>
                        </a>
                    </div>

                    <div class="flex flex-wrap gap-5 text-sm text-surface-500">
                        <span class="inline-flex items-center gap-2"><i class="fas fa-shield-halved text-primary-500"></i> Enterprise Secure</span>
                        <span class="inline-flex items-center gap-2"><i class="fas fa-bolt text-primary-500"></i> Real-time Updates</span>
                        <span class="inline-flex items-center gap-2"><i class="fas fa-headset text-primary-500"></i> 24/7 Support</span>
                    </div>
                </div>

                {{-- Dashboard mockup --}}
                <div class="reveal reveal-delay-2 relative">
                    <div class="dashboard-mock relative">
                        <div class="absolute -inset-4 bg-gradient-to-r from-primary-500/30 via-purple-500/20 to-cyan-500/20 rounded-3xl blur-2xl pointer-events-none"></div>
                        <div class="relative glass-card rounded-3xl p-5 shadow-2xl">
                            <div class="flex items-center gap-2 mb-4 pb-3 border-b border-surface-200/60 dark:border-surface-700/60">
                                <span class="w-3 h-3 rounded-full bg-red-400"></span>
                                <span class="w-3 h-3 rounded-full bg-amber-400"></span>
                                <span class="w-3 h-3 rounded-full bg-emerald-400"></span>
                                <div class="flex-1 ml-2 h-6 rounded-lg bg-surface-100 dark:bg-surface-800 text-[10px] flex items-center px-3 text-surface-400">dashboard.eduadminpro.com</div>
                            </div>

                            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                @foreach([
                                    ['2,847','Students','fa-users','#6366f1'],
                                    ['184','Teachers','fa-chalkboard-teacher','#10b981'],
                                    ['64','Courses','fa-book','#f59e0b'],
                                    ['94.2%','Attendance','fa-clipboard-check','#06b6d4'],
                                ] as [$val, $label, $icon, $color])
                                <div class="rounded-xl bg-surface-50 dark:bg-surface-800/80 p-3 border border-surface-200/50 dark:border-surface-700/50">
                                    <div class="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style="background:{{ $color }}22">
                                        <i class="fas {{ $icon }} text-xs" style="color:{{ $color }}"></i>
                                    </div>
                                    <div class="font-display font-bold text-lg text-surface-900 dark:text-white">{{ $val }}</div>
                                    <div class="text-[10px] text-surface-500">{{ $label }}</div>
                                </div>
                                @endforeach
                            </div>

                            <div class="rounded-xl bg-surface-50 dark:bg-surface-800/80 p-4 border border-surface-200/50 dark:border-surface-700/50 mb-4">
                                <div class="flex justify-between items-center mb-3">
                                    <span class="text-xs font-semibold text-surface-700 dark:text-surface-300">Attendance Trend</span>
                                    <span class="text-xs font-medium text-emerald-500">+12% this month</span>
                                </div>
                                <div class="flex items-end justify-between gap-1 h-20">
                                    @foreach([55,62,58,70,75,68,82,78,88,85,90,94] as $h)
                                    <div class="flex-1 rounded-t-md bg-gradient-to-t from-indigo-600 to-violet-400" style="height:{{ $h }}%"></div>
                                    @endforeach
                                </div>
                                <div class="flex justify-between mt-2 text-[9px] text-surface-400">
                                    @foreach(['J','F','M','A','M','J','J','A','S','O','N','D'] as $m)
                                    <span>{{ $m }}</span>
                                    @endforeach
                                </div>
                            </div>

                            <div class="space-y-2">
                                @foreach([
                                    ['A','Alice Johnson','Grade 10','92%','text-emerald-500'],
                                    ['M','Marcus Chen','Grade 11','88%','text-primary-500'],
                                    ['S','Sofia Rivera','Grade 9','95%','text-emerald-500'],
                                ] as [$init, $name, $grade, $score, $scoreColor])
                                <div class="flex items-center gap-3 rounded-lg bg-surface-50 dark:bg-surface-800/60 px-3 py-2">
                                    <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">{{ $init }}</div>
                                    <div class="flex-1 min-w-0">
                                        <div class="text-xs font-semibold text-surface-900 dark:text-white truncate">{{ $name }}</div>
                                        <div class="text-[10px] text-surface-500">{{ $grade }}</div>
                                    </div>
                                    <span class="text-xs font-bold {{ $scoreColor }}">{{ $score }}</span>
                                </div>
                                @endforeach
                            </div>
                        </div>

                        <div class="hidden lg:block absolute -top-6 -right-6 glass-card rounded-2xl px-4 py-3 shadow-xl border border-emerald-500/20">
                            <div class="flex items-center gap-2 text-sm">
                                <i class="fas fa-chart-line text-emerald-500"></i>
                                <span class="font-semibold text-surface-800 dark:text-white">Grades Avg <span class="text-emerald-500">+8.4% ↑</span></span>
                            </div>
                        </div>
                        <div class="hidden lg:block absolute -bottom-4 -left-6 glass-card rounded-2xl px-4 py-3 shadow-xl border border-violet-500/20">
                            <div class="flex items-center gap-2 text-sm">
                                <i class="fas fa-qrcode text-violet-500"></i>
                                <span class="font-semibold text-surface-800 dark:text-white">QR Attendance <span class="text-violet-500">Active Now</span></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto">
                <path d="M0,32 C360,80 720,0 1440,48 L1440,80 L0,80 Z" class="fill-surface-50 dark:fill-surface-950"/>
            </svg>
        </div>
    </section>

    {{-- STATISTICS --}}
    <section class="py-16 bg-surface-50 dark:bg-surface-950">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-6">
                @foreach([
                    ['2400','2,400+','Students Enrolled','fa-users','#6366f1',true,false],
                    ['180','180+','Active Teachers','fa-chalkboard-teacher','#10b981',true,false],
                    ['320','320+','Courses Available','fa-book-open','#f59e0b',true,false],
                    ['98.2','98.2%','Attendance Rate','fa-clipboard-check','#06b6d4',false,true],
                ] as [$target, $display, $label, $icon, $color, $plus, $pct])
                <div class="reveal glass-card rounded-2xl p-6 text-center border border-surface-200/70 dark:border-surface-700/50 hover:border-primary-300 hover:shadow-lg hover:-translate-y-1 transition-all">
                    <div class="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style="background:{{ $color }}18">
                        <i class="fas {{ $icon }} text-xl" style="color:{{ $color }}"></i>
                    </div>
                    <div class="stat-number font-display font-bold text-3xl text-surface-900 dark:text-white mb-1"
                         data-target="{{ $target }}" data-plus="{{ $plus ? '1' : '0' }}" data-percent="{{ $pct ? '1' : '0' }}">0</div>
                    <div class="text-sm text-surface-500">{{ $label }}</div>
                </div>
                @endforeach
            </div>
        </div>
    </section>

    {{-- FEATURES --}}
    <section id="features" class="relative py-20 lg:py-28 bg-white dark:bg-surface-900 overflow-hidden">
        <div class="absolute top-0 right-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-14 reveal">
                <span class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-sm font-medium mb-4">
                    <i class="fas fa-star"></i> Everything You Need
                </span>
                <h2 class="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-surface-900 dark:text-white mb-4">
                    Powerful Features for<br><span class="gradient-text">Modern Schools</span>
                </h2>
                <p class="text-lg text-surface-500 max-w-2xl mx-auto">Everything your institution needs to run smarter — from enrollment to analytics.</p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                @foreach([
                    ['fa-user-graduate','Student Management','Complete student profiles, enrollment tracking, guardian info.','#6366f1'],
                    ['fa-chalkboard-teacher','Teacher Management','Profiles, specializations, course assignments, salary information.','#10b981'],
                    ['fa-clipboard-check','Attendance Tracking','Manual, bulk, and QR code attendance with real-time reports.','#f59e0b'],
                    ['fa-star','Grades Management','Exams, quizzes, homework. Auto averages and letter grades.','#ec4899'],
                    ['fa-qrcode','QR Attendance','Time-expiring QR codes for contactless attendance scanning.','#8b5cf6'],
                    ['fa-chart-line','Analytics Dashboard','Real-time charts, trends, and top performer leaderboards.','#06b6d4'],
                    ['fa-comments','Messaging System','Direct chat between teachers, students, and parents.','#6366f1'],
                    ['fa-file-pdf','Reports & PDF Export','Professional PDF reports and Excel exports on demand.','#ef4444'],
                ] as [$icon, $title, $desc, $color])
                <div class="feature-card tilt-card reveal glass-card rounded-2xl p-6 border border-surface-200/70 dark:border-surface-700/50">
                    <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style="background:{{ $color }}18">
                        <i class="fas {{ $icon }} text-lg" style="color:{{ $color }}"></i>
                    </div>
                    <h3 class="font-display font-bold text-base text-surface-900 dark:text-white mb-2">{{ $title }}</h3>
                    <p class="text-sm text-surface-500 leading-relaxed">{{ $desc }}</p>
                </div>
                @endforeach
            </div>
        </div>
    </section>

    {{-- HOW IT WORKS --}}
    <section id="about" class="relative py-20 lg:py-28 bg-surface-50 dark:bg-surface-950 dot-grid overflow-hidden">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16 reveal">
                <span class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-sm font-medium mb-4">
                    <i class="fas fa-map"></i> Simple Process
                </span>
                <h2 class="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-surface-900 dark:text-white">
                    Get Started in <span class="gradient-text">4 Easy Steps</span>
                </h2>
            </div>

            <div class="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
                <div class="hidden lg:block absolute top-12 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-primary-200 via-primary-400 to-primary-200 dark:from-primary-800 dark:via-primary-500 dark:to-primary-800"></div>

                @foreach([
                    ['01','fa-user-plus','Register Account','Sign up and configure your school profile in minutes.','from-primary-500 to-indigo-600'],
                    ['02','fa-database','Manage School Data','Add students, teachers, courses and timetables.','from-emerald-500 to-teal-600'],
                    ['03','fa-chart-bar','Track Performance','Monitor attendance and grades in real time.','from-amber-500 to-orange-500'],
                    ['04','fa-file-export','Generate Reports','Export professional PDFs and Excel reports.','from-rose-500 to-pink-600'],
                ] as [$num, $icon, $title, $desc, $gradient])
                <div class="reveal flex flex-col items-center text-center relative z-10">
                    <div class="relative mb-6">
                        <div class="w-20 h-20 rounded-full bg-gradient-to-br {{ $gradient }} flex items-center justify-center shadow-xl">
                            <i class="fas {{ $icon }} text-white text-xl"></i>
                        </div>
                        <span class="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-surface-800 dark:bg-surface-900 border-2 border-primary-400 flex items-center justify-center text-[10px] font-bold text-white">{{ $num }}</span>
                    </div>
                    <h3 class="font-display font-bold text-lg text-surface-900 dark:text-white mb-2">{{ $title }}</h3>
                    <p class="text-sm text-surface-500 max-w-52 mx-auto leading-relaxed">{{ $desc }}</p>
                </div>
                @endforeach
            </div>
        </div>
    </section>

    {{-- TESTIMONIALS --}}
    <section class="py-20 lg:py-28 bg-white dark:bg-surface-900">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-14 reveal">
                <span class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-sm font-medium mb-4">
                    <i class="fas fa-heart"></i> Loved by Educators
                </span>
                <h2 class="font-display font-bold text-3xl sm:text-4xl text-surface-900 dark:text-white">
                    What Our <span class="gradient-text">Users Say</span>
                </h2>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-14">
                @foreach([
                    ['Sarah Mitchell','Principal, Greenwood Academy','fa-user','from-primary-500 to-indigo-600','EduAdmin Pro completely transformed how we manage our 1,200-student school. The attendance QR system alone saved us 2 hours daily. The analytics dashboard gives our leadership team real insights we never had before.'],
                    ['James Okonkwo','IT Director, Riverside High School','fa-user-tie','from-emerald-500 to-teal-600','The implementation was surprisingly smooth. Within a week all 80 teachers were using it. The role-based access and security features gave our administration total peace of mind. Best decision we made this year.'],
                    ['Dr. Linda Fernandez','Superintendent, Metro District Schools','fa-user-graduate','from-amber-500 to-orange-500','We deployed EduAdmin Pro across 12 schools. Parent engagement improved by 60% thanks to the messaging system. The grade reports and attendance tracking gave us district-level visibility we desperately needed.'],
                ] as [$name, $role, $icon, $grad, $quote])
                <div class="testimonial-card reveal glass-card rounded-3xl p-7 border border-surface-200/70 dark:border-surface-700/50">
                    <div class="flex gap-1 mb-4">
                        @for($i = 0; $i < 5; $i++)
                        <i class="fas fa-star text-amber-400 text-sm"></i>
                        @endfor
                    </div>
                    <blockquote class="relative text-sm text-surface-600 dark:text-surface-400 leading-relaxed mb-6 pl-4">
                        <i class="fas fa-quote-left absolute -top-2 -left-1 text-3xl text-primary-100 dark:text-primary-900/50"></i>
                        {{ $quote }}
                    </blockquote>
                    <div class="flex items-center gap-3 pt-4 border-t border-surface-200/60 dark:border-surface-700/60">
                        <div class="w-10 h-10 rounded-xl bg-gradient-to-br {{ $grad }} flex items-center justify-center text-white">
                            <i class="fas {{ $icon }} text-sm"></i>
                        </div>
                        <div>
                            <div class="font-bold text-sm text-surface-900 dark:text-white">{{ $name }}</div>
                            <div class="text-xs text-surface-500">{{ $role }}</div>
                        </div>
                    </div>
                </div>
                @endforeach
            </div>

            <div class="reveal flex flex-wrap justify-center gap-8 lg:gap-12 text-center">
                @foreach([['500+','Schools Trust Us'],['50K+','Active Students'],['4.9/5','Average Rating'],['99.9%','Uptime SLA']] as [$val, $label])
                <div>
                    <div class="font-display font-bold text-2xl text-primary-500">{{ $val }}</div>
                    <div class="text-xs text-surface-400 font-medium mt-1">{{ $label }}</div>
                </div>
                @endforeach
            </div>
        </div>
    </section>

    {{-- CTA --}}
    <section class="relative py-20 lg:py-28 bg-gradient-to-br from-primary-600 via-indigo-700 to-purple-800 overflow-hidden">
        <div class="absolute inset-0 dot-grid opacity-20 pointer-events-none"></div>
        <div class="absolute top-10 left-10 w-64 h-64 rounded-full bg-white/5 blur-3xl pointer-events-none"></div>
        <div class="absolute bottom-10 right-10 w-80 h-80 rounded-full bg-cyan-400/10 blur-3xl pointer-events-none"></div>

        <div class="relative max-w-4xl mx-auto px-4 sm:px-6 text-center reveal">
            <span class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 text-white text-sm font-medium mb-6">
                <i class="fas fa-bolt text-yellow-300"></i> Ready to Transform Your School?
            </span>
            <h2 class="font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-white mb-6 leading-tight">
                Start Managing Your<br>School <span style="color:#fde047">Smarter</span>
            </h2>
            <p class="text-lg text-white/75 mb-10 max-w-2xl mx-auto">
                Join over 500 schools that have modernised their administration with EduAdmin Pro.
                Free for the first 30 days — no credit card required.
            </p>
            <div class="flex flex-col sm:flex-row gap-4 justify-center mb-10">
                <a href="{{ route('register') }}" class="inline-flex items-center justify-center gap-3 bg-white text-primary-600 font-bold rounded-2xl px-8 py-4 hover:bg-primary-50 hover:shadow-2xl hover:-translate-y-1 transition-all">
                    <i class="fas fa-rocket"></i> Start Now — It's Free
                    <i class="fas fa-arrow-right"></i>
                </a>
                <a href="#features" class="inline-flex items-center justify-center gap-2 bg-white/10 border border-white/25 text-white rounded-2xl px-8 py-4 hover:bg-white/20 transition-all">
                    <i class="fas fa-play-circle"></i> Learn More
                </a>
            </div>
            <div class="flex flex-wrap justify-center gap-3">
                @foreach(['No credit card','Free onboarding','Cancel anytime','GDPR compliant','24/7 support'] as $chip)
                <span class="inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 text-xs text-white/90">
                    <i class="fas fa-check-circle text-green-400"></i> {{ $chip }}
                </span>
                @endforeach
            </div>
        </div>
    </section>

    {{-- FOOTER --}}
    <footer id="contact" class="bg-surface-950 pt-16 pb-8 text-surface-400">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8 mb-12">
                <div>
                    <a href="#hero" class="flex items-center gap-2.5 mb-4">
                        <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center">
                            <i class="fas fa-graduation-cap text-white text-sm"></i>
                        </div>
                        <span class="font-display font-bold text-lg text-white">EduAdmin<span class="text-primary-500">Pro</span></span>
                    </a>
                    <p class="text-sm leading-relaxed mb-6">The complete school management platform for modern educational institutions worldwide.</p>
                    <div class="flex gap-3">
                        @foreach(['fa-twitter','fa-facebook','fa-linkedin','fa-youtube','fa-instagram'] as $soc)
                        <a href="#" class="social-link w-9 h-9 rounded-xl bg-surface-800 flex items-center justify-center hover:bg-surface-700 text-surface-400 hover:text-white transition-colors">
                            <i class="fab {{ $soc }} text-sm"></i>
                        </a>
                        @endforeach
                    </div>
                </div>

                <div>
                    <h4 class="text-white text-sm font-bold uppercase tracking-wider mb-4">Quick Links</h4>
                    <ul class="space-y-2.5 text-sm">
                        @foreach([
                            ['#hero','Home'],
                            ['#features','Features'],
                            ['#about','How It Works'],
                            [route('login'),'Login'],
                            [route('register'),'Get Started'],
                        ] as [$href, $text])
                        <li>
                            <a href="{{ $href }}" class="inline-flex items-center gap-2 hover:text-primary-400 hover:translate-x-1 transition-all">
                                <i class="fas fa-chevron-right text-primary-600 text-[10px]"></i> {{ $text }}
                            </a>
                        </li>
                        @endforeach
                    </ul>
                </div>

                <div>
                    <h4 class="text-white text-sm font-bold uppercase tracking-wider mb-4">Platform</h4>
                    <ul class="space-y-2.5 text-sm">
                        @foreach(['Student Management','Teacher Management','Attendance (QR)','Grade System','Analytics','Messaging','Reports & Export','Settings'] as $link)
                        <li><a href="#features" class="hover:text-primary-400 transition-colors">{{ $link }}</a></li>
                        @endforeach
                    </ul>
                </div>

                <div>
                    <h4 class="text-white text-sm font-bold uppercase tracking-wider mb-4">Contact Us</h4>
                    <ul class="space-y-3 text-sm mb-6">
                        <li class="flex items-start gap-2"><i class="fas fa-location-dot text-primary-500 mt-0.5"></i> 123 Education Avenue, New York, NY 10001, USA</li>
                        <li class="flex items-center gap-2"><i class="fas fa-phone text-primary-500"></i> <a href="tel:+12345678900" class="hover:text-primary-400">+1 (234) 567-8900</a></li>
                        <li class="flex items-center gap-2"><i class="fas fa-envelope text-primary-500"></i> <a href="mailto:hello@eduadminpro.com" class="hover:text-primary-400">hello@eduadminpro.com</a></li>
                        <li class="flex items-center gap-2"><i class="fas fa-globe text-primary-500"></i> www.eduadminpro.com</li>
                    </ul>
                    <p class="text-xs text-surface-500 mb-2">Subscribe for updates</p>
                    <form class="flex gap-2" onsubmit="event.preventDefault();">
                        <input type="email" placeholder="Your email" class="flex-1 bg-surface-800 border border-surface-700 rounded-xl px-3 py-2 text-sm text-white placeholder-surface-500 focus:outline-none focus:border-primary-500">
                        <button type="submit" class="btn-primary w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" aria-label="Subscribe">
                            <i class="fas fa-paper-plane text-sm"></i>
                        </button>
                    </form>
                </div>
            </div>

            <div class="border-t border-surface-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
                <p>© {{ date('Y') }} EduAdmin Pro. All rights reserved. Built with ❤️ for educators.</p>
                <div class="flex gap-4">
                    <a href="#" class="hover:text-primary-400 transition-colors">Privacy Policy</a>
                    <a href="#" class="hover:text-primary-400 transition-colors">Terms of Service</a>
                    <a href="#" class="hover:text-primary-400 transition-colors">Cookie Policy</a>
                </div>
            </div>
        </div>
    </footer>
</main>

<button id="scroll-top" type="button" class="fixed bottom-6 right-6 z-50 w-11 h-11 rounded-xl btn-primary flex items-center justify-center text-white opacity-0 pointer-events-none" aria-label="Scroll to top">
    <i class="fas fa-chevron-up"></i>
</button>

<script>
document.addEventListener('DOMContentLoaded', function () {
    const navbar = document.getElementById('navbar');
    const themeBtn = document.getElementById('theme-btn');
    const themeIcon = document.getElementById('theme-icon');
    const menuBtn = document.getElementById('menu-btn');
    const menuIcon = document.getElementById('menu-icon');
    const mobileMenu = document.getElementById('mobile-menu');
    const scrollTopBtn = document.getElementById('scroll-top');

    function syncThemeIcon() {
        const isDark = document.documentElement.classList.contains('dark');
        themeIcon.className = isDark ? 'fas fa-sun text-sm' : 'fas fa-moon text-sm';
    }
    syncThemeIcon();

    themeBtn.addEventListener('click', function () {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('edu-theme', isDark ? 'dark' : 'light');
        syncThemeIcon();
    });

    window.addEventListener('scroll', function () {
        navbar.classList.toggle('scrolled', window.scrollY > 60);
        const showTop = window.scrollY > 400;
        scrollTopBtn.style.opacity = showTop ? '1' : '0';
        scrollTopBtn.style.pointerEvents = showTop ? 'auto' : 'none';
    }, { passive: true });

    menuBtn.addEventListener('click', function () {
        mobileMenu.classList.toggle('open');
        menuIcon.classList.toggle('fa-bars');
        menuIcon.classList.toggle('fa-times');
    });

    document.querySelectorAll('.mobile-nav').forEach(function (link) {
        link.addEventListener('click', function () {
            mobileMenu.classList.remove('open');
            menuIcon.classList.add('fa-bars');
            menuIcon.classList.remove('fa-times');
        });
    });

    scrollTopBtn.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    var revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal').forEach(function (el) {
        revealObserver.observe(el);
    });

    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener('click', function (e) {
            var id = this.getAttribute('href');
            if (id.length <= 1) return;
            var target = document.querySelector(id);
            if (!target) return;
            e.preventDefault();
            var offset = 72;
            var top = target.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top: top, behavior: 'smooth' });
        });
    });

    function animateCounter(el) {
        var raw = el.getAttribute('data-target');
        var hasPlus = el.getAttribute('data-plus') === '1';
        var isPercent = el.getAttribute('data-percent') === '1';
        var target = parseFloat(raw);
        var duration = 1800;
        var start = null;

        function step(ts) {
            if (!start) start = ts;
            var progress = Math.min((ts - start) / duration, 1);
            var eased = 1 - Math.pow(1 - progress, 3);
            var current = target * eased;
            var formatted = isPercent ? current.toFixed(1) + '%' : Math.floor(current).toLocaleString();
            if (hasPlus && progress >= 1) formatted += '+';
            el.textContent = formatted;
            if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    var counterObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                counterObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('.stat-number[data-target]').forEach(function (el) {
        counterObserver.observe(el);
    });

    document.querySelectorAll('.tilt-card').forEach(function (card) {
        card.addEventListener('mousemove', function (e) {
            var rect = card.getBoundingClientRect();
            var x = (e.clientX - rect.left) / rect.width - 0.5;
            var y = (e.clientY - rect.top) / rect.height - 0.5;
            card.style.transform = 'translateY(-6px) rotateX(' + (-y * 5) + 'deg) rotateY(' + (x * 5) + 'deg)';
        });
        card.addEventListener('mouseleave', function () {
            card.style.transform = '';
        });
    });
});
</script>
</body>
</html>
