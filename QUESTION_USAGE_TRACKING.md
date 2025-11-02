# Global Question Usage Tracking & Reset System

## Overview
Implemented a comprehensive question usage tracking system that ensures questions are not repeated across ALL competitions in the app, with an easy reset mechanism when all questions have been used.

---

## 🎯 Features Implemented

### 1. **Global Usage Tracking**
- Questions are marked as `isUsed: true` globally when fetched for any competition
- Questions prioritize unused ones first, then fall back to per-competition unused
- Prevents the same questions from appearing in multiple competitions

### 2. **Smart Question Selection**
Three-tier priority system:
1. **First Priority**: Globally unused questions (`isUsed: false`)
2. **Second Priority**: Not used in current competition (per-competition tracking)
3. **Fallback**: If neither available, returns what exists (with warning)

### 3. **Reset Functionality**
Two ways to reset questions:

#### A. From Competition Manage Page
- Shows "No Questions Available" message when all questions are used
- **"Reset Questions" button** appears with the message
- Resets questions for **current round type and phase only**
- Confirmation dialog with details

#### B. From Questions Management Page
- **"Reset Used Questions" button** in toolbar (always visible)
- Filter by Type and/or Phase before resetting
- Resets only the filtered questions
- Comprehensive confirmation dialog

### 4. **Per-Competition Tracking Maintained**
- Even after global reset, questions won't repeat within the same competition
- Uses `usedInCompetitions` array to track which competitions used each question
- Ensures variety within each competition

---

## 📁 Files Modified

### 1. **Question Model** (`src/models/Question.ts`)
- Already had `isUsed` field - now properly utilized
- Has `usedInCompetitions` array for per-competition tracking

### 2. **Competition Questions API** (`src/app/api/competitions/[id]/questions/route.ts`)
**Changes:**
- Modified query to prioritize globally unused questions
- Sets `isUsed: true` when questions are fetched
- Fallback logic if not enough unused questions available

**Priority Logic:**
```javascript
// 1. Try globally unused questions first
{ isUsed: false, usedInCompetitions: { $ne: competitionId } }

// 2. If not enough, get per-competition unused
{ usedInCompetitions: { $ne: competitionId } }
```

### 3. **Reset API** (`src/app/api/questions/reset/route.ts`) **[NEW FILE]**
**Endpoints:**

#### POST `/api/questions/reset`
Resets `isUsed` flag for questions.

**Request Body:**
```json
{
  "type": "buzzer",      // Optional: mcq, media, buzzer, etc.
  "phase": "league",     // Optional: league, semi_final, final, tie_breaker
  "global": false        // true = also clear per-competition tracking
}
```

**Response:**
```json
{
  "success": true,
  "message": "Questions reset successfully",
  "resetCount": 25,
  "scope": "standard"
}
```

#### GET `/api/questions/reset/stats`
Returns statistics about question usage.

**Query Params:**
- `type` (optional): Filter by question type
- `phase` (optional): Filter by phase

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "used": 100,
    "unused": 50,
    "breakdown": {
      "mcq": { "total": 50, "used": 40, "unused": 10 },
      "buzzer": { "total": 30, "used": 20, "unused": 10 },
      ...
    }
  }
}
```

### 4. **Manage Competition Page** (`src/app/competitions/[id]/manage/page.tsx`)
**Added:**
- `showResetDialog` state
- `resetting` state
- `handleResetQuestions()` function
- Reset button in "No Questions Available" message
- Reset confirmation dialog

**UI Flow:**
1. When no questions available → Shows card with reset button
2. Click "Reset Questions" → Opens dialog
3. Dialog shows what will be reset (type + phase)
4. Confirm → Resets questions and reloads

### 5. **Questions Management Page** (`src/app/questions/page.tsx`)
**Added:**
- `showResetDialog` state
- `resetting` state
- `handleResetUsage()` function
- "Reset Used Questions" button in toolbar
- Reset confirmation dialog with detailed info
- `RefreshCw` icon import

**UI Features:**
- Reset button always visible in toolbar
- Respects current type/phase filters
- Shows what will be reset in dialog
- Refreshes question list after reset

---

## 🔄 How It Works

### Question Fetching Flow

```
Competition requests questions
         ↓
API checks: Are there globally unused questions?
         ↓
    YES → Use them (set isUsed = true)
         ↓
    NO → Check: Are there questions not used in THIS competition?
         ↓
    YES → Use them (set isUsed = true)
         ↓
    NO → Return empty (show reset option)
```

### Reset Flow

```
User clicks "Reset Questions"
         ↓
Confirmation dialog opens
         ↓
User confirms
         ↓
API sets isUsed = false for matching questions
         ↓
Questions become available again
         ↓
