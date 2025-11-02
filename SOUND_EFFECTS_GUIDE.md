# Sound Effects Implementation Guide

## ✅ What Was Implemented

### **New Sound Effects Added:**

1. **`question_reveal.mp3`** - Plays when Q key is pressed
2. **`question_start.mp3`** - Plays when O key is pressed (70% volume)

### **Existing Sound Effects:**
- **`15s_timer.mp3`** - Timer countdown sound
- **`right_answer.mp3`** - Correct answer sound
- **`wrong_answer.mp3`** - Wrong answer sound

---

## 🎵 Sound Effect Triggers

### **1. Question Reveal Sound** 🎤

**File**: `/public/question_reveal.mp3`

**Trigger**: Press **Q** key

**When It Plays**:
- All rounds (MCQ, Media, Buzzer, Rapid Fire, Sequence, Visual Rapid Fire)
- All phases (League, Semi-Final, Final)
- When transitioning from `idle` → `question_shown`

**Purpose**: 
- Dramatic reveal when question appears on screen
- Builds anticipation
- Signals to audience that question is being displayed

**Volume**: 100% (default)

**Code Location**:
```typescript
const handleQuestionToggle = () => {
  if (currentState === "idle") {
    // Play question reveal sound for all rounds in all phases
    playQuestionRevealAudio();
    
    if (roundType === "rapid_fire") {
      setState("options_shown");
      startTimer(getTimerDuration("rapid_fire"));
    } else if (roundType === "buzzer") {
      setState("question_shown");
    } else {
      setState("question_shown");
    }
  } else {
    setState("idle");
  }
};
```

---

### **2. Question Start Sound** 🏁

**File**: `/public/question_start.mp3`

**Trigger**: Press **O** key

**When It Plays**:
- All rounds **EXCEPT Media Round**
- All phases (League, Semi-Final, Final)
- When transitioning to `options_shown` state

**Exception**: 
- **Does NOT play for Media Round** (video/audio questions)
- Reason: Media content has its own audio that would conflict

**Purpose**:
- Signals that options are now visible
- Indicates timer is starting
- Creates excitement for answer phase

**Volume**: 70% (0.7)

**Code Location**:
```typescript
const handleOptionsToggle = () => {
  setState("options_shown");

  // Play question start sound for all rounds EXCEPT media round
  if (roundType !== "media") {
    playQuestionStartAudio();
  }

  // Rest of the logic...
};
```

---

## 🎮 Complete Sound Flow by Round Type

### **MCQ Round**:
```
1. Press Q → question_reveal.mp3 plays → Question shows
2. Press O → question_start.mp3 plays (70%) → Options show + Timer starts (15s_timer.mp3)
3. Click option:
   - Correct: right_answer.mp3 + Confetti
   - Wrong: wrong_answer.mp3 + Auto-reveal correct answer
```

### **Media Round**:
```
1. Press Q → question_reveal.mp3 plays → Question shows
2. Press O → question_start.mp3 DOES NOT play → Options show (video/audio loads)
3. Media plays → Auto-starts timer (15s_timer.mp3)
4. Press A → Show answer
```

### **Buzzer Round**:
```
1. Press Q → question_reveal.mp3 plays → Question shows
2. Press O → question_start.mp3 plays (70%) → Team selection shows
3. Select team → Timer starts (15s_timer.mp3)
4. Enter answer → right_answer.mp3 or wrong_answer.mp3
```

### **Rapid Fire Round**:
```
1. Press Q → question_reveal.mp3 plays → Goes directly to timer
2. Press O → question_start.mp3 plays (70%) → Timer starts (60s, 15s_timer.mp3)
3. Award points manually
```

### **Sequence Round**:
```
1. Press Q → question_reveal.mp3 plays → Question shows
2. Press O → question_start.mp3 plays (70%) → Options show + Timer starts (15s_timer.mp3)
3. Click options in order → Build sequence
4. Press A → Open comparison modal
5. Press A repeatedly → Reveal steps (right_answer.mp3 or wrong_answer.mp3 for each step)
```

### **Visual Rapid Fire Round**:
```
1. Press Q → question_reveal.mp3 plays → Question shows
2. Press O → question_start.mp3 plays (70%) → First image shows + Timer starts (60s)
3. Press O → Cycle through images
4. Award points manually
```

---

## 🔊 Audio Management Functions

### **Play Functions**:

#### `playQuestionRevealAudio()`
```typescript
const playQuestionRevealAudio = () => {
  if (questionRevealAudioRef.current) {
    questionRevealAudioRef.current.currentTime = 0; // Reset to start
    questionRevealAudioRef.current.play().catch(console.error);
  }
};
```
- Resets audio to beginning
- Plays from start
- Handles errors gracefully

#### `playQuestionStartAudio()`
```typescript
const playQuestionStartAudio = () => {
  if (questionStartAudioRef.current) {
    questionStartAudioRef.current.currentTime = 0;
    questionStartAudioRef.current.volume = 0.7; // Set to 70% volume
    questionStartAudioRef.current.play().catch(console.error);
  }
};
```
- Sets volume to 70% (0.7)
- Resets to beginning
- Plays from start
- Error handling included

