import mongoose, { Schema, Document } from 'mongoose';

export interface IGroup extends Document {
  name: string;
  stage: 'group' | 'semi_final' | 'final';
  teams: mongoose.Types.ObjectId[];
  competition: mongoose.Types.ObjectId;
  isActive: boolean;
  currentRound: number;
  maxRounds: number;
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema: Schema = new Schema({
  name: {
    type: String,
    required: [true, 'Group name is required'],
    trim: true
  },
  stage: {
    type: String,
    enum: ['group', 'semi_final', 'final'],
    required: [true, 'Stage is required']
  },
  teams: [{
    type: Schema.Types.ObjectId,
    ref: 'Team'
  }],
  competition: {
    type: Schema.Types.ObjectId,
    ref: 'Competition',
    required: [true, 'Competition is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  currentRound: {
    type: Number,
    default: 1
  },
  maxRounds: {
    type: Number,
    default: 3
  }
}, {
  timestamps: true
});

export default mongoose.models.Group || mongoose.model<IGroup>('Group', GroupSchema);
