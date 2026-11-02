/**
 * Super Admin Initialization Script
 * Bootstraps the platform with the root Super Admin credentials.
 * Can be executed via: npm run init:super-admin or node src/scripts/init-super-admin.js
 */
import mongoose from 'mongoose';
import logger from '../config/logger.js';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { User } from '../modules/users/model/user.model.js';
import { Roles, ApprovalStatus } from '../modules/auth/auth.constants.js';
import { hashPassword, normalizeEmail, normalizeMobile } from '../modules/auth/auth.utils.js';
import AuthRepository from '../modules/auth/auth.repository.js';

export async function bootstrapSuperAdmin() {
  const email = normalizeEmail(process.env.SUPER_ADMIN_EMAIL || 'admin@bookmyshow.clone');
  const rawMobile = process.env.SUPER_ADMIN_PHONE || '9876543210';
  const phone = normalizeMobile(rawMobile);
  const password = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@Secure2026!';
  const name = process.env.SUPER_ADMIN_NAME || 'Platform Super Admin';

  try {
    logger.info('Connecting to database to provision Super Admin...');
    await connectDatabase();

    const existingAdmin = await User.findOne({
      $or: [{ email }, { phone }, { role: Roles.SUPER_ADMIN }]
    });

    if (existingAdmin) {
      if (existingAdmin.role === Roles.SUPER_ADMIN) {
        logger.info(
          `Super Admin already exists with email: ${existingAdmin.email}. No action required.`
        );
        return existingAdmin;
      }
      logger.warn(
        `User with email ${email} or phone ${phone} exists with role ${existingAdmin.role}. Aborting.`
      );
      return null;
    }

    const passwordHash = await hashPassword(password);

    const superAdmin = await AuthRepository.createUser({
      name,
      email,
      phone,
      passwordHash,
      role: Roles.SUPER_ADMIN,
      approvalStatus: ApprovalStatus.APPROVED,
      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true
    });

    await AuthRepository.createAuditLog({
      actorId: superAdmin._id,
      actorRole: Roles.SUPER_ADMIN,
      action: 'BOOTSTRAP_SUPER_ADMIN',
      targetResource: 'users',
      targetId: superAdmin._id,
      ipAddress: '127.0.0.1',
      userAgent: 'cli-bootstrap-script',
      details: { email, role: Roles.SUPER_ADMIN }
    });

    logger.info(`Super Admin provisioned successfully: ID=${superAdmin._id}, Email=${email}`);
    return superAdmin;
  } catch (error) {
    logger.error('Failed to initialize Super Admin account:', error);
    throw error;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await disconnectDatabase();
    }
  }
}

// Allow execution directly from CLI
if (process.argv[1]?.endsWith('init-super-admin.js')) {
  bootstrapSuperAdmin()
    .then(() => {
      logger.info('Super Admin provisioning completed.');
      process.exit(0);
    })
    .catch(() => {
      process.exit(1);
    });
}

export default bootstrapSuperAdmin;
