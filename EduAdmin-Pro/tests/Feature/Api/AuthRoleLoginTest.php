<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Database\Seeders\SampleLoginAccountsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthRoleLoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_sample_teacher_student_and_parent_accounts_can_log_in(): void
    {
        $this->seed(SampleLoginAccountsSeeder::class);

        foreach (SampleLoginAccountsSeeder::ACCOUNTS as $role => $account) {
            $user = User::with($role)->where('email', $account['email'])->first();

            $this->assertNotNull($user, "{$role} user should exist.");
            $this->assertTrue($user->is_active, "{$role} user should be active.");
            $this->assertSame($role, $user->role);
            $this->assertTrue(Hash::check(SampleLoginAccountsSeeder::PASSWORD, $user->password));
            $this->assertNotNull($user->{$role}, "{$role} profile should exist.");

            $response = $this->postJson('/api/auth/login', [
                'email' => $account['email'],
                'password' => SampleLoginAccountsSeeder::PASSWORD,
            ])->assertOk();

            $response->assertJsonPath('user.role', $role);
            $response->assertJsonPath("user.{$role}.user_id", $user->id);
            $this->assertNotEmpty($response->json('token'));
        }

        foreach (SampleLoginAccountsSeeder::STUDENT_ALIASES as $account) {
            $response = $this->postJson('/api/auth/login', [
                'email' => $account['email'],
                'password' => SampleLoginAccountsSeeder::PASSWORD,
            ])->assertOk();

            $response->assertJsonPath('user.role', 'student');
            $response->assertJsonPath('user.email', $account['email']);
            $this->assertNotEmpty($response->json('token'));
        }
    }
}
