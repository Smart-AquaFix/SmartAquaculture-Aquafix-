export interface FishPondAnimationProps {
  fishCount: number;
  waterFlow: number;
  aeration: boolean;
}

export interface WaterQualityCardProps {
  title: string;
  value: number;
  unit: string;
  idealRange: [number, number];
  dangerThreshold: number;
  warningThreshold: number;
}