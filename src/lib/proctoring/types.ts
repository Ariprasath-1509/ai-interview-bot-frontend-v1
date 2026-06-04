export type ProctorEventType =
  | "phone_detected"
  | "camera_blocked"
  | "no_face"
  | "multiple_faces"
  | "looking_away"
  | "gaze_away"
  | "identity_mismatch"
  | "liveness_failed"
  | "fullscreen_exit"
  | "cross_signal"
  | "clear";

export type ProctorSeverity = "hard" | "soft";

export type ProctorStatus =
  | "PENDING"
  | "MONITORING"
  | "WARNING"
  | "PAUSED"
  | "FAILED"
  | "NOT_AVAILABLE";

export type ProctorViolationLevel = "none" | "warning" | "paused";

export type ProctorEvent = {
  at: string;
  type: ProctorEventType;
  severity: ProctorSeverity;
  reasons: string[];
  confidence?: number;
};

export type VideoProctoringSnapshot = {
  status: ProctorStatus;
  ready: boolean;
  /** Camera stream is active (distinct from enrollment success). */
  cameraActive: boolean;
  /** TensorFlow models finished loading (may still need enrollment). */
  modelsLoaded: boolean;
  enrolled: boolean;
  enrolling: boolean;
  monitoring: boolean;
  violationLevel: ProctorViolationLevel;
  strikes: Record<ProctorEventType, number>;
  totalEvents: number;
  lastReasons: string[];
  note: string;
  integrityScore?: number;
};

export type DetectionConfig = {
  phoneDetection: boolean;
  cameraBlocked: boolean;
  facePresence: boolean;
  multipleFaces: boolean;
  lookingAway: boolean;
  identityCheck: boolean;
  livenessCheck: boolean;
  meshGaze: boolean;
  tiled: boolean;
  deviceScore: number;
  detectIntervalMs: number;
};

export type DetectionResult = {
  reasons: string[];
  hardViolation: boolean;
  blocked: boolean;
  device: boolean;
  eventType: ProctorEventType | null;
  confidence?: number;
};

export type CocoModel = {
  detect: (
    input: HTMLVideoElement | HTMLCanvasElement,
    maxNumBoxes?: number,
  ) => Promise<Array<{ class: string; score: number; bbox: number[] }>>;
};

export type BlazeFaceModel = {
  estimateFaces: (
    input: HTMLVideoElement | HTMLCanvasElement,
    returnTensors?: boolean,
  ) => Promise<
    Array<{
      probability?: unknown;
      landmarks?: number[][];
    }>
  >;
};
