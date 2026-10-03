<?php

namespace Tests\Feature\Api;

use App\Models\LoginEvent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesTestUsers;
use Tests\TestCase;

class SecurityCenterTest extends TestCase
{
    use CreatesTestUsers;
    use RefreshDatabase;

    public function test_teacher_cannot_access_security_center(): void
    {
        [$teacherUser] = $this->createTeacherUser();
        Sanctum::actingAs($teacherUser);

        $this->getJson('/api/security/overview')->assertForbidden();
    }

    public function test_failed_login_is_recorded(): void
    {
        User::factory()->create([
            'email' => 'known@eduadmin.com',
            'password' => Hash::make('correct-password'),
            'role' => 'admin',
        ]);

        $this->postJson('/api/auth/login', [
            'email' => 'known@eduadmin.com',
            'password' => 'wrong-password',
        ])->assertUnprocessable();

        $this->assertDatabaseHas('login_events', [
            'email' => 'known@eduadmin.com',
            'status' => LoginEvent::STATUS_FAILED,
            'failure_reason' => 'invalid_password',
        ]);
    }

    public function test_successful_login_is_recorded(): void
    {
        $admin = $this->createAdminUser();

        $this->postJson('/api/auth/login', [
            'email' => $admin->email,
            'password' => 'password',
        ])->assertOk();

        $this->assertDatabaseHas('login_events', [
            'email' => $admin->email,
            'status' => LoginEvent::STATUS_SUCCESS,
        ]);

        $admin->refresh();
        $this->assertNotNull($admin->last_login_at);
    }

    public function test_admin_can_view_security_overview_and_sessions(): void
    {
        $admin = $this->createAdminUser();
        Sanctum::actingAs($admin);

        LoginEvent::create([
            'user_id' => $admin->id,
            'email' => $admin->email,
            'status' => LoginEvent::STATUS_FAILED,
            'failure_reason' => 'invalid_password',
            'ip_address' => '127.0.0.1',
        ]);

        $this->getJson('/api/security/overview')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'failed_logins_today',
                    'successful_logins_today',
                    'active_sessions',
                    'unique_devices',
                ],
            ]);

        $this->getJson('/api/security/failed-attempts')
            ->assertOk()
            ->assertJsonPath('data.0.email', $admin->email);

        $this->getJson('/api/security/sessions')
            ->assertOk();
    }

    public function test_admin_can_revoke_other_session(): void
    {
        $admin = $this->createAdminUser();
        $otherToken = $admin->createToken('other-device');

        Sanctum::actingAs($admin);

        $this->deleteJson('/api/security/sessions/'.$otherToken->accessToken->id)
            ->assertOk();

        $this->assertDatabaseMissing('personal_access_tokens', [
            'id' => $otherToken->accessToken->id,
        ]);
    }
}
