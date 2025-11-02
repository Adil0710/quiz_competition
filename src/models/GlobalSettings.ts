import mongoose from 'mongoose';

export interface IGlobalSettings extends mongoose.Document {
  mcqPoints: number;
  mediaPoints: number;
  buzzerPoints: number;
  rapidFirePoints: number;
  sequencePoints: number;
  visualRapidFirePoints: number;
  mcqNegativeMarking: boolean;
  mediaNegativeMarking: boolean;
  rapidFireNegativeMarking: boolean;
  sequenceNegativeMarking: boolean;
  visualRapidFireNegativeMarking: boolean;
  mcqTimer: number;
  mediaTimer: number;
  buzzerTimer: number;
  rapidFireTimer: number;
  sequenceTimer: number;
  visualRapidFireTimer: number;
  createdAt: Date;
  updatedAt: Date;
}

const GlobalSettingsSchema = new mongoose.Schema<IGlobalSettings>({
  mcqPoints: {
    type: Number,
    required: true,
    default: 10
  },
  mediaPoints: {
    type: Number,
    required: true,
    default: 10
  },
  buzzerPoints: {
    type: Number,
    required: true,
    default: 10
  },
  rapidFirePoints: {
    type: Number,
    required: true,
    default: 10
  },
  sequencePoints: {
    type: Number,
    required: true,
    default: 10
  },
  visualRapidFirePoints: {
    type: Number,
    required: true,
    default: 10
  },
  mcqNegativeMarking: {
    type: Boolean,
    required: true,
    default: false
  },
  mediaNegativeMarking: {
    type: Boolean,
    required: true,
    default: false
  },
  rapidFireNegativeMarking: {
    type: Boolean,
    required: true,
    default: false
  },
  sequenceNegativeMarking: {
    type: Boolean,
    required: true,
    default: false
  },
  visualRapidFireNegativeMarking: {
    type: Boolean,
    required: true,
    default: false
  },
  mcqTimer: {
    type: Number,
    required: true,
    default: 10
  },
  mediaTimer: {
    type: Number,
    required: true,
    default: 10
  },
  buzzerTimer: {
    type: Number,
    required: true,
    default: 10
  },
  rapidFireTimer: {
    type: Number,
    required: true,
    default: 60
  },
  sequenceTimer: {
    type: Number,
    required: true,
    default: 20
  },
  visualRapidFireTimer: {
    type: Number,
    required: true,
    default: 60
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
GlobalSettingsSchema.index({}, { unique: true });

const GlobalSettings = mongoose.models.GlobalSettings || mongoose.model<IGlobalSettings>('GlobalSettings', GlobalSettingsSchema);

export default GlobalSettings;
