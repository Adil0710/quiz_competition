import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestion extends Document {
  question: string;
  type: 'mcq' | 'media' | 'buzzer' | 'rapid_fire' | 'sequence' | 'visual_rapid_fire';
  options?: string[];
  correctAnswer?: string | number;
  mediaUrl?: string;
  mediaType?: 'image' | 'audio' | 'video';
  imageUrls?: string[]; // Array of images for visual rapid fire
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  points: number;
  phase: 'league' | 'semi_final' | 'final';
  isUsed: boolean;
  usedInCompetitions: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema: Schema = new Schema({
  question: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['mcq', 'media', 'buzzer', 'rapid_fire', 'sequence', 'visual_rapid_fire'],
    required: [true, 'Question type is required']
  },
  options: [{
    type: String,
    trim: true
  }],
  correctAnswer: {
    type: Schema.Types.Mixed // Can be string or number
  },
  mediaUrl: {
    type: String,
    trim: true
  },
  mediaType: {
    type: String,
    enum: ['image', 'audio', 'video']
  },
  imageUrls: [{
    type: String,
    trim: true
  }],
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true
  },
  points: {
    type: Number,
    default: 1,
    min: 1
  },
  phase: {
    type: String,
    enum: ['league', 'semi_final', 'final'],
    required: [true, 'Phase is required']
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  usedInCompetitions: [{
    type: Schema.Types.ObjectId,
    ref: 'Competition'
  }]
}, {
  timestamps: true
});

export default mongoose.models.Question || mongoose.model<IQuestion>('Question', QuestionSchema);
