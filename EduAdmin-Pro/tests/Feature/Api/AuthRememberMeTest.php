<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthRememberMeTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_with_remember_me_returns_longer_token_expiry(): void
    {
        $user = User::factory()->admin()->create();

        $response = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password',
            'remember_me' => true,
        ])->assertOk();

        $expiresAt = $response->json('expires_at');
        $this->assertNotNull($expiresAt);
        $this->assertTrue(now()->addDays(25)->lessThan(\Carbon\Carbon::parse($expiresAt)));
    }

    public function test_login_without_remember_me_returns_shorter_token_expiry(): void
    {
        $user = User::factory()->admin()->create();

        $response = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password',
            'remember_me' => false,
        ])->assertOk();

        $expiresAt = \Carbon\Carbon::parse($response->json('expires_at'));
        $this->assertTrue($expiresAt->lessThan(now()->addDays(3)));
        $this->assertTrue($expiresAt->greaterThan(now()->addHours(12)));
    }

    public function test_logout_revokes_current_token(): void
    {
        $user = User::factory()->admin()->create();

        $login = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertOk();

        $token = $login->json('token');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/auth/logout')
            ->assertOk();

        $user->refresh();
        $this->assertSame(0, $user->tokens()->count());
    }
}
