const fs = require('fs');
const path = require('path');

// Files and directories to search and replace
const searchPaths = [
  'src',
  'scripts',
  'README.md',
  'QUIZ_FEATURES.md',
  'package.json'
];

// Replacements to make
const replacements = [
  // Case variations
  { from: /\bcollege\b/g, to: 'school' },
  { from: /\bCollege\b/g, to: 'School' },
  { from: /\bCOLLEGE\b/g, to: 'SCHOOL' },
  { from: /\bschools\b/g, to: 'schools' },
  { from: /\bColleges\b/g, to: 'Schools' },
  { from: /\bCOLLEGES\b/g, to: 'SCHOOLS' },
  
  // File/folder names and paths
  { from: /schools/g, to: 'schools' },
  { from: /\/schools\//g, to: '/schools/' },
  { from: /'schools'/g, to: "'schools'" },
  { from: /"schools"/g, to: '"schools"' },
  
  // Database/API related
  { from: /schoolId/g, to: 'schoolId' },
  { from: /SchoolId/g, to: 'SchoolId' },
  { from: /school_id/g, to: 'school_id' },
  { from: /SCHOOL_ID/g, to: 'SCHOOL_ID' }
];

function shouldSkipFile(filePath) {
  const skipPatterns = [
    /node_modules/,
    /\.git/,
    /\.next/,
    /dist/,
    /build/,
    /\.log$/,
    /\.lock$/,
    /\.(jpg|jpeg|png|gif|ico|svg|mp3|mp4|avi)$/i
  ];
  
  return skipPatterns.some(pattern => pattern.test(filePath));
}

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    replacements.forEach(({ from, to }) => {
      if (from.test(content)) {
        content = content.replace(from, to);
        modified = true;
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Updated: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function processDirectory(dirPath) {
  let totalFiles = 0;
  let modifiedFiles = 0;
  
  function walkDirectory(currentPath) {
    const items = fs.readdirSync(currentPath);
    
    items.forEach(item => {
      const itemPath = path.join(currentPath, item);
      const stat = fs.statSync(itemPath);
      
      if (shouldSkipFile(itemPath)) {
        return;
      }
      
      if (stat.isDirectory()) {
        walkDirectory(itemPath);
      } else if (stat.isFile()) {
        totalFiles++;
        if (processFile(itemPath)) {
          modifiedFiles++;
        }
      }
    });
  }
  
  if (fs.existsSync(dirPath)) {
    if (fs.statSync(dirPath).isDirectory()) {
      walkDirectory(dirPath);
    } else {
      totalFiles++;
      if (processFile(dirPath)) {
        modifiedFiles++;
      }
    }
  }
  
  return { totalFiles, modifiedFiles };
}

function renameDirectories() {
  const dirsToRename = [
    'src/app/schools',
    'src/components/schools'
  ];
  
  dirsToRename.forEach(dirPath => {
    if (fs.existsSync(dirPath)) {
      const newPath = dirPath.replace(/schools/g, 'schools');
      try {
        fs.renameSync(dirPath, newPath);
        console.log(`✓ Renamed directory: ${dirPath} → ${newPath}`);
      } catch (error) {
        console.error(`✗ Error renaming ${dirPath}:`, error.message);
      }
    }
  });
}

async function main() {
  console.log('🔄 Starting school → school replacement...\n');
  
  let totalFiles = 0;
  let totalModified = 0;
  
  // Process each search path
  searchPaths.forEach(searchPath => {
    console.log(`📁 Processing: ${searchPath}`);
    const { totalFiles: files, modifiedFiles } = processDirectory(searchPath);
    totalFiles += files;
    totalModified += modifiedFiles;
    console.log(`   Files processed: ${files}, Modified: ${modifiedFiles}\n`);
  });
  
  // Rename directories
  console.log('📁 Renaming directories...');
  renameDirectories();
  
  console.log('\n✅ Replacement complete!');
  console.log(`📊 Summary: ${totalModified}/${totalFiles} files modified`);
  console.log('\n⚠️  Important: Please review the changes and update any remaining references manually.');
  console.log('   - Check import statements');
  console.log('   - Update API routes');
  console.log('   - Verify database model names');
  console.log('   - Test the application thoroughly');
}

main().catch(console.error);
