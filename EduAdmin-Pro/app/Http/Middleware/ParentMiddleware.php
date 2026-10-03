<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ParentMiddleware
{
    /**
     * Restrict access to authenticated users with the parent role.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return new JsonResponse(['message' => 'Unauthenticated.'], 401);
            }

            return redirect()->guest(route('login'));
        }

        if (! $user->isParent()) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return new JsonResponse(['message' => 'Forbidden. Parent access only.'], 403);
            }

            abort(403, 'Parent access only.');
        }

        return $next($request);
    }
}
