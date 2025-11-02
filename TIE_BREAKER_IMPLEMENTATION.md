# Tie-breaker Implementation Guide

## Overview
The tie-breaker functionality has been enhanced to ensure it **only loads buzzer questions** during tie-breaker rounds, regardless of which phase the competition is in.

## What Was Fixed

### Problem
Previously, when a tie-breaker was triggered during phase transitions (e.g., League → Semi-Final), it would load questions for the **new phase** instead of dedicated tie-breaker questions. This caused it to load MCQ, Media, or other question types instead of only buzzer questions.

### Solution
Added a new **`tie_breaker`** phase to the system that is specifically used for tie-breaker rounds. This phase loads buzzer questions from any phase in the database, ensuring you always get buzzer questions during tie-breakers.

---

## Technical Changes Made

### 1. **Question Model** (`src/models/Question.ts`)
- Added `'tie_breaker'` to the phase enum
- Questions can now be marked with phase: `'league' | 'semi_final' | 'final' | 'tie_breaker'`

### 2. **Competition Questions API** (`src/app/api/competitions/[id]/questions/route.ts`)
- Special handling for `tie_breaker` phase
- When phase is `'tie_breaker'`, it loads buzzer questions from **any phase** (not filtered by phase)
- This ensures maximum availability of buzzer questions for tie-breakers

### 3. **Manage Competition Page** (`src/app/competitions/[id]/manage/page.tsx`)
- Updated `startTieBreakerIfNeeded()` to use `loadQuestions("buzzer", "tie_breaker")`
- Updated tie-breaker progression to use `"tie_breaker"` phase
- Added `'tie_breaker'` to Question interface type

### 4. **Questions Management Page** (`src/app/questions/page.tsx`)
- Added "Tie-breaker" option to phase dropdown in question creation form
- Added "Tie-breaker Only" filter option
- Updated phase display badge to show "Tie-breaker" for questions with that phase
- Updated Question interface type

### 5. **Questions Import API** (`src/app/api/questions/import/route.ts`)
- Added `'tie_breaker'` to PHASES set
- Updated normalizePhase function to handle tie_breaker phase

### 6. **Questions API** (`src/app/api/questions/route.ts`)
- Updated phase normalization to include `'tie_breaker'`

---

## How Tie-breaker Works Now

### When Tie-breaker is Triggered
1. **League → Semi-Final transition**: If teams have tied scores
2. **Semi-Final → Final transition**: If teams have tied scores  
3. **Final phase completion**: If champion teams are tied

### What Happens
1. System detects tie groups (teams with same scores)
2. Enters tie-breaker mode
3. Loads **5 buzzer questions** using phase `'tie_breaker'`
4. Questions are pulled from the database (any phase) that haven't been used in this competition
5. After 5 questions, winners/losers are determined by final scores
6. If multiple tie groups exist, repeats for each group

### Scoring During Tie-breaker
- Only the tied teams participate
- Team buttons are enabled only for tied teams
- Points are added to the teams' existing scores
- After 5 questions, highest scorer(s) proceed

---

## What You Need to Do

### 1. **Create/Import Tie-breaker Questions**

You need to add buzzer questions specifically for tie-breakers. You have two options:

#### Option A: Create Manually via Questions Page
1. Go to **Questions** page
2. Click **"+ Add New Question"**
3. Fill in the form:
   - **Type**: Buzzer
   - **Phase**: **Tie-breaker** ← Select this
   - Add your question, options (A, B, C, D), and correct answer
4. Save the question

#### Option B: Import via Excel
1. Prepare an Excel file with tie-breaker buzzer questions
2. In the **Phase** column, use: `tie_breaker`
3. Go to Questions page → Import tab
4. Select **Buzzer** type
5. Upload your Excel file

**Excel Format Example:**
```
Question | Option A | Option B | Option C | Option D | Correct | Category | Difficulty | Points | Phase
---------|----------|----------|----------|----------|---------|----------|------------|--------|------------
What...  | Answer 1 | Answer 2 | Answer 3 | Answer 4 | B       | General  | medium     | 10     | tie_breaker
```

### 2. **How Many Questions to Add**
- Tie-breaker uses **5 questions per tie group**
- Recommended: Add at least **20-30 tie-breaker buzzer questions** to avoid running out
- The system will randomly select 5 unused questions for each tie group

### 3. **Existing Questions**
You can also mark **existing buzzer questions** as `tie_breaker` phase if you want them to be available during tie-breakers.

---

## Testing the Tie-breaker

### Test Scenario 1: League → Semi-Final Tie
1. Complete all league rounds
2. Manually adjust scores so 2+ teams have the same score
3. Trigger phase transition to Semi-Final
4. Tie-breaker should start automatically
5. Verify only **buzzer questions** appear (not MCQ/Media)

### Test Scenario 2: Multiple Tie Groups
1. Set up scores so you have two groups of tied teams:
   - Team A: 50 points, Team B: 50 points
   - Team C: 40 points, Team D: 40 points
2. Trigger phase transition
3. Tie-breaker should handle first group (A & B) with 5 questions
4. Then handle second group (C & D) with another 5 questions

---

## Database Considerations

### Migration Note
Since we added a new phase value (`'tie_breaker'`), the database schema is automatically updated by Mongoose. No manual migration is needed.

### Question Pool
- The system loads tie-breaker questions from **any phase** that are marked as unused for this competition
- This means tie-breaker questions are shared across all competitions but won't repeat within the same competition

---

## Troubleshooting

### "Not enough questions" during tie-breaker
**Cause**: Not enough buzzer questions with `tie_breaker` phase in database

**Solution**: 
1. Go to Questions page
2. Create more buzzer questions with phase = "Tie-breaker"
3. Or edit existing buzzer questions to change phase to "Tie-breaker"

### Tie-breaker loads MCQ questions
**Cause**: This should not happen anymore with the fix

**If it happens**:
1. Check if questions with phase `'tie_breaker'` exist in database
2. Verify the API route changes were deployed
3. Clear browser cache and reload

### Tie-breaker doesn't start automatically
**Cause**: No teams have tied scores

**Solution**: This is expected behavior. Tie-breaker only starts when 2+ teams have identical scores during phase transition.

---

## Summary

✅ **Fixed**: Tie-breaker now exclusively loads buzzer questions
✅ **Added**: New `tie_breaker` phase for questions
✅ **Updated**: All APIs and UI to support tie-breaker phase
⚠️ **Required**: You must add buzzer questions with `tie_breaker` phase to the database

**Next Step**: Add 20-30 tie-breaker buzzer questions using the Questions page!
