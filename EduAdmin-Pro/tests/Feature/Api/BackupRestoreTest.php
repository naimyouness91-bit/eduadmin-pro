<?php

namespace Tests\Feature\Api;

use App\Models\SystemBackup;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesTestUsers;
use Tests\TestCase;
use ZipArchive;

class BackupRestoreTest extends TestCase
{
    use CreatesTestUsers;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('backups');
    }

    public function test_teacher_cannot_access_backups(): void
    {
        [$teacherUser] = $this->createTeacherUser();
        Sanctum::actingAs($teacherUser);

        $this->getJson('/api/backups')->assertForbidden();
    }

    public function test_admin_can_create_and_list_backup(): void
    {
        Sanctum::actingAs($this->createAdminUser());

        $response = $this->postJson('/api/backups', ['include_files' => true])
            ->assertCreated();

        $id = $response->json('data.id');
        $this->assertDatabaseHas('system_backups', ['id' => $id, 'status' => 'completed']);

        $backup = SystemBackup::findOrFail($id);
        Storage::disk('backups')->assertExists($backup->path);

        $zip = new ZipArchive;
        $this->assertTrue($zip->open(Storage::disk('backups')->path($backup->path)));
        $this->assertNotFalse($zip->locateName('manifest.json'));
        $zip->close();

        $this->getJson('/api/backups')
            ->assertOk()
            ->assertJsonPath('data.0.id', $id);
    }

    public function test_restore_requires_confirmation(): void
    {
        Sanctum::actingAs($this->createAdminUser());

        $backup = $this->postJson('/api/backups')->assertCreated()->json('data');

        $this->postJson("/api/backups/{$backup['id']}/restore", [])
            ->assertUnprocessable();
    }

    public function test_restore_rejects_tampered_checksum(): void
    {
        Sanctum::actingAs($this->createAdminUser());

        $backup = SystemBackup::findOrFail(
            $this->postJson('/api/backups')->assertCreated()->json('data.id')
        );

        $backup->update(['checksum' => str_repeat('a', 64)]);

        $this->postJson("/api/backups/{$backup->id}/restore", ['confirm' => true])
            ->assertStatus(422);
    }

    public function test_admin_can_download_backup(): void
    {
        Sanctum::actingAs($this->createAdminUser());

        $backup = SystemBackup::findOrFail(
            $this->postJson('/api/backups')->assertCreated()->json('data.id')
        );

        $this->get("/api/backups/{$backup->id}/download")->assertOk();
    }

    public function test_restore_roundtrip_preserves_data(): void
    {
        Sanctum::actingAs($this->createAdminUser());

        $marker = User::factory()->create([
            'email' => 'backup-marker@eduadmin.com',
            'role' => 'admin',
        ]);

        $backupId = $this->postJson('/api/backups', ['include_files' => false])
            ->assertCreated()
            ->json('data.id');

        $marker->forceDelete();

        $this->assertNull(User::withTrashed()->where('email', 'backup-marker@eduadmin.com')->first());

        $this->postJson("/api/backups/{$backupId}/restore", ['confirm' => true])
            ->assertOk();

        $this->assertDatabaseHas('users', ['email' => 'backup-marker@eduadmin.com']);
    }
}