### **Stop Function**:

#### `stopAllAudio()`
```typescript
const stopAllAudio = () => {
  // Timer audio
  if (timerAudioRef.current) {
    timerAudioRef.current.pause();
    timerAudioRef.current.currentTime = 0;
  }
  // Right answer audio
  if (rightAnswerAudioRef.current) {
    rightAnswerAudioRef.current.pause();
    rightAnswerAudioRef.current.currentTime = 0;
  }
  // Wrong answer audio
  if (wrongAnswerAudioRef.current) {
    wrongAnswerAudioRef.current.pause();
    wrongAnswerAudioRef.current.currentTime = 0;
  }
  // Question reveal audio
  if (questionRevealAudioRef.current) {
    questionRevealAudioRef.current.pause();
    questionRevealAudioRef.current.currentTime = 0;
  }
  // Question start audio
  if (questionStartAudioRef.current) {
    questionStartAudioRef.current.pause();
    questionStartAudioRef.current.currentTime = 0;
  }
};
```
- Stops all audio immediately
- Resets all to beginning
- Called when:
  - Moving to next/previous question (N/P keys)
  - Changing rounds
  - Hiding questions

---

## 🎯 Audio Refs Setup

### **React Refs**:
```typescript
const timerAudioRef = useRef<HTMLAudioElement | null>(null);
const rightAnswerAudioRef = useRef<HTMLAudioElement | null>(null);
const wrongAnswerAudioRef = useRef<HTMLAudioElement | null>(null);
const questionRevealAudioRef = useRef<HTMLAudioElement | null>(null);
const questionStartAudioRef = useRef<HTMLAudioElement | null>(null);
```

### **HTML Audio Elements**:
```tsx
<audio ref={timerAudioRef} preload="auto">
  <source src="/15s_timer.mp3" type="audio/mpeg" />
</audio>
<audio ref={rightAnswerAudioRef} preload="auto">
  <source src="/right_answer.mp3" type="audio/mpeg" />
</audio>
<audio ref={wrongAnswerAudioRef} preload="auto">
  <source src="/wrong_answer.mp3" type="audio/mpeg" />
</audio>
<audio ref={questionRevealAudioRef} preload="auto">
  <source src="/question_reveal.mp3" type="audio/mpeg" />
</audio>
<audio ref={questionStartAudioRef} preload="auto">
  <source src="/question_start.mp3" type="audio/mpeg" />
</audio>
```

**Key Attributes**:
- `ref`: Links to React useRef
- `preload="auto"`: Loads audio on page load for instant playback
- `type="audio/mpeg"`: Specifies MP3 format

---

## 📂 File Structure

### **Required Files in `/public` folder**:

```
/public
  ├── 15s_timer.mp3              ✅ Existing
  ├── right_answer.mp3           ✅ Existing
  ├── wrong_answer.mp3           ✅ Existing
  ├── question_reveal.mp3        🆕 NEW - Add this file
  └── question_start.mp3         🆕 NEW - Add this file
```

### **File Requirements**:

1. **question_reveal.mp3**:
   - Should be short (1-3 seconds)
   - Dramatic/exciting sound
   - Clear and attention-grabbing
   - Good for question reveal moment

2. **question_start.mp3**:
   - Should be short (1-2 seconds)
   - Energetic/action sound
   - Signals beginning of answer phase
   - Works well at 70% volume

---

## ⌨️ Keyboard Shortcuts Reference

| Key | Action | Sound Effect | When Available |
|-----|--------|-------------|----------------|
| **Q** | Show/Hide Question | `question_reveal.mp3` | Always |
| **O** | Show Options & Start | `question_start.mp3` (except media) | After question shown |
| **A** | Show Answer | None (or step sounds for sequence) | After options shown |
| **T** | Toggle Timer | None | When timer active |
| **N** | Next Question | Stops all audio | Anytime |
| **P** | Previous Question | Stops all audio | When not on first question |

---

## 🔧 Technical Details

### **Volume Control**:

Only `question_start.mp3` has volume control:
```typescript
questionStartAudioRef.current.volume = 0.7; // 70% volume
```

**Why 70% for question_start?**
- Prevents audio from being too loud
- Allows timer sound to be more prominent
- Balances with other sound effects
- User requested specifically

**Other sounds**: 100% (default browser volume)

### **Audio Preloading**:

All audio files use `preload="auto"`:
- Files load when page loads
- Instant playback when triggered
- No delay or lag
- Better user experience

### **Error Handling**:

All play functions use `.catch(console.error)`:
```typescript
audio.play().catch(console.error);
```
- Prevents app crash if audio fails
- Logs errors to console for debugging
- Graceful degradation if audio not available

### **Audio Reset**:

Every play function resets `currentTime`:
```typescript
audioRef.current.currentTime = 0;
```
- Ensures audio plays from beginning
- Prevents continuation from previous play
- Allows rapid re-triggering

---

