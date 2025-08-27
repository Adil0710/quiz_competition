import mongoose, { Schema, Document } from 'mongoose';

export interface IRound extends Document {
  roundNumber: number;
  type: 'mcq' | 'media' | 'buzzer' | 'rapid_fire' | 'sequence' | 'visual_rapid_fire';
  phase: 'league' | 'semi_final' | 'final';
  questions: mongoose.Types.ObjectId[];
  teamScores: {
    team: mongoose.Types.ObjectId;
    score: number;
    answers: {
      question: mongoose.Types.ObjectId;
      answer: string | number;
      isCorrect: boolean;
      points: number;
      timeSpent?: number;
    }[];
  }[];
  isCompleted: boolean;
  startTime?: Date;
  endTime?: Date;
}

export interface ICompetition extends Document {
  name: string;
  description: string;
  status: 'draft' | 'ongoing' | 'completed';
  currentStage: 'group' | 'semi_final' | 'final';
  teams: mongoose.Types.ObjectId[];
  groups: mongoose.Types.ObjectId[];
  rounds: IRound[];
  teamScores: { team: mongoose.Types.ObjectId; score: number }[];
  usedQuestions: mongoose.Types.ObjectId[];
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RoundSchema: Schema = new Schema({
  roundNumber: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['mcq', 'media', 'buzzer', 'rapid_fire', 'sequence', 'visual_rapid_fire'],
    required: true
  },
  phase: {
    type: String,
    enum: ['league', 'semi_final', 'final'],
    required: true
  },
  questions: [{
    type: Schema.Types.ObjectId,
    ref: 'Question'
  }],
  teamScores: [{
    team: {
      type: Schema.Types.ObjectId,
      ref: 'Team'
    },
    score: {
      type: Number,
      default: 0
    },
    answers: [{
      question: {
        type: Schema.Types.ObjectId,
        ref: 'Question'
      },
      answer: String,
      isCorrect: {
        type: Boolean,
        default: false
      },
      points: {
        type: Number,
        default: 0
      },
      timeSpent: {
        type: Number
      }
    }]
  }],
  isCompleted: {
    type: Boolean,
    default: false
  },
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  }
});

const CompetitionSchema: Schema = new Schema({
  name: {
    type: String,
    required: [true, 'Competition name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['draft', 'ongoing', 'completed'],
    default: 'draft'
  },
  currentStage: {
    type: String,
    enum: ['group', 'semi_final', 'final'],
    default: 'group'
  },
  teams: [{
    type: Schema.Types.ObjectId,
    ref: 'Team'
  }],
  groups: [{
    type: Schema.Types.ObjectId,
    ref: 'Group'
  }],
  rounds: [RoundSchema],
  teamScores: [{
    team: {
      type: Schema.Types.ObjectId,
      ref: 'Team'
    },
    score: {
      type: Number,
      default: 0
    }
  }],
  usedQuestions: [{
    type: Schema.Types.ObjectId,
    ref: 'Question'
  }],
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date
  }
}, {
  timestamps: true
});

export default mongoose.models.Competition || mongoose.model<ICompetition>('Competition', CompetitionSchema);
