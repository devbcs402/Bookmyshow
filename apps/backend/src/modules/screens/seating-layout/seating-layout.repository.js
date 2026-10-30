import SeatingLayout from './seating-layout.model.js';
import { LayoutStatus } from '../screen.constants.js';

export class SeatingLayoutRepository {
  /**
   * Create a new seating layout
   */
  static async create(layoutData, session = null) {
    const options = session ? { session } : {};
    const [layout] = await SeatingLayout.create([layoutData], options);
    return layout;
  }

  /**
   * Find layout by ID
   */
  static async findById(id) {
    return SeatingLayout.findById(id).exec();
  }

  /**
   * Find layout by screen ID and version number
   */
  static async findByScreenAndVersion(screenId, layoutVersion) {
    return SeatingLayout.findOne({
      screenId,
      layoutVersion
    }).exec();
  }

  /**
   * Find current DRAFT layout for a screen
   */
  static async findDraftByScreen(screenId) {
    return SeatingLayout.findOne({
      screenId,
      status: LayoutStatus.DRAFT
    }).exec();
  }

  /**
   * Find current active/PUBLISHED layout for a screen
   */
  static async findLatestPublishedByScreen(screenId) {
    return SeatingLayout.findOne({
      screenId,
      status: LayoutStatus.PUBLISHED
    })
      .sort({ layoutVersion: -1 })
      .exec();
  }

  /**
   * Get all version summaries for a screen
   */
  static async findVersionsByScreen(screenId) {
    return SeatingLayout.find(
      { screenId },
      {
        layoutVersion: 1,
        name: 1,
        status: 1,
        totalSeats: 1,
        bookableSeats: 1,
        totalRows: 1,
        totalColumns: 1,
        categoryBreakdown: 1,
        publishedAt: 1,
        createdAt: 1,
        updatedAt: 1
      }
    )
      .sort({ layoutVersion: -1 })
      .exec();
  }

  /**
   * Update layout by ID
   */
  static async updateById(id, updateData, session = null) {
    const options = { new: true, runValidators: true };
    if (session) {
      options.session = session;
    }
    return SeatingLayout.findByIdAndUpdate(id, updateData, options).exec();
  }

  /**
   * Deprecate all previous published versions for a screen when a new one is published
   */
  static async deprecatePreviousPublished(screenId, currentVersion, session = null) {
    const options = session ? { session } : {};
    return SeatingLayout.updateMany(
      {
        screenId,
        status: LayoutStatus.PUBLISHED,
        layoutVersion: { $lt: currentVersion }
      },
      {
        $set: { status: LayoutStatus.DEPRECATED }
      },
      options
    ).exec();
  }
}

export default SeatingLayoutRepository;

