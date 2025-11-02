# Team Selection & Auto-Award Points Guide

## ✅ What Was Implemented

### **New Features:**

1. **Clickable Team Selection in Presentation Mode** 🖱️
   - Team cards in presentation footer are now clickable
   - Works for MCQ and Sequence rounds
   - Visual feedback shows selected team
   - Auto-awards points when correct answer is selected

2. **Final Winner Reveal Fixed** 🏆
   - Press 'A' key now properly reveals the winner
   - Works in both admin and presentation modes
   - Shows champion with animation and full standings

---

## 🎯 Team Selection Feature

### **When It Works:**

**Rounds**:
- ✅ MCQ Round
- ✅ Sequence Round
- ❌ Media Round (manual scoring only)
- ❌ Buzzer Round (has its own team selection)
- ❌ Rapid Fire Round (manual scoring only)
- ❌ Visual Rapid Fire Round (manual scoring only)

**States**:
- ✅ When question is shown (`question_shown`)
- ✅ When options are shown (`options_shown`)
- ❌ When idle (`idle`) - cards are not clickable

---

## 🖱️ How to Use Team Selection

### **Step-by-Step Workflow:**

#### **MCQ Round:**

1. **Show Question**
   - Press **Q** → Question appears
   - Team cards become clickable (cursor changes)
   - Cards show hover effect (scale & border color change)

2. **Select Team**
   - Click on the team card at bottom of screen
   - Selected team gets:
     - **Green border** with glow effect
     - **"SELECTED ✓"** badge (top-right corner)
     - **Scale up** slightly (105%)
     - **Green badge** in header showing team name

3. **Show Options**
   - Press **O** → Options appear + Timer starts

4. **Select Answer**
   - Click the correct option
   - **If Correct**:
     - ✅ Confetti fires
     - ✅ Points automatically awarded to selected team
     - ✅ Right answer sound plays
   - **If Wrong**:
     - ❌ Wrong answer sound plays
     - ❌ Correct answer shows after 1 second
     - ❌ Negative points applied if enabled

5. **Next Question**
   - Press **N** → Selection automatically clears
   - Ready for next team selection

---

#### **Sequence Round:**

1. **Show Question**
   - Press **Q** → Question appears
   - Team cards become clickable

2. **Select Team**
   - Click on the team card
   - Visual feedback same as MCQ

3. **Show Options**
   - Press **O** → Options appear for sequencing

4. **Build Sequence**
   - Click options in order to build sequence
   - Press **A** → Open comparison modal

5. **Reveal Sequence**
   - Press **A** repeatedly → Reveal each step
   - Each step plays correct/wrong sound

6. **Auto-Award**
   - After all steps revealed:
   - **If All Correct**:
     - ✅ Confetti fires
     - ✅ Points automatically awarded to selected team
   - **If Any Wrong**:
     - ❌ Negative points applied if enabled

7. **Next Question**
   - Press **N** → Selection clears

---

## 🎨 Visual Indicators

### **Team Card States:**

#### **Normal State (Not Selectable)**:
```
┌─────────────────────────────┐
│  🔵 Default border          │
│  Team Alpha                 │
│  School X                   │
│  45 points                  │
│  [+10] [-10] buttons        │
└─────────────────────────────┘
```

#### **Hoverable State (MCQ/Sequence, not idle)**:
```
┌─────────────────────────────┐
│  🟡 Cursor: pointer         │
│  Hover: Scale 105%          │
│  Hover: Yellow border       │
│  Team Alpha                 │
│  45 points                  │
└─────────────────────────────┘
```

#### **Selected State**:
```
┌─────────────────────────────┐
│  ✓ SELECTED        [badge]  │
│  🟢 Green border + glow     │
│  📈 Scaled up 105%          │
│  Team Alpha                 │
│  School X                   │
│  45 points                  │
│  [+10] [-10] buttons        │
└─────────────────────────────┘
```

### **Header Indicator:**

When a team is selected in MCQ or Sequence rounds:

```
┌────────────────────────────────────────────┐
│  Competition Name | League | ✓ Team Alpha │
│  (Green pulsing badge shows selected team) │
└────────────────────────────────────────────┘
```

---

## 🔧 Technical Implementation

### **Click Handler:**
```typescript
onClick={() => {
  if ((roundType === "mcq" || roundType === "sequence") && currentState !== "idle") {
    setSelectedTeam(team._id);
  }
}}
```

