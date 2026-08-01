# Task: Rebrand TurboRush to GameForge + Build Game Mode Engine

## Summary
Successfully rebranded the entire application from TurboRush to GameForge and built the game mode engine architecture.

## Changes Made

### 1. globals.css - Complete Rebrand
- Added new GameForge color system: `--gf-teal`, `--gf-blue`, `--gf-purple`, `--gf-dark`, `--gf-light`, `--gf-card`, `--gf-success`, `--gf-danger`, `--gf-warning`, `--gf-surface`
- Updated legacy `--tr-*` color variables to map to GameForge equivalents (e.g., `--tr-navy` → `#0F172A` instead of `#17306B`)
- Created all `gf-*` CSS classes: `gf-font-display`, `gf-bg`, `gf-card`, `gf-btn`, `gf-btn-red`, `gf-btn-outline`, `gf-btn-green`, `gf-btn-purple`, `gf-btn-blue`, `gf-chip`, `gf-input`, `gf-grad-text`, `gf-pop`, `gf-float`, `gf-pulse-glow`, `gf-shake`, `gf-scrollbar`, `gf-stat-card`
- Updated `gf-bg` gradient to teal→blue (from sky→sky-deep)
- Updated `gf-btn` primary to teal, secondary to blue
- Updated `gf-input` focus ring to teal
- Updated `gf-grad-text` to teal→blue gradient
- Updated `gf-pulse-glow` to use teal glow
- Kept all `tr-*` classes as aliases for backward compatibility

### 2. layout.tsx - Rebrand
- Title: "GameForge — Create & Play Quiz Games"
- Description: "The ultimate classroom quiz game platform — create game modes, compete with friends, and master your subjects!"
- Icon: `/logo.jpeg`

### 3. Engine Files (New)
- `/src/lib/engine/types.ts` - Core types: GameModeId, GameModeConfig, GameModeState, PowerUp, Question, GameModeResult
- `/src/lib/engine/registry.ts` - Game mode registry with 5 modes: Classic Quiz, Tower Defense, Speed Rush, Battle Royale, Gold Rush
- `/src/lib/engine/core.ts` - QuizEngine class with scoring, timing, power-ups, streak tracking

### 4. page.tsx - Complete Rebrand + Mode Selector
- All branding: "TurboRush" → "GameForge", "Brain Edition" → "Quiz Platform"
- All emojis: 🏎️ → 🎮 (where appropriate for branding)
- All CSS classes: `tr-*` → `gf-*` throughout
- All color references: `text-tr-navy` → `text-gf-dark`, `bg-tr-yellow` → `bg-gf-warning`, etc.
- Added `'mode-select'` to View type
- New `ModeSelectView` component with game mode cards grid
- Dashboard now shows horizontal scrollable game mode cards
- Solo Play view now shows all 5 game modes from registry
- GamePlayer now uses GameModeId type
- Live Game view shows game mode selector with emoji icons
- localStorage key: `gameforge_user` (with fallback to `turborush_user`)
- Default avatar color: `#14B8A6` (teal)

## Verification
- Dev server running on port 3000
- Page loads successfully with new branding
- No lint errors in modified files
- All existing functionality preserved
