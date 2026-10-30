# Movie Module Media Management Architecture

This document details the media management architecture, upload validation policies, aspect ratio guidelines, trailer streaming integration, and asset cleanup lifecycle implemented in the **Movie Management Module**.

---

## 1. Provider-Independent Architecture

To avoid tight coupling to any single cloud infrastructure provider (Cloudinary, AWS S3, Google Cloud Storage, or Azure Blob Storage), media operations are abstracted through a unified interface:

```text
apps/backend/src/services/media/media.service.js
```

### 1.1 Structural Overview

```
                      +-----------------------------+
                      |       MediaService          |
                      | (MIME, size, category validation)
                      +--------------+--------------+
                                     |
               +---------------------+---------------------+
               |                     |                     |
               v                     v                     v
       +---------------+     +---------------+     +---------------+
       |  Cloudinary   |     |    AWS S3     |     |  Local/Mock   |
       |    Provider   |     |   Provider    |     |   Provider    |
       +---------------+     +---------------+     +---------------+
```

The media service enforces uniform validation, dimension guidelines, and URL formatting before persisting references in MongoDB documents.

---

## 2. Validation Specifications & Limits

### 2.1 File Types & Maximum Sizes

| Asset Type | Supported MIME Types | Max Size | Allowed Extensions |
| :--- | :--- | :---: | :--- |
| **Still Images** | `image/jpeg`, `image/png`, `image/webp` | **5 MB** | `.jpg`, `.jpeg`, `.png`, `.webp` |
| **Vector Logos** | `image/svg+xml` | **1 MB** | `.svg` |
| **Video Files** | External Streaming URLs only (YouTube, Vimeo) | N/A | Hosted by streaming CDN |

> [!IMPORTANT]
> Uncompressed TIFF, BMP, or executable binaries (`.exe`, `.sh`, `.svg` with inline scripts) are strictly rejected with `400 Bad Request`.

---

## 3. Media Categories & Recommended Aspect Ratios

Each media asset linked to a movie is categorized with strict aspect ratio recommendations:

| Category | Recommended Ratio | Ideal Resolution | Usage Context |
| :--- | :---: | :---: | :--- |
| `POSTER` | **2:3** (Vertical) | 600 × 900 px (or 1000 × 1500 px) | Movie discovery cards, mobile listings, search results. |
| `BANNER` | **16:9** (Landscape) | 1920 × 1080 px | Hero carousel on homepage, featured movie banners. |
| `BACKDROP` | **16:9** (High-Res) | 2560 × 1440 px | Background wallpaper for desktop movie detail pages. |
| `GALLERY` | **16:9** or **4:3** | 1280 × 720 px | Production stills, behind-the-scenes photo galleries. |
| `TRAILER_THUMBNAIL` | **16:9** | 1280 × 720 px | Video preview cards in the trailer rail. |
| `CAST_PHOTO` | **1:1** (Square) | 500 × 500 px | Circular headshots for actors on detail pages. |
| `CREW_PHOTO` | **1:1** (Square) | 500 × 500 px | Headshots for directors, producers, and musicians. |

---

## 4. Video Streaming & Trailer Integration

To ensure fast streaming performance and zero storage bandwidth costs on the core cluster, video trailers are not hosted directly on the application servers. Instead, external streaming URLs are validated and canonicalized.

### 4.1 Supported Video Providers
1. **YouTube**:
   - Standard: `https://www.youtube.com/watch?v=VIDEO_ID`
   - Shortened: `https://youtu.be/VIDEO_ID`
   - Embed: `https://www.youtube.com/embed/VIDEO_ID`
2. **Vimeo**:
   - Standard: `https://vimeo.com/VIDEO_ID`
   - Player: `https://player.vimeo.com/video/VIDEO_ID`

### 4.2 Trailer Extraction & Validation
The `MediaService.validateTrailerUrl()` method validates the URL structure and extracts the canonical video identifier:

```javascript
const YOUTUBE_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
const VIMEO_REGEX = /^(https?:\/\/)?(www\.)?(vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]{6,11})/;
```

Invalid URLs (or non-whitelisted domains) are rejected during Zod request schema validation.

---

## 5. Media Lifecycle & Orphaned Asset Cleanup

### 5.1 Asset Replacement
When an administrator updates a movie's `posterUrl` or `bannerUrl`:
1. The new URL is validated and saved to MongoDB.
2. The `MediaService.deleteMediaAsset(oldAssetUrl)` method is triggered.
3. The public ID is parsed from the Cloudinary URL (e.g., `posters/dune2_poster_v1`).
4. A non-blocking asynchronous call invokes the storage provider's destruction API to remove the old asset, preventing orphaned file accumulation.

### 5.2 Soft-Delete Retention
When a movie is soft-deleted (`isDeleted: true`):
- Media assets are **retained** in cloud storage to ensure customer historical booking receipts and booking confirmation emails continue to render poster images properly.
- If a hard purge is explicitly executed by Super Admin after legal retention expiry, the media cleanup hook permanently destroys all associated assets.

