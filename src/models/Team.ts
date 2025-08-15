import mongoose, { Schema, Document } from 'mongoose';

export interface ITeam extends Document {
  name: string;
  college: mongoose.Types.ObjectId;
  members: {
    name: string;
    email: string;
    phone: string;
    role: 'captain' | 'member';
  }[];
  totalScore: number;
  currentStage: 'group' | 'semi_final' | 'final' | 'eliminated';
  groupId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TeamSchema: Schema = new Schema({
  name: {
    type: String,
    required: [true, 'Team name is required'],
    trim: true
  },
  college: {
    type: Schema.Types.ObjectId,
    ref: 'College',
    required: [true, 'College is required']
  },
  members: [{
    name: {
      type: String,
      required: [true, 'Member name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Member email is required'],
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      required: [true, 'Member phone is required'],
      trim: true
    },
    role: {
      type: String,
      enum: ['captain', 'member'],
      required: [true, 'Member role is required']
    }
  }],
  totalScore: {
    type: Number,
    default: 0
  },
  currentStage: {
    type: String,
    enum: ['group', 'semi_final', 'final', 'eliminated'],
    default: 'group'
  },
  groupId: {
    type: Schema.Types.ObjectId,
    ref: 'Group'
  }
}, {
  timestamps: true
});

export default mongoose.models.Team || mongoose.model<ITeam>('Team', TeamSchema);
