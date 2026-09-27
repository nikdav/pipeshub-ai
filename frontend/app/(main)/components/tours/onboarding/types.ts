// ===============================
// Onboarding Tour Types
// ===============================

export type TourStepId = 'step1' | 'step2' | 'step3';

export interface TourStepDetail {
  title: string;
  /** Present only for the client-owned tour stub; remote copy stays source-authored. */
  titleKey?: string;
  relativeLink: string;
}

export interface TourStateActive {
  status: 'active';
  currentStep: TourStepId;
  /** 0–100 — used directly as the pixel loader fill percentage */
  completionPercentage: number;
  title: string;
  /** Present only for the client-owned tour stub; remote copy stays source-authored. */
  titleKey?: string;
  subtitle: string;
  subtitleKey?: string;
  stepsOrder: TourStepId[];
  stepsDetails: Partial<Record<TourStepId, TourStepDetail>>;
}

export interface TourStateCompleted {
  status: 'completed';
  title: string;
  titleKey?: string;
  subtitle: string;
  subtitleKey?: string;
}

/** Backend sends this after the user dismisses the tour — card should not be shown */
export interface TourStateHidden {
  status: 'hidden';
}

export type TourState = TourStateActive | TourStateCompleted | TourStateHidden;
