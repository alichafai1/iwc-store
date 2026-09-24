export interface QcVideoRecord {
  id: string;
  productName: string;
  productSlug: string | null;
  reference: string | null;
  videoPath: string;
  thumbnailPath: string;
  durationSeconds: number | null;
  uploadDate: string;
}

export interface QcVideoCardData extends QcVideoRecord {
  videoUrl: string;
  thumbnailUrl: string;
  productHref: string | null;
  durationLabel: string | null;
  durationIso: string | null;
}
