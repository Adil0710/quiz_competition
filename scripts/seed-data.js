const mongoose = require('mongoose');

// Inline Schemas to run with plain Node (no TS/Next build needed)
const CollegeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    code: { type: String, required: true, trim: true, unique: true, uppercase: true },
    address: { type: String, required: true, trim: true },
    contactEmail: { type: String, required: true, trim: true, lowercase: true },
    contactPhone: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const QuestionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    type: { type: String, enum: ['mcq', 'media', 'rapid_fire'], required: true },
    options: [{ type: String, trim: true }],
    correctAnswer: { type: mongoose.Schema.Types.Mixed },
    mediaUrl: { type: String, trim: true },
    mediaType: { type: String, enum: ['image', 'audio', 'video'] },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    category: { type: String, required: true, trim: true },
    points: { type: Number, default: 1, min: 1 },
    isUsed: { type: Boolean, default: false },
    usedInCompetitions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Competition' }],
  },
  { timestamps: true }
);

const School = mongoose.models.School || mongoose.model('School', CollegeSchema);
const Question = mongoose.models.Question || mongoose.model('Question', QuestionSchema);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/quiz_competition';


async function seedData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await School.deleteMany({});
    await Question.deleteMany({});
    console.log('Cleared existing data');

    // Create sample schools
    const schools = await School.insertMany([
      {
        name: 'Massachusetts Institute of Technology',
        code: 'MIT',
        address: 'Cambridge, MA',
        contactEmail: 'admin@mit.edu',
        contactPhone: '+1-617-253-1000'
      },
      {
        name: 'Stanford University',
        code: 'STAN',
        address: 'Stanford, CA',
        contactEmail: 'admin@stanford.edu',
        contactPhone: '+1-650-723-2300'
      },
      {
        name: 'Harvard University',
        code: 'HARV',
        address: 'Cambridge, MA',
        contactEmail: 'admin@harvard.edu',
        contactPhone: '+1-617-495-1000'
      },
      {
        name: 'California Institute of Technology',
        code: 'CALT',
        address: 'Pasadena, CA',
        contactEmail: 'admin@caltech.edu',
        contactPhone: '+1-626-395-6811'
      },
      {
        name: 'University of California Berkeley',
        code: 'UCB',
        address: 'Berkeley, CA',
        contactEmail: 'admin@berkeley.edu',
        contactPhone: '+1-510-642-6000'
      },
      {
        name: 'Carnegie Mellon University',
        code: 'CMU',
        address: 'Pittsburgh, PA',
        contactEmail: 'admin@cmu.edu',
        contactPhone: '+1-412-268-2000'
      },
      {
        name: 'University of Oxford',
        code: 'OXF',
        address: 'Oxford, UK',
        contactEmail: 'admin@ox.ac.uk',
        contactPhone: '+44-1865-270000'
      },
      {
        name: 'University of Cambridge',
        code: 'CAM',
        address: 'Cambridge, UK',
        contactEmail: 'admin@cam.ac.uk',
        contactPhone: '+44-1223-337733'
      },
      {
        name: 'Princeton University',
        code: 'PRIN',
        address: 'Princeton, NJ',
        contactEmail: 'admin@princeton.edu',
        contactPhone: '+1-609-258-3000'
      },
      {
        name: 'Yale University',
        code: 'YALE',
        address: 'New Haven, CT',
        contactEmail: 'admin@yale.edu',
        contactPhone: '+1-203-432-4771'
      },
      {
        name: 'University of Toronto',
        code: 'UTOR',
        address: 'Toronto, ON, Canada',
        contactEmail: 'admin@utoronto.ca',
        contactPhone: '+1-416-978-2011'
      },
      {
        name: 'University of Melbourne',
        code: 'UMEL',
        address: 'Melbourne, VIC, Australia',
        contactEmail: 'admin@unimelb.edu.au',
        contactPhone: '+61-3-9035-5511'
      },
      {
        name: 'ETH Zurich',
        code: 'ETHZ',
        address: 'Zurich, Switzerland',
        contactEmail: 'admin@ethz.ch',
        contactPhone: '+41-44-632-1111'
      },
      {
        name: 'National University of Singapore',
        code: 'NUS',
        address: 'Singapore',
        contactEmail: 'admin@nus.edu.sg',
        contactPhone: '+65-6516-6666'
      },
      {
        name: 'The University of Tokyo',
        code: 'UTOK',
        address: 'Tokyo, Japan',
        contactEmail: 'admin@u-tokyo.ac.jp',
        contactPhone: '+81-3-3812-2111'
      },
      {
        name: 'Imperial School London',
        code: 'ICL',
        address: 'London, UK',
        contactEmail: 'admin@imperial.ac.uk',
        contactPhone: '+44-20-7589-5111'
      },
      {
        name: 'University of Michigan',
        code: 'UMICH',
        address: 'Ann Arbor, MI',
        contactEmail: 'admin@umich.edu',
        contactPhone: '+1-734-764-1817'
      },
      {
        name: 'Tsinghua University',
        code: 'TSIN',
        address: 'Beijing, China',
        contactEmail: 'admin@tsinghua.edu.cn',
        contactPhone: '+86-10-6278-5000'
      }
    ]);

    console.log(`Created ${schools.length} schools`);

    // Create sample questions (mcq, media, rapid_fire)
    const questions = await Question.insertMany([
      // MCQ
      {
        question: 'What is the capital of France?',
        type: 'mcq',
        options: ['London', 'Berlin', 'Paris', 'Madrid'],
        correctAnswer: 2,
        difficulty: 'easy',
        category: 'Geography',
        points: 10
      },
      {
        question: 'Who wrote the novel "1984"?',
        type: 'mcq',
        options: ['George Orwell', 'Aldous Huxley', 'Ray Bradbury', 'Ernest Hemingway'],
        correctAnswer: 0,
        difficulty: 'medium',
        category: 'Literature',
        points: 15
      },
      {
        question: 'What is the chemical symbol for gold?',
        type: 'mcq',
        options: ['Go', 'Gd', 'Au', 'Ag'],
        correctAnswer: 2,
        difficulty: 'medium',
        category: 'Science',
        points: 15
      },
      {
        question: 'In which year did World War II end?',
        type: 'mcq',
        options: ['1944', '1945', '1946', '1947'],
        correctAnswer: 1,
        difficulty: 'easy',
        category: 'History',
        points: 10
      },
      {
        question: 'What is the largest planet in our solar system?',
        type: 'mcq',
        options: ['Saturn', 'Jupiter', 'Neptune', 'Uranus'],
        correctAnswer: 1,
        difficulty: 'easy',
        category: 'Science',
        points: 10
      },
      {
        question: 'Who painted the Mona Lisa?',
        type: 'mcq',
        options: ['Vincent van Gogh', 'Pablo Picasso', 'Leonardo da Vinci', 'Michelangelo'],
        correctAnswer: 2,
        difficulty: 'easy',
        category: 'Art',
        points: 10
      },
      {
        question: 'What is the square root of 144?',
        type: 'mcq',
        options: ['10', '11', '12', '13'],
        correctAnswer: 2,
        difficulty: 'easy',
        category: 'Mathematics',
        points: 10
      },
      {
        question: 'Which programming language was developed by James Gosling?',
        type: 'mcq',
        options: ['Python', 'Java', 'C++', 'JavaScript'],
        correctAnswer: 1,
        difficulty: 'medium',
        category: 'Technology',
        points: 15
      },
      {
        question: 'What is the longest river in the world?',
        type: 'mcq',
        options: ['Amazon River', 'Nile River', 'Mississippi River', 'Yangtze River'],
        correctAnswer: 1,
        difficulty: 'medium',
        category: 'Geography',
        points: 15
      },
      {
        question: 'Who developed the theory of relativity?',
        type: 'mcq',
        options: ['Isaac Newton', 'Albert Einstein', 'Galileo Galilei', 'Stephen Hawking'],
        correctAnswer: 1,
        difficulty: 'medium',
        category: 'Science',
        points: 15
      },
      {
        question: 'What is the smallest country in the world?',
        type: 'mcq',
        options: ['Monaco', 'Vatican City', 'San Marino', 'Liechtenstein'],
        correctAnswer: 1,
        difficulty: 'hard',
        category: 'Geography',
        points: 20
      },
      {
        question: 'In which year was the first iPhone released?',
        type: 'mcq',
        options: ['2006', '2007', '2008', '2009'],
        correctAnswer: 1,
        difficulty: 'medium',
        category: 'Technology',
        points: 15
      },
      {
        question: 'What is the hardest natural substance on Earth?',
        type: 'mcq',
        options: ['Gold', 'Iron', 'Diamond', 'Platinum'],
        correctAnswer: 2,
        difficulty: 'easy',
        category: 'Science',
        points: 10
      },
      {
        question: 'Who composed "The Four Seasons"?',
        type: 'mcq',
        options: ['Johann Sebastian Bach', 'Wolfgang Amadeus Mozart', 'Antonio Vivaldi', 'Ludwig van Beethoven'],
        correctAnswer: 2,
        difficulty: 'hard',
        category: 'Music',
        points: 20
      },
      {
        question: 'What is the currency of Japan?',
        type: 'mcq',
        options: ['Yuan', 'Won', 'Yen', 'Ringgit'],
        correctAnswer: 2,
        difficulty: 'easy',
        category: 'General Knowledge',
        points: 10
      },
      {
        question: 'Which planet is known as the Red Planet?',
        type: 'mcq',
        options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
        correctAnswer: 1,
        difficulty: 'easy',
        category: 'Science',
        points: 10
      },
      {
        question: 'What does "HTTP" stand for?',
        type: 'mcq',
        options: ['HyperText Transfer Protocol', 'High Tech Transfer Protocol', 'HyperText Transport Protocol', 'High Transfer Text Protocol'],
        correctAnswer: 0,
        difficulty: 'medium',
        category: 'Technology',
        points: 15
      },
      {
        question: 'Who wrote "Romeo and Juliet"?',
        type: 'mcq',
        options: ['Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Mark Twain'],
        correctAnswer: 1,
        difficulty: 'easy',
        category: 'Literature',
        points: 10
      },
      {
        question: 'What is the largest ocean on Earth?',
        type: 'mcq',
        options: ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean', 'Pacific Ocean'],
        correctAnswer: 3,
        difficulty: 'easy',
        category: 'Geography',
        points: 10
      },
      {
        question: 'In mathematics, what is the value of pi (π) to two decimal places?',
        type: 'mcq',
        options: ['3.14', '3.15', '3.16', '3.13'],
        correctAnswer: 0,
        difficulty: 'easy',
        category: 'Mathematics',
        points: 10
      },
      // MEDIA questions
      {
        question: 'Identify this landmark from the image',
        type: 'media',
        mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a8/Tour_Eiffel_Wikimedia_Commons.jpg',
        mediaType: 'image',
        correctAnswer: 'Eiffel Tower',
        difficulty: 'medium',
        category: 'Geography',
        points: 20,
      },
      {
        question: 'Name the composer from this audio clip',
        type: 'media',
        mediaUrl: 'https://samplelib.com/lib/preview/mp3/sample-3s.mp3',
        mediaType: 'audio',
        correctAnswer: 'Beethoven',
        difficulty: 'hard',
        category: 'Music',
        points: 25,
      },
      // RAPID FIRE
      {
        question: 'Fast: 12 x 11 = ?',
        type: 'rapid_fire',
        correctAnswer: 132,
        difficulty: 'easy',
        category: 'Mathematics',
        points: 10,
      },
      {
        question: 'Fast: Chemical symbol for Sodium?',
        type: 'rapid_fire',
        correctAnswer: 'Na',
        difficulty: 'easy',
        category: 'Science',
        points: 10,
      },
    ]);

    console.log(`Created ${questions.length} questions`);
    console.log('Sample data seeded successfully!');

  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seedData();
