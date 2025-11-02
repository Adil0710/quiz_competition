# Timer Configuration & Toggle Guide

## ✅ New Features Implemented

### 1. **Timer Toggle with T Key** ⏯️
The timer can now be paused and resumed using the **T key** - it will continue from where it was paused.

#### How It Works:
- **Press T**: Start timer (if stopped) or pause timer (if running)
- **Press T again**: Resume from where it was paused
- **Timer preserves remaining time**: When paused, the remaining seconds are saved
- **Works on both screens**: Admin and Presentation screens

#### Previous Behavior:
- Timer would reset when stopped/started

#### New Behavior:
- Timer pauses at current time
- Press T again to resume countdown from paused time
- Only resets when starting a new question

---

### 2. **Configurable Timer Durations** ⚙️
All round types now have configurable timer durations that can be set globally.

#### Access Settings:
1. Click **Settings** icon (⚙️) in the navbar
2. Navigate to **Timer Settings** tab
3. Configure timer duration for each question type
4. Click **Save Settings**

#### Default Timer Durations:

| Round Type | Default Duration | Configurable Range |
|------------|------------------|-------------------|
| MCQ | 10 seconds | 1-300 seconds |
| Media | 10 seconds | 1-300 seconds |
| Buzzer | 10 seconds | 1-300 seconds |
| Sequence | 20 seconds | 1-300 seconds |
| Rapid Fire | 60 seconds | 1-300 seconds |
| Visual Rapid Fire | 60 seconds | 1-300 seconds |

---

## 🎮 Timer Toggle Usage

### **On Presentation Screen:**
```
1. Question displays
2. Press O → Shows options/media & starts timer
3. Press T → Pause timer at current time (e.g., 8 seconds remaining)
4. Press T → Resume from 8 seconds
5. Press T → Pause again
6. Press T → Resume again
...and so on
```

### **Timer States:**
- **Not Started**: Timer shows initial duration (e.g., 0:15)
- **Running**: Timer counts down, animating
- **Paused**: Timer stopped at current value (e.g., 0:08)
- **Resumed**: Timer continues from paused value

### **Visual Indicators:**
- **Timer Active**: Green color, pulsing animation
- **Timer Paused**: Yellow/orange color, static

---

## ⚙️ Settings Configuration

### **Access Path:**
```
Navbar → Settings Icon (⚙️) → Timer Settings Tab
```

### **Settings Interface:**

```
┌─────────────────────────────────────────────┐
│  Timer Duration Configuration (in seconds)  │
├─────────────────────────────────────────────┤
│  MCQ Timer (seconds)          [ 10 ]        │
│  Media Timer (seconds)        [ 10 ]        │
│  Buzzer Timer (seconds)       [ 10 ]        │
│  Sequence Timer (seconds)     [ 20 ]        │
│  Rapid Fire Timer (seconds)   [ 60 ]        │
│  Visual Rapid Fire Timer      [ 60 ]        │
├─────────────────────────────────────────────┤
│  [Cancel]              [Save Settings]      │
└─────────────────────────────────────────────┘
```

### **Settings Storage:**
- Saved in MongoDB `GlobalSettings` collection
- Applied globally across all competitions
- Takes effect immediately after saving
- No need to restart app

---

## 🔧 Technical Implementation

### **Database Schema (`GlobalSettings` Model)**
```typescript
{
  // Points configuration
  mcqPoints: Number,
  mediaPoints: Number,
  buzzerPoints: Number,
  rapidFirePoints: Number,
  sequencePoints: Number,
  visualRapidFirePoints: Number,
  
  // Negative marking flags
  mcqNegativeMarking: Boolean,
  mediaNegativeMarking: Boolean,
  rapidFireNegativeMarking: Boolean,
  sequenceNegativeMarking: Boolean,
  visualRapidFireNegativeMarking: Boolean,
  
  // Timer durations (NEW)
  mcqTimer: Number,        // default: 10
  mediaTimer: Number,      // default: 10
  buzzerTimer: Number,     // default: 10
  rapidFireTimer: Number,  // default: 60
  sequenceTimer: Number,   // default: 20
  visualRapidFireTimer: Number // default: 60
}
```

### **API Endpoints:**

#### GET `/api/global-settings`
Retrieves current global settings including timer durations.

**Response:**
```json
{
  "success": true,
  "data": {
    "mcqPoints": 10,
    "mcqTimer": 10,
    "mediaTimer": 10,
    "buzzerTimer": 10,
    "rapidFireTimer": 60,
    "sequenceTimer": 20,
    "visualRapidFireTimer": 60,
    ...
  }
}
```

#### POST `/api/global-settings`
Updates global settings.

**Request Body:**
```json
{
  "mcqPoints": 10,
  "mcqTimer": 15,
  "mediaTimer": 20,
  ...
}
```

### **Frontend Implementation:**

