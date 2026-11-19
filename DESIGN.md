5. User administration
All /api/v1/users endpoints currently require Super Admin.
Method and path Purpose
POST /api/v1/users Create account; 201
GET /api/v1/users Paginated user list
GET /api/v1/users/{userId} Get user by UUID
PATCH /api/v1/users/{userId} Update details, role, permissions, or prison assignment
PATCH /api/v1/users/{userId}/deactivate Deactivate without deleting
PATCH /api/v1/users/{userId}/reactivate Reactivate

{
  "fullName": "Records Officer",
  "username": "records01",
  "email": "records01@example.test",
  "password": "Records123!",
  "role": "Records Officer",
  "prisonId": "<prison-uuid>"
}