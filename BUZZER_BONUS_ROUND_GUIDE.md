# Buzzer Round Bonus System - Complete Guide

## ✅ What Was Implemented

### **New Feature: Bonus Round for Buzzer Questions**

When a team answers incorrectly in the buzzer round, the question automatically becomes available as a **BONUS ROUND** for the remaining teams.

---

## 🎯 How It Works

### **First Attempt (Main Round)**:
```
1. Operator selects a team
2. Team answers the question
   → If CORRECT: +10 points, question done ✓
   → If WRONG: -10 points, BONUS ROUND enabled 🎁
```

### **Bonus Round (Second Chance)**:
```
1. Toast notification appears: "Bonus Round Available!"
2. Operator presses Q to hide question (optional)
3. Operator presses Q again to show question
4. Select one of the REMAINING teams (failed team excluded)
5. Team answers:
   → If CORRECT: +10 points, question done ✓
   → If WRONG: 0 points (NO negative marking) ✗
```

---

## 📋 Step-by-Step Workflow

### **Scenario 1: First Team Gets It Right**

```
Step 1: Show question
  → Press Q
  → Question appears

Step 2: Show options
  → Press O
  → 3 team cards appear (Team A, B, C)

Step 3: Select Team A
  → Click Team A card
  → Team A highlighted in blue

Step 4: Answer options appear
  → Click correct answer
  → ✅ Confetti fires
  → ✅ +10 points to Team A
  → Question complete

Step 5: Next question
  → Press N
  → Move to next question
```

---

### **Scenario 2: First Team Gets It Wrong - Bonus Round Activated**

```
Step 1: Show question
  → Press Q
  → Question appears

Step 2: Show options
  → Press O
  → 3 team cards appear (Team A, B, C)

Step 3: Select Team A
  → Click Team A card
  → Team A highlighted

Step 4: Team A answers WRONG
  → Click wrong answer
  → ❌ Wrong sound plays
  → ❌ -10 points from Team A
  → 🎁 Toast: "Bonus Round Available!"
  → 🎁 Header shows: "🎁 BONUS ROUND" badge

Step 5: Toggle question (optional, for suspense)
  → Press Q to hide
  → Press Q to show again

Step 6: Bonus round - Select different team
  → Press O (if needed)
  → Only 2 team cards appear now (Team B, C)
  → Team A is EXCLUDED (grayed out/hidden)
  → Big yellow banner: "🎁 BONUS ROUND 🎁"
  → "Select from remaining teams - No negative marking!"

Step 7: Select Team B
  → Click Team B card
  → Team B highlighted

Step 8a: Team B answers CORRECT
  → Click correct answer
  → ✅ Confetti fires
  → ✅ +10 points to Team B
  → Question complete
  → Bonus round deactivated

Step 8b: Team B answers WRONG
  → Click wrong answer
  → ❌ Wrong sound plays
  → ⚠️ NO points deducted (bonus round protection)
  → Toast: "No points deducted in bonus round"
  → Question can continue to Team C if desired

Step 9: Next question
  → Press N
  → Bonus round resets
  → All teams available again
```

---

## 🎨 Visual Indicators

### **1. Header Badge**

When bonus round is active:
```
┌─────────────────────────────────────┐
│ League | 🎁 BONUS ROUND             │
│ (Yellow pulsing badge)              │
└─────────────────────────────────────┘
```

### **2. Presentation Banner**

Large banner above team selection:
```
┌─────────────────────────────────────────────┐
│  🎁 BONUS ROUND 🎁                          │
│  Select from remaining teams                │
│  No negative marking!                       │
│  (Yellow-orange gradient, centered)         │
└─────────────────────────────────────────────┘
```

### **3. Team Cards**

**Normal Mode (All 3 teams)**:
```
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Team A   │  │ Team B   │  │ Team C   │
│ Score: 30│  │ Score: 25│  │ Score: 20│
└──────────┘  └──────────┘  └──────────┘
    All teams selectable
```

**Bonus Mode (Team A excluded)**:
```
                 ┌──────────┐  ┌──────────┐
   (hidden)      │ Team B   │  │ Team C   │
                 │ Score: 25│  │ Score: 20│
                 └──────────┘  └──────────┘
    Only remaining teams shown
```

### **4. Toast Notifications**

**When Bonus Round Activates**:
```
╔══════════════════════════════════════╗
║ ℹ Bonus Round Available!            ║
║                                      ║
║ Question can be answered by other    ║
║ teams. Press Q to hide/show question,║
║ select another team.                 ║
╚══════════════════════════════════════╝
```

