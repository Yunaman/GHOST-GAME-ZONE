'use server';

import { revalidatePath } from 'next/cache';
import { repository } from '@/lib/repository';
import { getAuthUser, verifyCredentials, getAdminPassword } from '@/lib/auth';

export async function getAdminDataAction() {
  try {
    const stats = await repository.getAdminStats();
    const tenants = await repository.getTenants();
    return { success: true, data: { stats, tenants } };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to fetch admin data' };
  }
}

export async function registerCustomerAction(
  gameZoneName: string,
  ownerContactName: string,
  username: string,
  initialPassword = '1234',
  licenseAmount = 5000
) {
  try {
    if (!gameZoneName || !username || !initialPassword) {
      return { success: false, error: 'Game Zone Name, Username, and Password are required' };
    }
    const tenant = await repository.registerCustomerTenant(
      gameZoneName.trim(),
      ownerContactName.trim(),
      username.trim(),
      initialPassword.trim(),
      licenseAmount
    );
    revalidatePath('/admin');
    return { success: true, data: tenant };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to register customer' };
  }
}

export async function toggleCustomerStatusAction(tenantId: string, currentStatus: 'ACTIVE' | 'SUSPENDED') {
  try {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const updated = await repository.updateTenantStatus(tenantId, newStatus);
    revalidatePath('/admin');
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to update customer status' };
  }
}

export async function updateCustomerGameZoneNameAction(tenantId: string, newGameZoneName: string) {
  try {
    if (!newGameZoneName.trim()) {
      return { success: false, error: 'Game Zone Name cannot be empty' };
    }
    const updated = await repository.updateTenantGameZoneName(tenantId, newGameZoneName.trim());
    revalidatePath('/admin');
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to update Game Zone name' };
  }
}

export async function updatePasswordWithVerificationAction(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'Unauthorized: Session expired' };
    }

    if (!currentPassword) {
      return { success: false, error: 'Current password is required' };
    }

    if (!newPassword || newPassword.trim().length < 4) {
      return { success: false, error: 'New password must be at least 4 characters long' };
    }

    if (newPassword !== confirmPassword) {
      return { success: false, error: 'New password and confirmation do not match' };
    }

    // 1. Verify current password
    const verifyRes = await verifyCredentials(user.username, currentPassword);
    if (!verifyRes.success) {
      return { success: false, error: 'Incorrect current password' };
    }

    // 2. Persist new password
    if (user.role === 'PRODUCT_OWNER' || user.username.toLowerCase() === 'yunaonice') {
      // Update tenant password if tenant record exists or persist to environment session state
      await repository.updateTenantPassword('t-default', newPassword.trim());
      revalidatePath('/admin');
      revalidatePath('/settings');
      return { success: true, message: 'Admin password updated successfully!' };
    } else if (user.tenant_id) {
      await repository.updateTenantPassword(user.tenant_id, newPassword.trim());
      revalidatePath('/settings');
      return { success: true, message: 'Password updated successfully!' };
    }

    return { success: false, error: 'Unable to update password' };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to update password' };
  }
}
