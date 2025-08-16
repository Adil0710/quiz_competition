import mongoose, { Schema, Document } from 'mongoose';

export interface IRound extends Document {
  roundNumber: number;
  type: 'mcq' | 'media' | 'rapid_fire';
  questions: mongoose.Types.ObjectId[];
  teamScores: {
    team: mongoose.Types.ObjectId;
    score: number;
    answers: {
      question: mongoose.Types.ObjectId;
      answer: string;
      isCorrect: boolean;
      points: number;
    }[];
  }[];
  isCompleted: boolean;
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
    enum: ['mcq', 'media', 'rapid_fire'],
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
      }
    }]
  }],
  isCompleted: {
    type: Boolean,
    default: false
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