## 🎭 User Experience Flow

### **Typical Question Workflow**:

**1. Operator Workflow**:
```
Press Q → "Whoosh/Reveal" sound → Question appears on screen
↓
Press O → "Start/Action" sound (70%) → Options appear + Timer starts
↓
(Timer counting sound plays)
↓
Team answers → Correct/Wrong sound plays
↓
Press N → All audio stops → Next question
```

**2. Audience Experience**:
```
Hear reveal sound → Focus on question
↓
Hear start sound → Options appear, tension builds
↓
Hear timer → Time pressure
↓
Hear correct/wrong → Instant feedback
```

---

## 🐛 Troubleshooting

### **Issue: No sound plays when pressing Q**
**Solution**:
- Check that `question_reveal.mp3` exists in `/public` folder
- Check browser console for errors
- Ensure file is valid MP3 format
- Try refreshing page to reload audio

### **Issue: No sound plays when pressing O**
**Solution**:
- Check that `question_start.mp3` exists in `/public` folder
- Verify you're NOT in Media round (intentionally silent)
- Check browser console for errors
- Ensure volume is not muted

### **Issue: Sound is too quiet/loud**
**Solution**:
- For `question_start.mp3`: Adjust volume in code (currently 0.7)
- For `question_reveal.mp3`: Adjust system volume or edit audio file
- Check browser volume settings

### **Issue: Sound doesn't play on some browsers**
**Solution**:
- Some browsers block autoplay
- User interaction (key press) should allow it
- Check browser autoplay policy settings
- Try Chrome/Edge for best compatibility

### **Issue: Multiple sounds overlap**
**Solution**:
- This is by design in some cases (e.g., start sound + timer)
- If problematic, adjust timing or use `stopAllAudio()` before playing
- Consider editing audio files to avoid frequency conflicts

---

## 📊 Sound Effect Matrix

| Round Type | Q Press | O Press | Additional Sounds |
|-----------|---------|---------|-------------------|
| **MCQ** | question_reveal.mp3 | question_start.mp3 + 15s_timer.mp3 | right/wrong_answer.mp3 |
| **Media** | question_reveal.mp3 | ❌ No sound (media audio) | 15s_timer.mp3 (when media plays) |
| **Buzzer** | question_reveal.mp3 | question_start.mp3 | 15s_timer.mp3 (team selected), right/wrong |
| **Rapid Fire** | question_reveal.mp3 | question_start.mp3 + 15s_timer.mp3 | None (manual scoring) |
| **Sequence** | question_reveal.mp3 | question_start.mp3 + 15s_timer.mp3 | right/wrong per step |
| **Visual RF** | question_reveal.mp3 | question_start.mp3 + 15s_timer.mp3 | None (manual scoring) |

---

## 💡 Best Practices

### **For Operators**:

1. **Wait for Sound to Complete**: Let reveal sound finish before pressing O
2. **Check Volume**: Test audio levels before competition starts
3. **Browser Compatibility**: Use Chrome or Edge for best audio support
4. **Backup Plan**: Have manual announcements ready if audio fails
5. **Timing**: Don't rush - let sounds enhance the experience

### **For Developers**:

1. **Audio Format**: Use MP3 for best browser compatibility
2. **File Size**: Keep audio files small (<500KB) for fast loading
3. **Preloading**: Always use `preload="auto"` for instant playback
4. **Error Handling**: Always use `.catch()` on audio play
5. **Volume Testing**: Test at different volume levels
6. **Mobile Testing**: Test on mobile devices (audio behavior differs)

---

## 🎬 Presentation Mode

### **Audio in Presentation**:

All keyboard shortcuts work the same in fullscreen presentation mode:
- Q → question_reveal.mp3 plays
- O → question_start.mp3 plays (except media)
- All other sounds work identically

**No differences** between admin and presentation modes for audio.

---

## 📝 Summary

### **What Was Added**:

✅ **New Audio Files Required**:
1. `/public/question_reveal.mp3` - Q key press sound
2. `/public/question_start.mp3` - O key press sound (70% volume)

✅ **New Functions**:
- `playQuestionRevealAudio()` - Plays reveal sound
- `playQuestionStartAudio()` - Plays start sound at 70% volume

✅ **Updated Functions**:
- `stopAllAudio()` - Now stops 5 audio elements instead of 3
- `handleQuestionToggle()` - Calls reveal sound
- `handleOptionsToggle()` - Calls start sound (except media)

✅ **New Refs**:
- `questionRevealAudioRef` - React ref for reveal audio
- `questionStartAudioRef` - React ref for start audio

✅ **New HTML Elements**:
- Two new `<audio>` elements with refs

### **Key Features**:

🎵 **Automatic**: Sounds play automatically on key press
🔊 **Volume Control**: question_start.mp3 at 70%
🎭 **Contextual**: Media round excluded from start sound
🌍 **Universal**: Works in all rounds and phases
🛑 **Clean**: All audio stops on question navigation

---

**Your quiz competition now has professional sound effects for question reveals and starts!** 🎉🎵
