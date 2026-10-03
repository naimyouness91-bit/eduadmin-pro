<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class SetApiLocale
{
    /** @var array<int, string> */
    protected array $supported = ['en', 'fr', 'ar'];

    public function handle(Request $request, Closure $next): Response
    {
        $header = $request->header('Accept-Language', 'en');
        $locale = strtolower(substr((string) $header, 0, 2));

        if (! in_array($locale, $this->supported, true)) {
            $locale = 'en';
        }

        App::setLocale($locale);

        return $next($request);
    }
}