#### Timer Settings State
```typescript
const [timerSettings, setTimerSettings] = useState({
  mcqTimer: 10,
  mediaTimer: 10,
  buzzerTimer: 10,
  rapidFireTimer: 60,
  sequenceTimer: 20,
  visualRapidFireTimer: 60
});
```

#### Helper Function
```typescript
const getTimerDuration = (type: string): number => {
  switch (type) {
    case "mcq": return timerSettings.mcqTimer;
    case "media": return timerSettings.mediaTimer;
    case "buzzer": return timerSettings.buzzerTimer;
    case "rapid_fire": return timerSettings.rapidFireTimer;
    case "sequence": return timerSettings.sequenceTimer;
    case "visual_rapid_fire": return timerSettings.visualRapidFireTimer;
    default: return 15;
  }
};
```

#### Usage
```typescript
// Instead of hardcoded:
startTimer(15); // ❌ Old way

// Now dynamic:
startTimer(getTimerDuration("mcq")); // ✅ New way
startTimer(getTimerDuration(roundType)); // ✅ Uses current round type
```

---

## 🎯 Use Cases

### **Use Case 1: Shorter Timers for Experienced Players**
```
Settings:
- MCQ Timer: 5 seconds
- Media Timer: 8 seconds
- Buzzer Timer: 5 seconds

Result: Faster-paced competition
```

### **Use Case 2: Longer Timers for Beginners**
```
Settings:
- MCQ Timer: 20 seconds
- Media Timer: 30 seconds
- Buzzer Timer: 15 seconds

Result: More thinking time for participants
```

### **Use Case 3: Balanced Competition**
```
Settings:
- MCQ Timer: 10 seconds
- Media Timer: 10 seconds
- Buzzer Timer: 10 seconds
- Sequence Timer: 20 seconds
- Rapid Fire Timer: 60 seconds
- Visual Rapid Fire Timer: 60 seconds

Result: Default recommended settings
```

---

## ⌨️ Keyboard Shortcuts Reference

### **All Keys Work on Presentation Screen:**

| Key | Function | Details |
|-----|----------|---------|
| **Q** | Show/Hide Question | Toggles question display |
| **O** | Show Options/Start Timer | Shows options and auto-starts timer |
| **T** | Toggle Timer (Pause/Resume) | ⭐ **NEW**: Pause/resume at current time |
| **A** | Show Answer | Reveals correct answer |
| **N** | Next Question | Moves to next question |
| **[** or **←** | Previous Round | Navigate to previous round |
| **]** or **→** | Next Round | Navigate to next round |
| **Esc** | Exit Fullscreen | Exits presentation mode |

---

## 🔄 Timer Flow Diagram

```
┌─────────────────────┐
│  Question Loaded    │
│  Timer: Not Started │
└──────────┬──────────┘
           │
           │ Press O (Options)
           ▼
┌─────────────────────┐
│  Options Shown      │
│  Timer: Auto-Start  │◄──┐
│  (e.g., 0:10)       │   │
└──────────┬──────────┘   │
           │               │
           │ Press T       │ Press T
           ▼               │ (Resume)
┌─────────────────────┐   │
│  Timer: PAUSED      │   │
│  (e.g., 0:07)       │───┘
└──────────┬──────────┘
           │
           │ Countdown completes
           ▼
┌─────────────────────┐
│  Timer: Expired     │
│  (0:00)             │
└─────────────────────┘
```

---

## 📋 Migration Notes

### **Existing Competitions:**
- Timer settings load on component mount
- If global settings don't exist, defaults are used
- No database migration needed (handled in API)

### **Backward Compatibility:**
- Old installations auto-create default timer settings
- Existing GlobalSettings documents are migrated automatically
- All timers default to safe values if settings missing

---

## 🐛 Troubleshooting

### **Issue: Timer doesn't pause when pressing T**
**Solution:** 
- Ensure focus is on presentation screen
- Click on presentation area if keys don't respond
- Check browser console for errors

### **Issue: Timer settings not saving**
**Solution:**
- Check MongoDB connection
- Verify API is responding
- Check browser console for network errors

### **Issue: Timer always uses default duration**
**Solution:**
- Refresh the competition page after changing settings
- Verify settings were saved (check Settings dialog)
- Check if `timerSettings` state is being loaded

### **Issue: Timer resets instead of pausing**
**Solution:**
- This is the new expected behavior - timer pauses at current time
- If timer resets, there may be a state management issue
- Check Zustand store for `timeLeft` persistence

---

## 📝 Summary

✅ **Timer Toggle**: Press T to pause/resume timer
✅ **Configurable Durations**: Set timer for each question type
✅ **Global Settings**: Configure once, applies everywhere
✅ **Instant Updates**: Changes take effect immediately
✅ **Persistent State**: Timer remembers paused time
✅ **Works Everywhere**: Both admin and presentation screens

**Your quiz app now has fully configurable and pausable timers!** ⏱️🎉
