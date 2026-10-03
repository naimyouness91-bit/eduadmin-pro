<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesTestUsers;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use CreatesTestUsers;
    use RefreshDatabase;

    public function test_me_returns_profile_fields_and_recent_activities(): void
    {
        $user = $this->createAdminUser();
        $user->forceFill([
            'phone' => '+1 555 0100',
            'bio' => 'School administrator.',
            'last_login_at' => now()->subHour(),
        ])->save();

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/auth/me')->assertOk();

        $response->assertJsonPath('user.phone', '+1 555 0100')
            ->assertJsonPath('user.bio', 'School administrator.')
            ->assertJsonPath('user.account_status', 'active')
            ->assertJsonPath('user.email_verified', true)
            ->assertJsonStructure([
                'user' => [
                    'avatar_url',
                    'last_login_at',
                    'account_status',
                ],
                'recent_activities',
            ]);
    }

    public function test_login_updates_last_login_at(): void
    {
        $user = User::factory()->admin()->create([
            'password' => Hash::make('password'),
            'last_login_at' => null,
        ]);

        $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertOk();

        $user->refresh();
        $this->assertNotNull($user->last_login_at);
    }

    public function test_update_profile_validates_phone_and_bio(): void
    {
        Sanctum::actingAs($this->createAdminUser());

        $this->putJson('/api/auth/profile', [
            'phone' => 'invalid-phone!',
            'bio' => str_repeat('x', 1001),
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['phone', 'bio']);

        $this->putJson('/api/auth/profile', [
            'phone' => '+1 (555) 123-4567',
            'bio' => 'Focused on student success.',
        ])->assertOk()
            ->assertJsonPath('user.phone', '+1 (555) 123-4567')
            ->assertJsonPath('user.bio', 'Focused on student success.');
    }

    public function test_avatar_upload_via_post_multipart(): void
    {
        Storage::fake('public');
        Sanctum::actingAs($this->createAdminUser());

        $file = UploadedFile::fake()->create('avatar.jpg', 120, 'image/jpeg');

        $response = $this->post('/api/auth/profile', [
            'avatar' => $file,
        ], [
            'Accept' => 'application/json',
        ])->assertOk();

        $avatarPath = $response->json('user.avatar');
        $this->assertNotNull($avatarPath);
        Storage::disk('public')->assertExists($avatarPath);
        $this->assertStringContainsString('storage/', $response->json('user.avatar_url'));
    }

    public function test_avatar_rejects_invalid_file_type(): void
    {
        Storage::fake('public');
        Sanctum::actingAs($this->createAdminUser());

        $file = UploadedFile::fake()->create('document.pdf', 100, 'application/pdf');

        $this->post('/api/auth/profile', [
            'avatar' => $file,
        ], [
            'Accept' => 'application/json',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['avatar']);
    }

    public function test_profile_update_records_recent_activity(): void
    {
        Sanctum::actingAs($this->createAdminUser());

        $this->putJson('/api/auth/profile', [
            'name' => 'Updated Admin Name',
        ])->assertOk();

        $activities = $this->getJson('/api/auth/me')->json('recent_activities');
        $this->assertNotEmpty($activities);
        $this->assertTrue(
            collect($activities)->contains(fn ($log) => str_contains($log['description'] ?? '', 'Profile updated'))
        );
    }
}
