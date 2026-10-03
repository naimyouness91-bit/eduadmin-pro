# EduAdmin Pro — Fresh Deployment Guide

Use this guide after installing the application on a new server or when resetting the database for real production use.

---

## Quick start (empty database)

```bash
cd EduAdmin-Pro
cp .env.example .env
php artisan key:generate
php artisan migrate --force
php artisan db:seed --force
```

**Default Super Admin login**

| Field | Value |
|--------|--------|
| Email | `superadmin@eduadmin.com` |
| Password | `password` |

Change the password immediately after first login (Profile → Settings).

---

## Remove demo data from an existing database

If the database already contains sample students, teachers, courses, etc.:

```bash
php artisan eduadmin:prepare-fresh-deployment --force
```

This keeps:

- Super Admin account (`superadmin@eduadmin.com`)
- System settings
- Role definitions (stored on the `users.role` column)
- Application configuration (`.env`, migrations)

This removes:

- Students, teachers, parents
- Courses, attendance, grades, assignments
- Notifications, messages, groups, meetings
- AI conversations, AI quizzes, activity logs, and related records

---

## Recommended email naming convention

| Role | Pattern | Example |
|------|---------|---------|
| Student | `student{n}@yourdomain.com` | `student1@eduadmin.com` |
| Teacher | `teacher{n}@yourdomain.com` | `teacher1@eduadmin.com` |
| Parent | `parent{n}@yourdomain.com` | `parent1@eduadmin.com` |
| Admin | `admin@yourdomain.com` | Optional secondary admin |

Use your school domain in production (e.g. `@schoolname.edu`).

---

## Adding users manually (Super Admin)

Log in as Super Admin → use the sidebar modules below.

### Student

**Path:** Students → **Add student**

| Field | Required | Notes |
|--------|----------|--------|
| First Name + Last Name | Yes | Enter as full **Name** (e.g. `Ahmed Benali`) |
| Email | Yes | e.g. `student1@eduadmin.com` |
| Password | Yes | Minimum 8 characters |
| Phone | Optional | User profile phone |
| Class / Level | Optional | **Grade level** field (e.g. `Grade 10`, `Year 2`) |

**Optional fields:** Student ID, section, enrollment date, guardian details.

After creating a student, enroll them in courses from **Courses** → course detail → students.

---

### Teacher

**Path:** Teachers → **Add teacher**

| Field | Required | Notes |
|--------|----------|--------|
| First Name + Last Name | Yes | Full **Name** |
| Email | Yes | e.g. `teacher1@eduadmin.com` |
| Password | Yes | Minimum 8 characters |
| Subject | Optional | **Specialization** field (e.g. `Mathematics`, `Computer Science`) |

**Optional fields:** Teacher ID, department, qualification, phone.

Assign courses from **Courses** → create/edit course → select teacher.

---

### Parent

Parent accounts are linked to one or more students. Create the **student first**, then run:

```bash
php artisan tinker
```

```php
use App\Models\User;
use App\Models\ParentModel;
use App\Models\Student;
use Illuminate\Support\Facades\Hash;

$student = Student::whereHas('user', fn ($q) => $q->where('email', 'student1@eduadmin.com'))->firstOrFail();

$parentUser = User::create([
    'name' => 'Parent One',
    'email' => 'parent1@eduadmin.com',
    'password' => Hash::make('YourSecurePassword123'),
    'role' => 'parent',
    'email_verified_at' => now(),
    'is_active' => true,
]);

$parent = ParentModel::create([
    'user_id' => $parentUser->id,
    'relationship' => 'guardian',
]);

$parent->students()->attach($student->id, [
    'relationship' => 'guardian',
    'is_primary' => true,
]);
```

| Field | Required | Notes |
|--------|----------|--------|
| First Name + Last Name | Yes | Parent **Name** |
| Email | Yes | e.g. `parent1@eduadmin.com` |
| Password | Yes | Minimum 8 characters |
| Linked Student | Yes | Must exist before linking |

---

## Suggested setup order

1. Super Admin login → change password  
2. **Settings** → update school name, academic year, contact info  
3. Create **Teachers**  
4. Create **Courses** and assign teachers  
5. Create **Students** and enroll in courses  
6. Create **Parents** and link to students  
7. Optional: schedules, announcements, groups  

---

## Verify deployment

```bash
php artisan migrate:status
php artisan test
```

Manual checks:

- [ ] Login as Super Admin works  
- [ ] Dashboard loads with zero students/teachers/courses  
- [ ] Create one student, teacher, and course successfully  
- [ ] No foreign key errors in logs  

---

## Optional: Moroccan demo dataset

To populate realistic Moroccan user names and activity data **using the existing project courses** (MATH-401, PHYS-101, ENG-201, CS-101, BIO-101):

```bash
php artisan eduadmin:seed-moroccan-demo --force
```

This creates 20 students, 8 teachers, 10 parents, plus grades, attendance, assignments, groups, meetings, and notifications. Default password: `password`.

---

- Change default Super Admin password immediately  
- Set strong `APP_KEY` and database credentials in `.env`  
- Use HTTPS in production  
- Restrict `allow_registration` in system settings if self-registration is not needed  
