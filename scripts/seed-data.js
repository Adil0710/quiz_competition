const mongoose = require('mongoose');

// Import models
const College = require('../src/models/College');
const Question = require('../src/models/Question');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz_competition';

async function seedData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await College.deleteMany({});
    await Question.deleteMany({});
    console.log('Cleared existing data');

    // Create sample colleges
    const colleges = await College.insertMany([
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
      }
    ]);

    console.log(`Created ${colleges.length} colleges`);

    // Create sample questions
    const questions = await Question.insertMany([
      {
        question: 'What is the capital of France?',
        options: ['London', 'Berlin', 'Paris', 'Madrid'],
        correctAnswer: 2,
        difficulty: 'easy',
        category: 'Geography',
        points: 10
      },
      {
        question: 'Who wrote the novel "1984"?',
        options: ['George Orwell', 'Aldous Huxley', 'Ray Bradbury', 'Ernest Hemingway'],
        correctAnswer: 0,
        difficulty: 'medium',
        category: 'Literature',
        points: 15
      },
      {
        question: 'What is the chemical symbol for gold?',
        options: ['Go', 'Gd', 'Au', 'Ag'],
        correctAnswer: 2,
        difficulty: 'medium',
        category: 'Science',
        points: 15
      },
      {
        question: 'In which year did World War II end?',
        options: ['1944', '1945', '1946', '1947'],
        correctAnswer: 1,
        difficulty: 'easy',
        category: 'History',
        points: 10
      },
      {
        question: 'What is the largest planet in our solar system?',
        options: ['Saturn', 'Jupiter', 'Neptune', 'Uranus'],
        correctAnswer: 1,
        difficulty: 'easy',
        category: 'Science',
        points: 10
      },
      {
        question: 'Who painted the Mona Lisa?',
        options: ['Vincent van Gogh', 'Pablo Picasso', 'Leonardo da Vinci', 'Michelangelo'],
        correctAnswer: 2,
        difficulty: 'easy',
        category: 'Art',
        points: 10
      },
      {
        question: 'What is the square root of 144?',
        options: ['10', '11', '12', '13'],
        correctAnswer: 2,
        difficulty: 'easy',
        category: 'Mathematics',
        points: 10
      },
      {
        question: 'Which programming language was developed by James Gosling?',
        options: ['Python', 'Java', 'C++', 'JavaScript'],
        correctAnswer: 1,
        difficulty: 'medium',
        category: 'Technology',
        points: 15
      },
      {
        question: 'What is the longest river in the world?',
        options: ['Amazon River', 'Nile River', 'Mississippi River', 'Yangtze River'],
        correctAnswer: 1,
        difficulty: 'medium',
        category: 'Geography',
        points: 15
      },
      {
        question: 'Who developed the theory of relativity?',
        options: ['Isaac Newton', 'Albert Einstein', 'Galileo Galilei', 'Stephen Hawking'],
        correctAnswer: 1,
        difficulty: 'medium',
        category: 'Science',
        points: 15
      },
      {
        question: 'What is the smallest country in the world?',
        options: ['Monaco', 'Vatican City', 'San Marino', 'Liechtenstein'],
        correctAnswer: 1,
        difficulty: 'hard',
        category: 'Geography',
        points: 20
      },
      {
        question: 'In which year was the first iPhone released?',
        options: ['2006', '2007', '2008', '2009'],
        correctAnswer: 1,
        difficulty: 'medium',
        category: 'Technology',
        points: 15
      },
      {
        question: 'What is the hardest natural substance on Earth?',
        options: ['Gold', 'Iron', 'Diamond', 'Platinum'],
        correctAnswer: 2,
        difficulty: 'easy',
        category: 'Science',
        points: 10
      },
      {
        question: 'Who composed "The Four Seasons"?',
        options: ['Johann Sebastian Bach', 'Wolfgang Amadeus Mozart', 'Antonio Vivaldi', 'Ludwig van Beethoven'],
        correctAnswer: 2,
        difficulty: 'hard',
        category: 'Music',
        points: 20
      },
      {
        question: 'What is the currency of Japan?',
        options: ['Yuan', 'Won', 'Yen', 'Ringgit'],
        correctAnswer: 2,
        difficulty: 'easy',
        category: 'General Knowledge',
        points: 10
      },
      {
        question: 'Which planet is known as the Red Planet?',
        options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
        correctAnswer: 1,
        difficulty: 'easy',
        category: 'Science',
        points: 10
      },
      {
        question: 'What does "HTTP" stand for?',
        options: ['HyperText Transfer Protocol', 'High Tech Transfer Protocol', 'HyperText Transport Protocol', 'High Transfer Text Protocol'],
        correctAnswer: 0,
        difficulty: 'medium',
        category: 'Technology',
        points: 15
      },
      {
        question: 'Who wrote "Romeo and Juliet"?',
        options: ['Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Mark Twain'],
        correctAnswer: 1,
        difficulty: 'easy',
        category: 'Literature',
        points: 10
      },
      {
        question: 'What is the largest ocean on Earth?',
        options: ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean', 'Pacific Ocean'],
        correctAnswer: 3,
        difficulty: 'easy',
        category: 'Geography',
        points: 10
      },
      {
        question: 'In mathematics, what is the value of pi (π) to two decimal places?',
        options: ['3.14', '3.15', '3.16', '3.13'],
        correctAnswer: 0,
        difficulty: 'easy',
        category: 'Mathematics',
        points: 10
      }
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
