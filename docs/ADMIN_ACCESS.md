# Administrator access

Public registration always creates a `STUDENT`. There is no public role-selection or promotion endpoint.

To promote the owner:

```powershell
cd "C:\Users\EsamH\Desktop\MrM-Trading-Academy"
npm run admin:promote -- --email "owner@example.com" --confirm
npm run dev
```

The email must already belong to a verified, active account. Log out and sign in again, then open:

```text
http://localhost:3000/admin
```

To demote an administrator:

```powershell
cd "C:\Users\EsamH\Desktop\MrM-Trading-Academy"
npm run admin:demote -- --email "owner@example.com" --confirm
```

The command refuses to remove the final active ADMIN. `--emergency-override` bypasses that protection and should be used only during a documented recovery with direct database access and a tested rollback plan.

Role changes are transactional, increment `sessionVersion`, and create security audit events. No default administrator or password is created.

`/admin` requires ADMIN and displays live database records. `/admin/products` manages bilingual product content, server-only Telegram destinations, publication, and pricing. Every admin API repeats the database-backed ADMIN check.
