import { memberships, organizations, tenants, users } from '@clinic/database';
import { createDatabase, createPostgresPool } from '@clinic/database';
import { eq } from 'drizzle-orm';
import { normalizeEmail } from './auth.service';
import { PasswordService } from './password.service';

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }

  return value;
}

async function main(): Promise<void> {
  const pool = createPostgresPool();
  const db = createDatabase(pool);
  const passwordService = new PasswordService();

  try {
    const tenantName = process.env.BOOTSTRAP_TENANT_NAME ?? 'Default Tenant';
    const tenantSlug = process.env.BOOTSTRAP_TENANT_SLUG ?? 'default';
    const organizationName = process.env.BOOTSTRAP_ORGANIZATION_NAME ?? tenantName;
    const ownerName = process.env.BOOTSTRAP_OWNER_NAME ?? 'Owner';
    const ownerEmail = requiredEnv('BOOTSTRAP_OWNER_EMAIL');
    const ownerPassword = requiredEnv('BOOTSTRAP_OWNER_PASSWORD');
    const ownerEmailNormalized = normalizeEmail(ownerEmail);
    const passwordHash = await passwordService.hash(ownerPassword);

    const result = await db.transaction(async (tx) => {
      const [existingTenant] = await tx.select().from(tenants).where(eq(tenants.slug, tenantSlug)).limit(1);
      const [tenant] =
        existingTenant ?
          [existingTenant]
        : await tx
            .insert(tenants)
            .values({
              name: tenantName,
              slug: tenantSlug,
            })
            .returning();

      const [existingOrganization] = await tx
        .select()
        .from(organizations)
        .where(eq(organizations.tenantId, tenant.id))
        .limit(1);

      const [organization] =
        existingOrganization ?
          [existingOrganization]
        : await tx
            .insert(organizations)
            .values({
              tenantId: tenant.id,
              name: organizationName,
              isPrimary: true,
            })
            .returning();

      const [existingUser] = await tx
        .select()
        .from(users)
        .where(eq(users.emailNormalized, ownerEmailNormalized))
        .limit(1);

      const [user] =
        existingUser ?
          [existingUser]
        : await tx
            .insert(users)
            .values({
              name: ownerName,
              email: ownerEmail,
              emailNormalized: ownerEmailNormalized,
              passwordHash,
              status: 'active',
            })
            .returning();

      const [existingMembership] = await tx
        .select()
        .from(memberships)
        .where(eq(memberships.userId, user.id))
        .limit(1);

      const [membership] =
        existingMembership ?
          [existingMembership]
        : await tx
            .insert(memberships)
            .values({
              tenantId: tenant.id,
              organizationId: null,
              userId: user.id,
              role: 'owner',
              status: 'active',
            })
            .returning();

      return {
        tenantId: tenant.id,
        organizationId: organization.id,
        userId: user.id,
        membershipId: membership.id,
      };
    });

    console.log(JSON.stringify({ status: 'ok', ...result }));
  } finally {
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
