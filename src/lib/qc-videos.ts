import { qcVideos } from '../data/qc-videos';
import type { QcVideoCardData } from '../types/qc-video';
import { publicStorageUrl } from './admin/storage';
import { getStorefrontProductSlugs } from './catalog';

export const QC_VIDEO_BUCKET = 'qc-videos';
export const QC_VIDEOS_PATH = '/qc-videos/';

export function formatDurationLabel(seconds: number | null | undefined): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

export function formatDurationIso(seconds: number | null | undefined): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;
  const parts = ['PT'];

  if (hours > 0) {
    parts.push(`${hours}H`);
  }
  if (minutes > 0 || hours > 0) {
    parts.push(`${minutes}M`);
  }
  if (remainder > 0 || parts.length === 1) {
    parts.push(`${remainder}S`);
  }

  return parts.join('');
}

export function qcVideoDescription(video: { productName: string; reference: string | null }): string {
  const reference = video.reference ? ` (${video.reference})` : '';
  return `Quality-check video of the ${video.productName}${reference}, showing finishing, details, and overall presentation.`;
}

function qcMediaUrl(path: string | null | undefined): string | null {
  if (!path) {
    return null;
  }

  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/')) {
    return path;
  }

  return publicStorageUrl(QC_VIDEO_BUCKET, path);
}

export async function getQcVideosForPage(): Promise<QcVideoCardData[]> {
  const storefrontSlugs = new Set(await getStorefrontProductSlugs());

  return qcVideos.flatMap((video) => {
    const videoUrl = qcMediaUrl(video.videoPath);
    const thumbnailUrl = qcMediaUrl(video.thumbnailPath);
    if (!videoUrl || !thumbnailUrl) {
      return [];
    }

    const productHref =
      video.productSlug && storefrontSlugs.has(video.productSlug)
        ? `/products/${video.productSlug}/`
        : null;

    return [
      {
        ...video,
        videoUrl,
        thumbnailUrl,
        productHref,
        durationLabel: formatDurationLabel(video.durationSeconds),
        durationIso: formatDurationIso(video.durationSeconds),
      },
    ];
  });
}
