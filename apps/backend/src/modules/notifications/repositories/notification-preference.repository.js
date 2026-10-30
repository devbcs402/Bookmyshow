import NotificationPreference from '../models/notification-preference.model.js';

export class NotificationPreferenceRepository {
  async findByUserId(userId) {
    return NotificationPreference.findOne({ userId });
  }

  async upsertPreferences(userId, updateData) {
    return NotificationPreference.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  }
}

export const notificationPreferenceRepository = new NotificationPreferenceRepository();
export default notificationPreferenceRepository;

