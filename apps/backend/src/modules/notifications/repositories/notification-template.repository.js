import mongoose from 'mongoose';
import NotificationTemplate from '../models/notification-template.model.js';
import { SupportedLanguages } from '../constants/notification.constants.js';

export class NotificationTemplateRepository {
  async findByKeyAndChannel(templateKey, channel, language = SupportedLanguages.EN) {
    if (mongoose.connection.readyState !== 1) {
      return null;
    }

    // Exact match
    const template = await NotificationTemplate.findOne({
      templateKey,
      channel,
      language,
      isActive: true
    }).lean();

    if (template) {
      return template;
    }

    // Fallback to English if specified language is missing
    if (language !== SupportedLanguages.EN) {
      return NotificationTemplate.findOne({
        templateKey,
        channel,
        language: SupportedLanguages.EN,
        isActive: true
      }).lean();
    }

    return null;
  }

  async createOrUpdateTemplate(templateData) {
    const { templateKey, channel, language } = templateData;
    return NotificationTemplate.findOneAndUpdate(
      { templateKey, channel, language },
      { $set: templateData },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  }

  async listTemplates({ channel, language } = {}) {
    const filter = { isActive: true };
    if (channel) {
      filter.channel = channel;
    }
    if (language) {
      filter.language = language;
    }
    return NotificationTemplate.find(filter).sort({ templateKey: 1, channel: 1 }).lean();
  }
}

export const notificationTemplateRepository = new NotificationTemplateRepository();
export default notificationTemplateRepository;
