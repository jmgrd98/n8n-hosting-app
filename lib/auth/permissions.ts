import { NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { Permission, UserRole } from '@prisma/client';

export { Permission };

/**
 * Check if a user has a specific global permission.
 * ADMIN role always returns true.
 */
export async function hasGlobalPermission(
  userId: string,
  role: string,
  permission: Permission,
): Promise<boolean> {
  if (role === UserRole.ADMIN) return true;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { globalPermissions: true },
  });

  return user?.globalPermissions.includes(permission) ?? false;
}

/**
 * Check if a user has a specific permission on a given instance.
 * Returns true if:
 *   - user role is ADMIN, OR
 *   - user is the instance owner, OR
 *   - user has an explicit UserInstancePermission grant with that permission
 */
export async function hasInstancePermission(
  userId: string,
  role: string,
  instanceId: string,
  instanceOwnerId: string,
  permission: Permission,
): Promise<boolean> {
  if (role === UserRole.ADMIN) return true;
  if (userId === instanceOwnerId) return true;

  const grant = await prisma.userInstancePermission.findUnique({
    where: { userId_instanceId: { userId, instanceId } },
    select: { permissions: true },
  });

  return grant?.permissions.includes(permission) ?? false;
}

/**
 * Enforce a global permission — returns a 403 NextResponse if denied.
 * Returns null if the check passes (caller should continue).
 */
export async function requireGlobalPermission(
  userId: string,
  role: string,
  permission: Permission,
): Promise<NextResponse | null> {
  const ok = await hasGlobalPermission(userId, role, permission);
  if (!ok) {
    return NextResponse.json(
      { error: `Missing permission: ${permission}` },
      { status: 403 },
    );
  }
  return null;
}

/**
 * Enforce an instance-level permission — returns a 403 NextResponse if denied.
 * Returns null if the check passes (caller should continue).
 */
export async function requireInstancePermission(
  userId: string,
  role: string,
  instanceId: string,
  instanceOwnerId: string,
  permission: Permission,
): Promise<NextResponse | null> {
  const ok = await hasInstancePermission(userId, role, instanceId, instanceOwnerId, permission);
  if (!ok) {
    return NextResponse.json(
      { error: `Missing permission: ${permission}` },
      { status: 403 },
    );
  }
  return null;
}
