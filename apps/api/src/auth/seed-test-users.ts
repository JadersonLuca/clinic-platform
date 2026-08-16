import { memberships, organizations, tenants, users } from '@clinic/database';
import { createDatabase, createPostgresPool } from '@clinic/database';
import { and, eq } from 'drizzle-orm';
import { normalizeEmail } from './auth.service';
import { PasswordService } from './password.service';

interface TestCompany {
  tenantName: string;
  tenantSlug: string;
  organizationName: string;
}

interface TestUser {
  name: string;
  email: string;
  memberships: Array<{
    tenantSlug: string;
    role: 'owner' | 'superadmin' | 'admin' | 'staff';
  }>;
}

const testPassword = '123456';

const testCompanies: TestCompany[] = [
  {
    tenantName: 'Clínica Alpha',
    tenantSlug: 'clinica-alpha',
    organizationName: 'Clínica Alpha Matriz',
  },
  {
    tenantName: 'Clínica Beta',
    tenantSlug: 'clinica-beta',
    organizationName: 'Clínica Beta Matriz',
  },
];

const testUsers: TestUser[] = [
  {
    name: 'Owner Alpha',
    email: 'owner.alpha@clinic.test',
    memberships: [{ tenantSlug: 'clinica-alpha', role: 'owner' }],
  },
  {
    name: 'Superadmin Alpha',
    email: 'superadmin.alpha@clinic.test',
    memberships: [{ tenantSlug: 'clinica-alpha', role: 'superadmin' }],
  },
  {
    name: 'Admin Alpha',
    email: 'admin.alpha@clinic.test',
    memberships: [{ tenantSlug: 'clinica-alpha', role: 'admin' }],
  },
  {
    name: 'Atendente Alpha',
    email: 'staff.alpha@clinic.test',
    memberships: [{ tenantSlug: 'clinica-alpha', role: 'staff' }],
  },
  {
    name: 'Owner Beta',
    email: 'owner.beta@clinic.test',
    memberships: [{ tenantSlug: 'clinica-beta', role: 'owner' }],
  },
  {
    name: 'Multi Empresa',
    email: 'multi@clinic.test',
    memberships: [
      { tenantSlug: 'clinica-alpha', role: 'admin' },
      { tenantSlug: 'clinica-beta', role: 'staff' },
    ],
  },
];

async function main(): Promise<void> {
  const pool = createPostgresPool();
  const db = createDatabase(pool);
  const passwordService = new PasswordService();
  const passwordHash = await passwordService.hash(testPassword);

  try {
    const result = await db.transaction(async (tx) => {
      const companies = new Map<string, { tenantId: string; organizationId: string }>();

      for (const company of testCompanies) {
        const [existingTenant] = await tx
          .select()
          .from(tenants)
          .where(eq(tenants.slug, company.tenantSlug))
          .limit(1);

        const [tenant] =
          existingTenant ?
            await tx
              .update(tenants)
              .set({
                name: company.tenantName,
                status: 'active',
              })
              .where(eq(tenants.id, existingTenant.id))
              .returning()
          : await tx
              .insert(tenants)
              .values({
                name: company.tenantName,
                slug: company.tenantSlug,
                status: 'active',
              })
              .returning();

        const [existingOrganization] = await tx
          .select()
          .from(organizations)
          .where(and(eq(organizations.tenantId, tenant.id), eq(organizations.isPrimary, true)))
          .limit(1);

        const [organization] =
          existingOrganization ?
            await tx
              .update(organizations)
              .set({
                name: company.organizationName,
                isPrimary: true,
              })
              .where(eq(organizations.id, existingOrganization.id))
              .returning()
          : await tx
              .insert(organizations)
              .values({
                tenantId: tenant.id,
                name: company.organizationName,
                isPrimary: true,
              })
              .returning();

        companies.set(company.tenantSlug, {
          tenantId: tenant.id,
          organizationId: organization.id,
        });
      }

      for (const testUser of testUsers) {
        const emailNormalized = normalizeEmail(testUser.email);
        const [existingUser] = await tx
          .select()
          .from(users)
          .where(eq(users.emailNormalized, emailNormalized))
          .limit(1);

        const [user] =
          existingUser ?
            await tx
              .update(users)
              .set({
                name: testUser.name,
                email: testUser.email,
                passwordHash,
                status: 'active',
              })
              .where(eq(users.id, existingUser.id))
              .returning()
          : await tx
              .insert(users)
              .values({
                name: testUser.name,
                email: testUser.email,
                emailNormalized,
                passwordHash,
                status: 'active',
              })
              .returning();

        for (const membership of testUser.memberships) {
          const company = companies.get(membership.tenantSlug);

          if (!company) {
            throw new Error(`Missing test company ${membership.tenantSlug}`);
          }

          const [existingMembership] = await tx
            .select()
            .from(memberships)
            .where(
              and(
                eq(memberships.tenantId, company.tenantId),
                eq(memberships.organizationId, company.organizationId),
                eq(memberships.userId, user.id),
              ),
            )
            .limit(1);

          if (existingMembership) {
            await tx
              .update(memberships)
              .set({
                role: membership.role,
                status: 'active',
              })
              .where(eq(memberships.id, existingMembership.id));
          } else {
            await tx.insert(memberships).values({
              tenantId: company.tenantId,
              organizationId: company.organizationId,
              userId: user.id,
              role: membership.role,
              status: 'active',
            });
          }
        }
      }

      return {
        companies: testCompanies.length,
        users: testUsers.length,
        password: testPassword,
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