**When Wrong Answer in Bonus Round**:
```
╔══════════════════════════════════════╗
║ ℹ Incorrect                          ║
║                                      ║
║ No points deducted in bonus round.   ║
╚══════════════════════════════════════╝
```

---

## 🔧 Technical Implementation

### **State Variables Added**:

```typescript
const [isBonusRound, setIsBonusRound] = useState(false);
const [bonusRoundExcludedTeam, setBonusRoundExcludedTeam] = useState<string | null>(null);
```

### **Modified handleBuzzerAnswer() Logic**:

```typescript
const handleBuzzerAnswer = async (option: string, index: number) => {
  // ... answer checking logic
  
  if (selectedTeam && isCorrect) {
    // CORRECT ANSWER - Award points and reset bonus round
    await handleAwardPoints(selectedTeam, buzzerPoints);
    setIsBonusRound(false);
    setBonusRoundExcludedTeam(null);
    
  } else if (selectedTeam && !isCorrect) {
    // WRONG ANSWER
    
    if (!isBonusRound) {
      // FIRST ATTEMPT - Deduct points and enable bonus
      await handleAwardPoints(selectedTeam, -buzzerPoints);
      setIsBonusRound(true);
      setBonusRoundExcludedTeam(selectedTeam);
      
      toast({
        title: "Bonus Round Available!",
        description: "Question can be answered by other teams...",
      });
      
    } else {
      // BONUS ROUND - NO negative marking
      toast({
        title: "Incorrect",
        description: "No points deducted in bonus round.",
      });
    }
  }
};
```

### **Team Filtering in Presentation**:

```typescript
{(tieBreakerMode
  ? currentGroup?.teams?.filter((team) => activeTieTeamIds.includes(team._id))
  : currentGroup?.teams
)
?.filter((team) => {
  // In bonus round, exclude the team that failed first attempt
  if (isBonusRound && bonusRoundExcludedTeam) {
    return team._id !== bonusRoundExcludedTeam;
  }
  return true;
})
?.map((team) => (
  // ... team card rendering
))}
```

### **Auto-Reset on Next/Previous Question**:

```typescript
const handleNextQuestion = () => {
  stopAllAudio();
  setSelectedTeam(null);
  
  // Reset bonus round state
  setIsBonusRound(false);
  setBonusRoundExcludedTeam(null);
  
  // ... rest of logic
};

const handlePrevQuestion = () => {
  // Same reset logic
  setIsBonusRound(false);
  setBonusRoundExcludedTeam(null);
  // ...
};
```

---

## 📊 Point System

### **First Attempt**:
| Result | Points | Bonus Round |
|--------|--------|-------------|
| ✅ Correct | +10 | ❌ No (Question done) |
| ❌ Wrong | -10 | ✅ Yes (Activated) |

### **Bonus Round**:
| Result | Points | Note |
|--------|--------|------|
| ✅ Correct | +10 | Question complete |
| ❌ Wrong | **0** | **No negative marking** |

---

## 🎮 Complete Examples

### **Example 1: Simple Bonus Round Success**

```
Q1: "What is the capital of France?"
Options: A) London, B) Paris, C) Berlin, D) Rome

1. Press Q → Show question
2. Press O → Show team cards (A, B, C)
3. Click Team A
4. Click Option A (London) - WRONG
   → -10 from Team A (30 → 20)
   → Bonus round activated
   → Toast notification
   → Header shows "🎁 BONUS ROUND"

5. Press Q to hide (optional)
6. Press Q to show
7. Press O → Show team cards (only B, C)
   → Big yellow banner appears
   → Team A not shown

8. Click Team B
9. Click Option B (Paris) - CORRECT
   → +10 to Team B (25 → 35)
   → Confetti fires
   → Question complete
   → Bonus round deactivated

10. Press N → Next question
```

---

### **Example 2: Multiple Bonus Attempts**

```
Q1: "Which planet is closest to the sun?"
Options: A) Venus, B) Mercury, C) Earth, D) Mars

First Attempt:
1-4. Team A selects C (Earth) - WRONG
   → -10 from Team A
   → Bonus round ON

Bonus Attempt 1:
5-8. Team B selects A (Venus) - WRONG
   → 0 points (no penalty in bonus)
   → Bonus still active
   → Team A and B now excluded? NO*

*Note: Currently only the FIRST failed team is excluded. 
If you want to exclude multiple teams, the logic would need enhancement.

Bonus Attempt 2 (if continuing):
9. Can select Team C
10. Team C selects B (Mercury) - CORRECT
   → +10 to Team C
   → Question complete
```

