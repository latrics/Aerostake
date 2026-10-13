// Payload options
export type PayloadType = '61mp_camera' | 'lidar' | 'oblique_camera';

// Processing mode
export type ProcessingMode = 'pre_processing' | 'post_processing';

// Deliverable option definition
export interface DeliverableOption {
  id: string;
  label: string;
  description?: string;
}

export const PRE_PROCESSING_DELIVERABLES: DeliverableOption[] = [
  { id: 'geo_tagged_image', label: 'Geo Tagged Image' },
  { id: 'event_files', label: 'Event Files' },
  { id: 'point_cloud', label: 'Point Cloud' },
  { id: 'trajectory_files', label: 'Trajectory Files' },
];

export const POST_PROCESSING_DELIVERABLES: DeliverableOption[] = [
  { id: 'orthomosaic', label: 'Orthomosaic' },
  { id: 'topographic_map', label: 'Topographic Map' },
  { id: 'dem', label: 'DEM' },
  { id: 'dsm', label: 'DSM' },
  { id: 'point_cloud', label: 'Point Cloud' },
  { id: '3d_model', label: '3D Model' },
  { id: 'cad', label: 'CAD' },
  { id: 'volumetric_analysis', label: 'Volumetric Analysis' },
  { id: 'contour', label: 'Contour' },
];

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
