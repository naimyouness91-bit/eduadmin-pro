<?php

namespace App\Http\Middleware;

use App\Services\ActivityLogService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ActivityLogMiddleware
{
    public function __construct(
        protected ActivityLogService $activityLog
    ) {}

    /**
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $user = $request->user();

        if (
            $user
            && $response->isSuccessful()
            && ! $this->activityLog->shouldSkipAutomaticLog($request)
        ) {
            $this->activityLog->record(
                $user,
                $this->resolveAction($request),
                $request->method().' '.$request->path(),
                ['new_values' => $this->activityLog->filterSensitiveFromRequest($request->all())]
            );
        }

        return $response;
    }

    protected function resolveAction(Request $request): string
    {
        $route = $request->route();

        if ($route && $route->getName()) {
            return str_replace('.', '_', $route->getName());
        }

        return strtolower($request->method()).'.'.str_replace(['/', '-'], '_', trim($request->path(), '/'));
    }
}
