import mongoose, { Schema, Document } from 'mongoose';

export interface ISchool extends Document {
  name: string;
  code: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  createdAt: Date;
  updatedAt: Date;
}

const SchoolSchema: Schema = new Schema({
  name: {
    type: String,
    required: [true, 'School name is required'],
    trim: true,
    unique: true
  },
  code: {
    type: String,
    required: [true, 'School code is required'],
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

export default mongoose.models.School || mongoose.model<ISchool>('School', SchoolSchema);