### **Conditional Styling:**
```typescript
className={`relative ... ${
  (roundType === "mcq" || roundType === "sequence") && currentState !== "idle"
    ? "cursor-pointer hover:scale-105 hover:border-yellow-300"
    : ""
} ${
  selectedTeam === team._id
    ? "border-green-400 ring-4 ring-green-400/50 scale-105"
    : "border-yellow-300/50"
}`}
```

### **Auto-Award Logic (MCQ):**
```typescript
if (isCorrect) {
  playRightAnswerAudio();
  fireSideConfetti();
  
  // Auto-award points if a team is selected
  if (selectedTeam && (roundType === "mcq" || roundType === "sequence")) {
    setTimeout(() => {
      handleAwardPoints(selectedTeam, getCurrentRoundPoints());
    }, 500);
  }
} else {
  playWrongAnswerAudio();
  
  // Apply negative marking if enabled
  if (selectedTeam && getCurrentRoundNegativeMarking()) {
    setTimeout(() => {
      handleAwardPoints(selectedTeam, -getCurrentRoundPoints());
    }, 500);
  }
}
```

### **Auto-Award Logic (Sequence):**
```typescript
const allCorrect =
  sequenceComparison.correct.length === sequenceComparison.selected.length &&
  sequenceComparison.correct.every((v, idx) => v === sequenceComparison.selected[idx]);

if (allCorrect) {
  fireSideConfetti();
  
  if (selectedTeam && roundType === "sequence") {
    setTimeout(() => {
      handleAwardPoints(selectedTeam, getCurrentRoundPoints());
    }, 500);
  }
} else {
  if (selectedTeam && getCurrentRoundNegativeMarking()) {
    setTimeout(() => {
      handleAwardPoints(selectedTeam, -getCurrentRoundPoints());
    }, 500);
  }
}
```

### **Clear Selection:**
```typescript
// Auto-clear on next/previous question
const handleNextQuestion = () => {
  stopAllAudio();
  setSelectedTeam(null); // ← Clear selection
  // ... rest of logic
};

const handlePrevQuestion = () => {
  stopAllAudio();
  setSelectedTeam(null); // ← Clear selection
  // ... rest of logic
};
```

---

## 🏆 Final Winner Reveal - FIXED

### **The Problem:**
- Pressing 'A' key in presentation mode didn't reveal winner
- Function `revealFinalWinner()` was missing

### **The Fix:**

#### **Added Function:**
```typescript
const revealFinalWinner = () => {
  console.log("Revealing final winner");
  setWinnerRevealed(true);
};
```

#### **Updated Keyboard Handler (Presentation):**
```typescript
case "a":
  // Final winner reveal gate
  if (showFinalWinnerModal && !winnerRevealed) {
    revealFinalWinner();
    break;
  }
  // ... rest of answer logic
  break;
```

### **How It Works Now:**

1. **Final Round Complete**
   - Modal appears with "Press 'A' to reveal Champion"
   - All teams shown with scores
   - Winner not highlighted yet

2. **Press 'A' Key**
   - `revealFinalWinner()` function called
   - `winnerRevealed` state set to `true`
   - Modal updates to show:
     - 🎊 Champion name (7xl, pulsing)
     - Large score badge
     - Full standings with winner highlighted
     - Gold tint and scale effect on winner

3. **Works In:**
   - ✅ Admin screen (keyboard shortcuts)
   - ✅ Presentation mode (keyboard shortcuts)

---

## 💡 Benefits

### **For Operators:**

1. **Faster Workflow**
   - No need to manually click +10 button
   - Just select team → answer question
   - Points awarded automatically

2. **Less Errors**
   - Can't forget to award points
   - Can't award to wrong team (once selected)
   - Clear visual feedback

3. **Better Flow**
   - Selection visible to audience
   - Suspense builds when team is selected
   - Celebration automatic on correct answer

### **For Audience:**

1. **Clear Visual Cues**
   - Know which team is answering
   - See selection before answer
   - Immediate feedback (confetti + points)

2. **Professional Presentation**
   - Smooth transitions
   - Consistent animations
   - No manual delays

---

## 🎮 Complete Workflow Examples

### **Example 1: MCQ Round - Quick Team Selection**

