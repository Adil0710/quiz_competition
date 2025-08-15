import mongoose, { Schema, Document } from 'mongoose';

export interface ICollege extends Document {
  name: string;
  code: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  createdAt: Date;
  updatedAt: Date;
}

const CollegeSchema: Schema = new Schema({
  name: {
    type: String,
    required: [true, 'College name is required'],
    trim: true,
    unique: true
  },
  code: {
    type: String,
    required: [true, 'College code is required'],
    trim: true,
    unique: true,
    uppercase: true
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true
  },
  contactEmail: {
    type: String,
    required: [true, 'Contact email is required'],
    trim: true,
    lowercase: true
  },
  contactPhone: {
    type: String,
    required: [true, 'Contact phone is required'],
    trim: true
  }
}, {
  timestamps: true
});

export default mongoose.models.College || mongoose.model<ICollege>('College', CollegeSchema);