---

## 🔒 Robust Features

### **1. Automatic Reset**:
- ✅ Resets when moving to next question (N key)
- ✅ Resets when moving to previous question (P key)
- ✅ Resets when correct answer given
- ✅ Resets between rounds

### **2. Visual Clarity**:
- ✅ Clear header badge showing bonus mode
- ✅ Large presentation banner
- ✅ Excluded team not shown in selection
- ✅ Toast notifications for all actions

### **3. Point Protection**:
- ✅ No negative marking in bonus round
- ✅ First attempt always has standard rules
- ✅ Points only awarded for correct answers

### **4. Team Management**:
- ✅ Failed team automatically excluded
- ✅ Remaining teams clearly visible
- ✅ Works with tie-breaker mode
- ✅ Proper filtering logic

---

## 🐛 Edge Cases Handled

### **Case 1: No remaining teams**
If only 1 team in group:
- Bonus round won't make sense
- System still works, just no other teams to select

### **Case 2: Correct on first try**
- No bonus round activated
- Move to next question normally

### **Case 3: Question navigation during bonus**
- Bonus state resets
- Next question starts fresh

### **Case 4: Tie-breaker mode**
- Bonus round works with filtered teams
- Exclusion applies to tie-breaker teams only

---

## 🎯 Operator Tips

### **Best Practices**:

1. **Build Suspense**:
   - When first team fails, press Q to hide question
   - Pause for effect
   - Press Q again to reveal for bonus round
   - Creates excitement!

2. **Clear Communication**:
   - Announce "Bonus Round!" to audience
   - Show excluded team score changed (-10)
   - Highlight only remaining teams can answer

3. **Fair Play**:
   - Give equal time to bonus teams
   - Don't rush the selection
   - Ensure all understand "no negative marking"

4. **Speed Tips**:
   - If keeping question visible, just select next team
   - No need to hide/show if flow is smooth
   - Use Q toggle for dramatic moments only

---

## 📈 Benefits

### **For Competition**:
1. **More Engaging**: Multiple teams get chances
2. **Fair**: Incorrect teams lose points once, not repeatedly
3. **Strategic**: Teams might take risks knowing bonus exists
4. **Exciting**: Audience gets more action per question

### **For Operators**:
1. **Flexible**: Can offer question to all teams
2. **Clear**: Visual indicators prevent confusion
3. **Automated**: Points handled automatically
4. **Robust**: Resets properly, no manual tracking

### **For Teams**:
1. **Second Chances**: Other teams can capitalize on mistakes
2. **No Penalty in Bonus**: Encourages participation
3. **Fair System**: Clear rules, consistent application

---

## 🔄 Workflow Comparison

### **OLD System (No Bonus)**:
```
Team A answers wrong → -10 points → Next question
(Question wasted, other teams don't get a chance)
```

### **NEW System (With Bonus)**:
```
Team A answers wrong → -10 points → Bonus round
  ↓
Team B or C gets chance → If correct: +10
  ↓
Question fully utilized!
```

---

## 📝 Summary

### **What Changed**:

#### **State Management**:
- ✅ Added `isBonusRound` state
- ✅ Added `bonusRoundExcludedTeam` state
- ✅ Auto-reset on question navigation

#### **Buzzer Answer Logic**:
- ✅ Detects first vs bonus attempt
- ✅ Applies negative marking only on first
- ✅ Shows appropriate toasts
- ✅ Manages bonus round activation/deactivation

#### **Visual Updates**:
- ✅ Header badge for bonus mode
- ✅ Large presentation banner
- ✅ Team filtering to exclude failed team
- ✅ Toast notifications

#### **User Experience**:
- ✅ Clear workflow
- ✅ Automatic point management
- ✅ No manual tracking needed
- ✅ Professional presentation

---

### **Files Modified**:

**`src/app/competitions/[id]/manage/page.tsx`**:
1. Added bonus round state variables
2. Updated `handleBuzzerAnswer()` with bonus logic
3. Updated `handleNextQuestion()` to reset bonus state
4. Updated `handlePrevQuestion()` to reset bonus state
5. Added header badge for bonus mode
6. Added presentation banner for bonus mode
7. Updated team filtering to exclude failed team
8. Added toast notifications

---

**Your buzzer round now has a professional bonus system that maximizes question value and team engagement!** 🎁✨