```
1. Operator: Press Q
   → Question appears
   → Team cards glow slightly (clickable)

2. Operator: Click on "Team Alpha" card
   → Green border + "SELECTED ✓" badge
   → Header shows "✓ Team Alpha"

3. Operator: Press O
   → Options appear
   → Timer starts

4. Operator: Click correct option (B)
   → Confetti fires
   → Sound plays
   → +10 points automatically awarded to Team Alpha
   → Score updates: 35 → 45

5. Operator: Press N
   → Next question
   → Selection clears automatically
   → Ready for next round
```

### **Example 2: Sequence Round - Full Process**

```
1. Operator: Press Q
   → Question appears
   
2. Operator: Click "Team Beta" card
   → Team Beta selected (green border)

3. Operator: Press O
   → 4 options appear for sequencing

4. Operator: Click options in order: C → A → D → B
   → Sequence built: C → A → D → B

5. Operator: Press A
   → Comparison modal opens
   → Shows correct vs selected sequences

6. Operator: Press A (repeatedly)
   → Step 1: C ✓ (correct sound)
   → Step 2: A ✓ (correct sound)
   → Step 3: D ✓ (correct sound)
   → Step 4: B ✓ (correct sound)
   → All correct!

7. System: Auto-awards points
   → Confetti fires
   → +10 points to Team Beta
   → Modal closes
   → Answer shown

8. Operator: Press N
   → Selection clears
   → Next question
```

---

## 🐛 Troubleshooting

### **Issue: Can't click team cards**
**Causes:**
- Round is not MCQ or Sequence
- Current state is "idle" (no question shown)
- Already in other rounds that don't support it

**Solution:**
- Ensure you're in MCQ or Sequence round
- Press Q to show question first
- Check that options are shown (Press O)

---

### **Issue: Selected team doesn't show**
**Causes:**
- CSS not loaded
- State not updating

**Solution:**
- Check browser console for errors
- Refresh page
- Ensure `selectedTeam` state exists

---

### **Issue: Points not auto-awarded**
**Causes:**
- No team selected
- Wrong answer (check negative marking)
- JavaScript error

**Solution:**
- Ensure team is selected (green border visible)
- Check console for errors
- Verify `handleAwardPoints` is called (check logs)

---

### **Issue: Final winner not revealing**
**Causes:**
- Old code without fix
- Modal not showing
- Key handler not working

**Solution:**
- ✅ Code is now fixed
- Ensure modal is visible
- Press 'A' key (not other keys)
- Check browser console for "Revealing final winner"

---

## 📊 Feature Matrix

| Feature | MCQ | Sequence | Media | Buzzer | Rapid Fire | Visual RF |
|---------|-----|----------|-------|--------|------------|-----------|
| **Team Selection** | ✅ | ✅ | ❌ | Native | ❌ | ❌ |
| **Clickable Cards** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Auto-Award** | ✅ | ✅ | ❌ | Manual | Manual | Manual |
| **Visual Feedback** | ✅ | ✅ | N/A | Native | N/A | N/A |
| **Negative Marking** | ✅ | ✅ | N/A | N/A | N/A | N/A |

---

## 📝 Summary

### **What Changed:**

#### **Team Selection:**
- ✅ Team cards clickable in MCQ & Sequence
- ✅ Visual feedback (border, badge, scale)
- ✅ Header indicator shows selected team
- ✅ Auto-awards points on correct answer
- ✅ Auto-applies negative marking on wrong
- ✅ Selection clears on next/prev question

#### **Final Winner Reveal:**
- ✅ Added `revealFinalWinner()` function
- ✅ Fixed keyboard handler in presentation
- ✅ Press 'A' now properly reveals winner
- ✅ Works in both admin and presentation modes

---

### **Files Modified:**

**`src/app/competitions/[id]/manage/page.tsx`**:
- Added `revealFinalWinner()` function
- Updated presentation keyboard handler for 'A' key
- Made team cards clickable with onClick handler
- Added conditional styling for selectable/selected states
- Added "SELECTED ✓" badge overlay
- Added header badge showing selected team
- Updated `handleOptionClick()` to auto-award points
- Updated `handleSequenceReveal()` to auto-award points
- Updated `handleNextQuestion()` to clear selection
- Updated `handlePrevQuestion()` to clear selection

---

**Your quiz app now has professional team selection with automatic point awarding!** 🎉✨