Page refreshes/reloads questions
```

---

## 💡 Usage Examples

### Scenario 1: Competition Run Out of Buzzer Questions
**Problem:** All buzzer questions for league phase have been used.

**Solution:**
1. Competition shows "No Questions Available"
2. Operator clicks "Reset Questions"
3. Confirms in dialog
4. System resets buzzer questions for league phase
5. Questions reload automatically

### Scenario 2: Bulk Reset All MCQ Questions
**Problem:** Need to reuse all MCQ questions for new season.

**Solution:**
1. Go to **Questions** page
2. Filter: Type = "MCQ Only", Phase = "All Phases"
3. Click "Reset Used Questions" button
4. Confirms in dialog (shows "All MCQ questions will be reset")
5. System resets all MCQ questions globally

### Scenario 3: Reset Tie-breaker Questions Only
**Problem:** Tie-breaker questions all used, need to reset just those.

**Solution:**
1. Go to **Questions** page
2. Filter: Type = "Buzzer Only", Phase = "Tie-breaker Only"
3. Click "Reset Used Questions"
4. Confirms (shows "Buzzer / Tie-breaker")
5. Only tie-breaker buzzer questions reset

---

## 🛡️ Safety Features

### 1. **Per-Competition Protection**
- Even after global reset, questions won't repeat within same competition
- `usedInCompetitions` array is NOT cleared by standard reset
- Only `global: true` reset clears per-competition tracking (use with caution)

### 2. **Targeted Reset**
- Can reset by specific type (e.g., only MCQ)
- Can reset by specific phase (e.g., only league)
- Can reset combination (e.g., buzzer + tie_breaker)

### 3. **Confirmation Dialogs**
- All resets require confirmation
- Dialog shows exactly what will be reset
- Shows number of questions affected

### 4. **Visual Feedback**
- Loading states during reset ("Resetting...")
- Toast notifications on success/error
- Question list refreshes to show updated status

---

## 📊 Database Schema

### Question Document
```javascript
{
  _id: ObjectId("..."),
  question: "What is...",
  type: "buzzer",
  phase: "league",
  isUsed: true,                    // ← Global usage flag
  usedInCompetitions: [            // ← Per-competition tracking
    ObjectId("comp1"),
    ObjectId("comp2")
  ],
  options: [...],
  correctAnswer: "...",
  // ... other fields
}
```

### Competition Document
```javascript
{
  _id: ObjectId("..."),
  name: "Season 2025",
  usedQuestions: [                 // ← Questions used in this competition
    ObjectId("q1"),
    ObjectId("q2"),
    ...
  ],
  groups: [...],
  // ... other fields
}
```

---

## 🎯 Best Practices

### 1. **Regular Maintenance**
- Monitor question usage in Questions page
- Reset unused question pools between seasons
- Keep enough questions in database for all phases

### 2. **During Competition**
- If running out of questions, pause and reset immediately
- Don't let competition fail due to missing questions
- Consider adding more questions to database

### 3. **Question Management**
- Maintain at least **20-30 questions per type per phase**
- For tie-breakers, keep at least **20-30 buzzer questions**
- Import questions in bulk using Excel for efficiency

### 4. **Reset Strategy**
- **Standard Reset** (recommended): Resets `isUsed` only
- **Global Reset** (use sparingly): Also clears per-competition tracking
- Reset specific types/phases rather than everything

---

## 🔧 API Testing

### Test Reset Endpoint
```bash
# Reset all buzzer questions for league
curl -X POST http://localhost:3000/api/questions/reset \
  -H "Content-Type: application/json" \
  -d '{"type": "buzzer", "phase": "league"}'

# Reset all questions (dangerous!)
curl -X POST http://localhost:3000/api/questions/reset \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Check Usage Stats
```bash
# Get overall stats
curl http://localhost:3000/api/questions/reset/stats

# Get stats for specific type
curl http://localhost:3000/api/questions/reset/stats?type=buzzer&phase=league
```

---

## 🐛 Troubleshooting

### Issue: "No Questions Available" appears immediately
**Cause**: All questions in database have `isUsed: true`

**Solution**: 
1. Go to Questions page
2. Click "Reset Used Questions"
3. Select appropriate filters
4. Confirm reset

### Issue: Same questions appearing in competition
**Cause**: Per-competition tracking might be cleared

**Solution**:
1. Don't use `global: true` reset during active competitions
2. Use standard reset which preserves per-competition tracking

### Issue: Reset not working
**Cause**: Filter settings might be too restrictive

**Solution**:
1. Check type and phase filters
2. Try resetting without filters (reset all)
3. Check console for error messages

---

## 📝 Summary

✅ **Implemented**: Global `isUsed` tracking for all questions
✅ **Implemented**: Smart priority system (unused → per-competition → fallback)
✅ **Implemented**: Reset API with filtering options
✅ **Implemented**: Reset button in competition manage page
✅ **Implemented**: Reset button in questions management page
✅ **Implemented**: Confirmation dialogs with detailed info
✅ **Implemented**: Per-competition tracking remains intact
✅ **Implemented**: Usage statistics endpoint

**Result**: Questions are now tracked globally, won't repeat across competitions, and can be easily reset when needed!
