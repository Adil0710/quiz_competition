const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://padil2246:Adil%400710@cluster0.qd8vyp4.mongodb.net/quiz_competition?retryWrites=true&w=majority&appName=Cluster0";

const questions = [
  // Phase 1 (League) - MCQ Questions (36 total)
  ...Array.from({ length: 36 }, (_, i) => ({
    question: `لیگ MCQ سوال ${i + 1}: فرانس کا دارالحکومت کیا ہے؟`,
    type: 'mcq',
    options: ['لندن', 'برلن', 'پیرس', 'میڈرڈ'],
    correctAnswer: 2,
    difficulty: 'medium',
    category: 'جغرافیہ',
    points: 10,
    phase: 'league',
    isUsed: false,
    usedInCompetitions: [],
    createdAt: new Date(),
    updatedAt: new Date()
  })),

  // Phase 1 (League) - Media Questions (36 total)
  ...Array.from({ length: 36 }, (_, i) => ({
    question: `لیگ میڈیا سوال ${i + 1}: اس مقام کی شناخت کریں`,
    type: 'media',
    mediaUrl: `https://picsum.photos/400/300?random=${i + 1}`,
    mediaType: 'image',
    correctAnswer: `میڈیا سوال ${i + 1} کا جواب`,
    difficulty: 'medium',
    category: 'بصری',
    points: 15,
    phase: 'league',
    isUsed: false,
    usedInCompetitions: [],
    createdAt: new Date(),
    updatedAt: new Date()
  })),

  // Phase 1 (League) - Buzzer Questions (30 total)
  ...Array.from({ length: 30 }, (_, i) => ({
    question: `لیگ بزر سوال ${i + 1}: رومیو اور جولیٹ کس نے لکھا؟`,
    type: 'buzzer',
    options: ['چارلس ڈکنز', 'ولیم شیکسپیئر', 'جین آسٹن', 'مارک ٹوین'],
    correctAnswer: 1,
    difficulty: 'medium',
    category: 'ادب',
    points: 20,
    phase: 'league',
    isUsed: false,
    usedInCompetitions: [],
    createdAt: new Date(),
    updatedAt: new Date()
  })),

  // Phase 2 (Semi-Final) - MCQ Questions (18 total)
  ...Array.from({ length: 18 }, (_, i) => ({
    question: `سیمی فائنل MCQ سوال ${i + 1}: ہمارے نظام شمسی کا سب سے بڑا سیارہ کون سا ہے؟`,
    type: 'mcq',
    options: ['زمین', 'مشتری', 'زحل', 'نیپچون'],
    correctAnswer: 1,
    difficulty: 'medium',
    category: 'سائنس',
    points: 15,
    phase: 'semi_final',
    isUsed: false,
    usedInCompetitions: [],
    createdAt: new Date(),
    updatedAt: new Date()
  })),

  // Phase 2 (Semi-Final) - Media Questions (18 total)
  ...Array.from({ length: 18 }, (_, i) => ({
    question: `سیمی فائنل میڈیا سوال ${i + 1}: اس مشہور پینٹنگ کی شناخت کریں`,
    type: 'media',
    mediaUrl: `https://picsum.photos/400/300?random=${i + 37}`,
    mediaType: 'image',
    correctAnswer: `سیمی فائنل میڈیا سوال ${i + 1} کا جواب`,
    difficulty: 'hard',
    category: 'فن',
    points: 20,
    phase: 'semi_final',
    isUsed: false,
    usedInCompetitions: [],
    createdAt: new Date(),
    updatedAt: new Date()
  })),

  // Phase 2 (Semi-Final) - Buzzer Questions (15 total)
  ...Array.from({ length: 15 }, (_, i) => ({
    question: `سیمی فائنل بزر سوال ${i + 1}: سونے کا کیمیائی نشان کیا ہے؟`,
    type: 'buzzer',
    options: ['Au', 'Ag', 'Fe', 'Cu'],
    correctAnswer: 0,
    difficulty: 'hard',
    category: 'کیمسٹری',
    points: 25,
    phase: 'semi_final',
    isUsed: false,
    usedInCompetitions: [],
    createdAt: new Date(),
    updatedAt: new Date()
  })),

  // Phase 2 (Semi-Final) - Rapid Fire Questions (180 total)
  ...Array.from({ length: 180 }, (_, i) => ({
    question: `ریپڈ فائر سوال ${i + 1}: فوری جواب درکار!`,
    type: 'rapid_fire',
    correctAnswer: `فوری جواب ${i + 1}`,
    difficulty: 'medium',
    category: 'عمومی',
    points: 5,
    phase: 'semi_final',
    isUsed: false,
    usedInCompetitions: [],
    createdAt: new Date(),
    updatedAt: new Date()
  })),

  // Phase 3 (Final) - Sequence Questions (6 total)
  ...Array.from({ length: 6 }, (_, i) => ({
    question: `فائنل سیکوینس سوال ${i + 1}: ان واقعات کو تاریخی ترتیب میں رکھیں`,
    type: 'sequence',
    options: ['واقعہ الف', 'واقعہ ب', 'واقعہ ج', 'واقعہ د'],
    correctAnswer: [0, 1, 2, 3], // Correct sequence
    difficulty: 'hard',
    category: 'تاریخ',
    points: 30,
    phase: 'final',
    isUsed: false,
    usedInCompetitions: [],
    createdAt: new Date(),
    updatedAt: new Date()
  })),

  // Phase 3 (Final) - Media Questions (6 total)
  ...Array.from({ length: 6 }, (_, i) => ({
    question: `فائنل میڈیا سوال ${i + 1}: اس نادر نمونے کی شناخت کریں`,
    type: 'media',
    mediaUrl: `https://picsum.photos/400/300?random=${i + 55}`,
    mediaType: 'image',
    correctAnswer: `فائنل میڈیا سوال ${i + 1} کا جواب`,
    difficulty: 'hard',
    category: 'تاریخ',
    points: 25,
    phase: 'final',
    isUsed: false,
    usedInCompetitions: [],
    createdAt: new Date(),
    updatedAt: new Date()
  })),

  // Phase 3 (Final) - Buzzer Questions (5 total)
  ...Array.from({ length: 5 }, (_, i) => ({
    question: `فائنل بزر سوال ${i + 1}: اعلیٰ درجے کی معلومات درکار`,
    type: 'buzzer',
    options: ['آپشن الف', 'آپشن ب', 'آپشن ج', 'آپشن د'],
    correctAnswer: 0,
    difficulty: 'hard',
    category: 'اعلیٰ درجہ',
    points: 35,
    phase: 'final',
    isUsed: false,
    usedInCompetitions: [],
    createdAt: new Date(),
    updatedAt: new Date()
  })),

  // Phase 3 (Final) - Visual Rapid Fire Questions (75 total)
  ...Array.from({ length: 75 }, (_, i) => ({
    question: `ویژول ریپڈ فائر سوال ${i + 1}: فوری بصری شناخت`,
    type: 'visual_rapid_fire',
    mediaUrl: `https://picsum.photos/300/200?random=${i + 61}`,
    mediaType: 'image',
    correctAnswer: `بصری جواب ${i + 1}`,
    difficulty: 'medium',
    category: 'بصری',
    points: 10,
    phase: 'final',
    isUsed: false,
    usedInCompetitions: [],
    createdAt: new Date(),
    updatedAt: new Date()
  }))
];

async function seedQuestions() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Clear existing questions
    await mongoose.connection.db.collection('questions').deleteMany({});
    console.log('Cleared existing questions');
    
    // Insert new questions
    const result = await mongoose.connection.db.collection('questions').insertMany(questions);
    console.log(`Inserted ${result.insertedCount} questions`);
    
    // Print summary
    const summary = await mongoose.connection.db.collection('questions').aggregate([
      {
        $group: {
          _id: { phase: '$phase', type: '$type' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.phase': 1, '_id.type': 1 }
      }
    ]).toArray();
    
    console.log('\nQuestion Summary:');
    summary.forEach(item => {
      console.log(`${item._id.phase} - ${item._id.type}: ${item.count} questions`);
    });
    
  } catch (error) {
    console.error('Error seeding questions:', error);
  } finally {
    await mongoose.disconnect();
  }
}

seedQuestions();
