# BILLION: quality of life and UX review

Reviewed at commit `005b755` (main). Read-only: nothing in the repo was changed apart from this file.

## How this was checked

- Read `js/ui.js`, `js/core.js`, `js/data.js`, `index.html` and `js/game.js` in full, plus `README.md` and `PLAN.md`.
- Drove the real `index.html` in headless Chromium (chrome-headless-shell 154 via playwright-core) at 1280x800, 390x844 and 844x390, with touch emulation on the two phone sizes. 51 screenshots are in `/tmp/billion-qol/`, named `<desktop|portrait|landscape>-NN-<state>.png`. The scripts are `/tmp/billion-qol/shots.js`, `measure.js` and `m2.js`.
- Limits of that evidence:
  - The run was advanced by a scripted, invulnerable bot calling `update()` directly, with `requestAnimationFrame` stubbed and a seeded RNG. Layout, text and overlap findings are real; I did not feel real-time pacing.
  - The late-run shots have more pickups lying around than a human run would, because the bot does not collect well.
  - Touch was an emulated tap in Chromium. Anything I say about iOS Safari specifically (double-tap zoom, safe areas) is from reading the code and is not verified on a device.

Each item gives evidence, who it affects, the change, and effort (S = under an hour, M = an evening, L = more). Items are marked **Broken** (wrong, unusable or misleading as shipped) or **Nice** (would be better).

---

## Top ten

### 1. Broken: a phone player cannot pause, reroll, banish, slow time or mute
- **Evidence:** every one of these is bound only in the `keydown` handler, `js/ui.js:148-162` (`KeyR`, `KeyB`, `Escape`/`KeyP`, `KeyM`) and `js/ui.js:455` (`keys.Tab`). The only touch code is the joystick, `js/ui.js:165-176`. The tray prints "R reroll (3) · B banish (1) · hold Tab to slow time" as plain text on a phone (`/tmp/billion-qol/portrait-06-play-5min-offer.png`), and none of it is tappable.
- **Consequences:** on touch the only way to reach the build screen is to switch apps (the `blur` handler, `js/ui.js:164`). "End run and bank" is unreachable. Second Opinions and Hard Pass (`js/data.js:165-166`) can be bought in the shop and never used.
- **Affects:** every phone and tablet player, which includes the owner's normal way of playing.
- **Change:**
  - Draw a pause button in the top-left HUD and hit-test it in the canvas `pointerdown` handler before starting the joystick.
  - Render Reroll and Banish as real buttons in `.thead` with `data-act="reroll"` / `data-act="ban"`, routed through `onAct` (`js/ui.js:134`).
  - Give touch a slow-time equivalent: while an offer is waiting and no finger is on the canvas (`joy.id===null` on a device that has produced a touch), run at 0.25. Lifting the thumb to read then slows the world, which is the same intent as Tab.
  - Put a mute toggle on the pause screen and hub.
- **Effort:** M.

### 2. Broken: on a phone the tray sits on the player and under the steering thumb
- **Evidence (measured in `measure.js`, four options showing):**

| Viewport | Tray spans | Share of screen height | Covers the player |
|---|---|---|---|
| 1280x800 | y 570 to 716 | 18% | no |
| 390x844 | y 463 to 760 | 35% | starts 41px below centre |
| 844x390 | y 84 to 306 | 57% | yes, completely |

  See `/tmp/billion-qol/landscape-06-play-5min-offer.png` (player invisible behind the cards) and `/tmp/billion-qol/portrait-06-play-5min-offer.png`.
- **Why:** `#tray{bottom:84px}` and `.tc{width:215px}` (`index.html:64,72`). The only breakpoint is `max-width:700px` (`index.html:90`), so an 844px-wide landscape phone gets desktop-width cards, which wrap to two rows.
- **Mis-tap:** the tray is a DOM layer above the canvas, so a thumb that comes down where the tray has just appeared hits a card. `takePick` fires on the first tap with no delay (`js/game.js:940`); an emulated tap took the pick immediately (`picksAfter: 1`). A drag that starts on the tray also does not steer, because the joystick listens on the canvas only.
- **Affects:** phone players, every level-up.
- **Change:**
  - On small or short viewports (`max-width:700px` or `max-height:500px`) do not open the full tray during play. Show a compact chip ("LEVEL UP ×2, tap to choose") in a top corner; tapping it opens the offer as the existing modal `choice` state, which pauses. That reuses `#tray.modal` and the `pausePick` path (`js/game.js:937`).
  - Add an arming delay: ignore `pick` for about 350ms after `openOffer` renders. A timestamp check in `takePick` covers both taps and the keyboard double-press in item 14.
  - Add `@media(max-height:500px){.tc{width:150px}}` so landscape gets one row.
- **Effort:** M.

### 3. Broken: pausing hides the offer you paused to read
- **Evidence:** `renderTray` clears the tray unless state is `play` or `choice` (`js/ui.js:23`), and `pause()` calls it (`js/ui.js:118`). Confirmed in the browser: the tray class goes `on` → empty → `on` across pause and resume. `/tmp/billion-qol/desktop-08-pause.png` shows the build but not the four options that were on screen a frame earlier (`desktop-06-play-5min-offer.png`).
- **Why it matters:** the build sheet is exactly what you need next to the offer to decide ("do I already have an element on Rockets?"), and Esc is the obvious way to buy reading time.
- **Affects:** everyone, most of all new players who have not found Tab.
- **Change:** keep the tray visible and pickable in `pause` (allow `state==='pause'` in `renderTray` and in the number-key branch at `js/ui.js:161`), or render the offer as a row at the top of the pause panel. After a pick, stay paused and show the next queued offer.
- **Effort:** S to M.

### 4. Broken: three places show the player a wrong number or a meaningless instruction
- **Rank-up text understates the gain.** `js/ui.js:11` prints "+50% damage" for rank 1→2 and "+40% damage" for 2→3. `RANK_DM=[1,1.6,2.4]` (`js/data.js:201`) is +60% and then +50%. Visible in `/tmp/billion-qol/desktop-03-first-offer.png`. Derive the text from `RANK_DM` so it cannot drift again.
- **Spice 1 says "enemy health ×1".** `js/ui.js:76` passes `Math.pow(SPICE_HP,save.heat)` through `fmt`, and `fmt` floors first (`js/core.js:14`), so 1.5 prints as 1, 2.25 as 2 and 3.375 as 3. See `/tmp/billion-qol/desktop-04-hub-mid-spice.png`. Use `.toFixed(2)` with trailing zeros stripped.
- **The same line omits half of what spice does.** Enemy damage also rises 20% per level (`js/game.js:100`), and the health multiplier ramps in over the first four minutes (`js/game.js:98`). Say "enemy health ×1.5, damage ×1.2".
- **"Clear spice 0".** A brand-new save shows Overdrive locked behind "Clear spice 0" (`js/ui.js:83`, `/tmp/billion-qol/desktop-01-hub-fresh.png`), and `nextGoal` can print "Clear spice 0 to unlock…" (`js/ui.js:49`). The word "spice" is not introduced until the selector appears after the first clear (`js/ui.js:75`). When `need===1`, print "Beat the final boss to unlock".
- **Affects:** new players (rank text, spice 0), mid-game players choosing a spice level.
- **Effort:** S for all of it.

### 5. Broken: the HUD overlaps itself at phone-portrait width
- **Evidence:** `/tmp/billion-qol/portrait-06-play-5min-offer.png` and `/tmp/billion-qol/portrait-11-boss.png`. Every HUD position is a fixed pixel offset (`js/ui.js:389-413`):
  - The HP bar runs x 70 to 240 (`:393`) and the timer is centred at x 195 (`:396`), so the timer is drawn on top of the HP bar.
  - The FP total is right-aligned at 30px (`:397`) and measures 157px for "2.59M FP", so it runs into the timer and the spice marker.
  - The combo line grows to 34px (`:400`) and measures 376px on a 390px screen. It lands on the boss countdown (`:412`) and on the boss bar and name (`:406-408`).
  - "12:34  OVERTIME" measures 212px.
  - Banners use `min(64,W/12)` (`:442`): "FINAL BOSS: THE BILL" measures 402px and "RUN CLEARED  +12.3M FP" 476px, both wider than the screen.
  - The weapon and card icon row advances 42px and 34px per icon (`:431,437`). Six weapons and six cards need about 470px and run off the right edge.
- **Affects:** phone portrait players, worst during boss fights.
- **Change:** add a narrow layout when `W<520`:
  - Row 1: LV, a shorter HP bar, FP at 20px.
  - Row 2: timer on the left, combo on the right, capped at 18px.
  - Boss bar on row 3.
  - Scale the banner font from `measureText` so it always fits `W-24`.
  - Wrap or shrink the icon row.
- **Effort:** M.

### 6. Broken: the starting-weapon chooser is clipped and cannot be scrolled
- **Evidence:** `/tmp/billion-qol/landscape-15-loadout-modal.png`: with ten weapons unlocked the title and the top of row one are off the top of the screen, and Mines is cut off at the bottom. `#tray.modal` is `position:fixed; top:50%` with no max-height or overflow (`index.html:66`). In portrait (`portrait-15-loadout-modal.png`) ten weapons just fit and the title lands on the HUD; an eleventh (Money Printer) adds a sixth row.
- **Also:** the key chips read "10" and "11", but only digits 1 to 9 are bound (`js/ui.js:156`).
- **Affects:** anyone who bought Loadout (400K) and plays on a phone, a short laptop window or a small tablet.
- **Change:** for `type==='loadout'` use a compact grid (icon, name and role only, 110px cells) inside a `max-height:calc(100vh - 24px); overflow:auto` container. Drop the key chip past 9.
- **Effort:** S.

### 7. Broken: the status and reaction system is never explained or named in the game
- **Evidence:** the README explains combust, shatter and fire-cancels-frost. The game has no text for any of them: there is no "combust", "shatter" or "cancel" string in `js/ui.js` or `js/data.js`. `combust()` (`js/game.js:238`) and `shatter()` (`js/game.js:243`) draw a ring in the status colour and some numbers, with no label.
- **Traps the tray does not warn about:**
  - Frost is offered for one weapon while another carries Incendiary, although each removes the other (`js/game.js:217,221`). `PLAN.md` calls this "a mistake"; the tray shows it as a normal option.
  - "A weapon holds one element" is enforced silently (`js/game.js:874`), so element mods simply stop appearing for that weapon.
  - Every mod also adds 15% damage (`MOD_DMG`, `js/data.js:201`), stated nowhere.
- **Affects:** new and mid-game players. This is the system the rework was built around.
- **Change:**
  - Float a short label at the reaction point ("COMBUST", "SHATTER"), limited to about one per 0.4s, through the existing `texts` list.
  - In `optView` (`js/ui.js:13-16`) add one contextual line for element mods, built from `playerEls()`: "Cancels your Burn", "Combusts with your Venom", or "Shatters what your Frost freezes".
  - Add "+15% damage" to every mod's tag line.
  - Add a one-screen "Statuses" explainer reachable from the pause screen and the hub (four rows and three reactions, using the README wording).
- **Effort:** M.

### 8. Broken: evolution cards do not say what they do to the weapon you built, and some silently switch mods off
- **Evidence:** `/tmp/billion-qol/desktop-12-evo-offer.png`. The evolution cards carry the generic description only.
  - **Sawstorm** turns off Lodged and Wide Arc: `lodged:m.lodged&&E!=='b'`, `arc:m.arc&&E!=='b'` (`js/game.js:468`).
  - **Tesla Coil** takes a separate branch (`js/game.js:431-443`) that never reads `chain`, so Fork does nothing. The rank bonuses to chains and strikes are also unused, and Conductor loses its targeting (it keeps the +50%).
  - **Nuke** forces one rocket (`js/game.js:476`), so the rank-3 "+1 rocket" is lost.
- **Progress toward evolving is also hard to see.** The hub help says "Weapons take three mods and then evolve" (`js/ui.js:85`), but the rule is rank 3 and three mods (`js/game.js:889`). In a run the only sign is roman numerals and three 6x4px pips (`js/ui.js:428-430`).
- **Affects:** every player at their first evolution; late-game players choosing a form.
- **Change:**
  - Add a per-evolution note field in `WEAPONS[..].evo` (for example `off:['lodged','arc']`) and have `optView` print "Lodged and Wide Arc stop working" in the red cost line when the player owns those mods.
  - On rank and mod cards that complete the requirement, tag "EVOLUTION READY NEXT". On the pause sheet print per weapon "Evolves at rank 3 + 3 mods (1 to go) → Minigun or Railgun".
  - Fix the help line to "rank 3 and three mods".
- **Effort:** S for the text, M with the per-evolution notes.

### 9. Nice, high value: no damage breakdown while playing, and the end-of-run summary leaves out the build
- **Evidence:**
  - `R.dmg` is tracked live (`js/game.js:182,196`) but shown only after death (`js/ui.js:70`). The pause sheet (`js/ui.js:116-130`, `/tmp/billion-qol/desktop-08-pause.png`) lists names only, so a player cannot find out mid-run that Rockets are doing 3%.
  - Mod chips have no description, so "what did Lodged do?" cannot be answered in a run.
  - The summary (`/tmp/billion-qol/desktop-13-death-summary.png`) has percentages but no build recap, no cause of death and no spice level.
  - `save.best` and `save.bestTime` are written (`js/game.js:974-975`) and never displayed.
- **Affects:** everyone. It is the main tool for learning what works.
- **Change:**
  - **Pause sheet:** add a damage bar and share to each weapon row (reuse the `.dmg` markup), give each chip a `title` and a tap-to-expand description, and add a stats line (HP, damage multiplier, rerolls, banishes and revives left).
  - **Summary:** add the build (weapon rows with mod chips, cards), "Killed by: The Charger" (pass a source label into `hurt()`, `js/game.js:311`, from the two call sites at `:795` and `:805`), the spice level, and "Best 21.3M · longest 14:22" under the big number.
- **Effort:** M.

### 10. Nice, high value: a brand-new player gets two lines of grey 12px text and nothing else
- **Evidence:** `/tmp/billion-qol/desktop-01-hub-fresh.png`. The only onboarding is `.help` (`js/ui.js:84-86`; 12px at 60% opacity, `index.html:48`). It is keyboard-only, with no mention of touch, R, B or Tab, and it says nothing about picks not pausing.
  - On a phone the help sits below sixteen shop items (`/tmp/billion-qol/portrait-01-hub-fresh.png`), every one dimmed because the bank is zero.
  - The first offer (`/tmp/billion-qol/desktop-03-first-offer.png`) arrives at about 0:24 with the hint "hold Tab to slow time" and no sign that the world keeps moving.
- **Affects:** new players, and phone players twice over.
- **Change:**
  - While `save.runs===0`, hide the shop behind "The shop opens after your first run" and show three large lines, picking the keyboard or touch wording from `matchMedia('(pointer:coarse)')`: "Drag anywhere to move. Weapons fire on their own." / "Level-ups do not stop the game. Tap an option when you have a moment." / "Rank 3 and three mods evolves a weapon."
  - For the first two offers of a first run, force the paused `choice` mode with a caption: "This pauses only this once. From now on the game keeps running."
- **Effort:** M.

---

## By screen

### Pick tray

**11. Broken: universal mods are offered for weapons where they do nothing.**
- Evidence: `modChoices` (`js/game.js:871-876`) offers all nine universal mods to every weapon.
  - Oversized changes only `am` and `size` (`js/game.js:14`), and Zap reads neither (`js/game.js:429-459`).
  - Concussive changes only `kb`. Zap and Black Hole hit with `kb=0` (`js/game.js:351,364`), and the Laser with 6 (`js/game.js:542`).
  - `/tmp/billion-qol/landscape-08-pause.png` shows a bot-built Black Hole carrying Concussive.
- Affects: everyone; a wasted pick out of roughly 38.
- Change: add `skip:['lightning']` style lists to `MODS.big` and `MODS.conc` and filter in `modChoices`. Or say what each does per weapon ("Oversized: wider beam").
- Effort: S.

**12. Broken: banish mode marks every option as a target, and silently cancels on options that cannot be banished.**
- Evidence: `#tray.ban .tc` puts a dashed red border on all cards (`index.html:89`, `/tmp/billion-qol/desktop-07-banmode.png`, where both evolutions are outlined). Only weapons, mods and cards can be banished (`js/game.js:944`). Choosing anything else just leaves ban mode (`js/game.js:947`) and no banish is spent.
- Affects: anyone who bought Hard Pass.
- Change: in ban mode dim the cards that cannot be banished and remove their `data-act`. Change the header to "BANISH WHICH ONE? (gone for this run) · B to cancel".
- Effort: S.

**13. Broken: nothing in the game says what a banish is.** The shop says "+1 banish per run" (`js/data.js:166`) and the tray says "B banish (1)". Only the README explains it. Change the shop text to "Remove one option from the rest of a run, once per run", and likewise "+1 reroll per run: draw a fresh set of options". Effort S.

**14. Nice: a double key-press takes an option the player never saw.** `takePick` opens the next queued offer in the same call (`js/game.js:951-952`) with the cards in the same positions. With "+2 waiting" (two chests and a level), tapping `1` twice takes whatever replaced the first card. The 350ms arming delay in item 2 fixes this too; a short slide-in on the new cards makes the change visible. Effort S.

**15. Nice: the line that says which weapon a mod is for is the smallest text on the card.** `.tc .tg` is 10px (`index.html:78`): "MOD FOR 🔫 PEA SHOOTER · 1/3". With four weapons this is the first thing to read. Raise it to 12px and overlay the target weapon's icon on the corner of the mod icon. Effort S.

**16. Nice: card options do not show slot use.** Mods show "· 2/3" (`js/ui.js:15`); cards show just "CARD" (`js/ui.js:19`). Print "CARD · 3/5", and "takes no slot" for Spiked Bubble and Mirror (`free:true`, `js/data.js:140-141`). Do the same for new weapons ("4/4, last slot"). Effort S.

**17. Nice: the tray hint line is unreadable over a crowd.** `.thead .tk` is 13px at 75% opacity with a text shadow, drawn over the playfield (`/tmp/billion-qol/desktop-06-play-5min-offer.png`, where enemies show through "reroll (3)"). Give `.thead` the same `rgba(22,26,46,.95)` pill background as the cards. Effort S.

**18. Nice: nothing shows that Tab is working.** `js/ui.js:455` scales `dt` and draws nothing. Add a faint blue vignette or a "SLOW" tag next to the timer while it is active. Effort S.

**19. Nice: a ready evolution takes two of three slots on every offer until it is taken** (`js/game.js:889-890`), and it cannot be rerolled away or banished. A player saving the decision, or avoiding a form that disables their mods (item 8), has one real option per pick. Show the evolution pair on alternate offers, or add a "later" control that hides it for three offers. Effort S.

**20. Nice: the rank note is wrong with Big One.** `RANK_NOTE.rocket` promises "+1 rocket" at rank 3 (`js/ui.js:5`), but Big One forces one rocket (`js/game.js:476`). Suppress the note when `w.m.bigone`. Effort S.

**21. Nice: Overclock and Training use the same grey tag** (`cls:'oc'`, `js/ui.js:18,20`), and "Overclock" (in-run, per weapon) is one letter-swap from "Overdrive" (shop, global, `js/data.js:174`). Rename one; "Tune-up" for the in-run pick would do. Effort S.

### In-run HUD

**22. Broken: health is a bar with no number, while the game prices things in HP.** Blood Price costs "5 HP", Mirror "-25 max HP", Health gives "+25 max HP and heal 40", Pyromaniac "0.75 HP a second". The HUD draws only a 170x12 bar (`js/ui.js:393-394`). Draw `Math.ceil(P.hp)+'/'+P.maxhp` inside it at 10px. Effort S.

**23. Broken: remaining revives are invisible.** `P.revives` appears nowhere in `render()`. The first sign of a revive is the "NOT TODAY" banner when it is spent (`js/game.js:325`). Draw one small heart per revive after the HP bar. Effort S.

**24. Broken: a boss can be alive and nowhere on screen, with no pointer.** `/tmp/billion-qol/desktop-11-boss.png` shows the Broodmother's bar at full health with no boss in view. She backs away from the player (`js/game.js:758`), and all bosses spawn off the edge (`js/game.js:132`). The piggy bank already has an arrow (`js/ui.js:415-419`). Reuse that block for `boss` in the boss's colour. Effort S.

**25. Nice: off-screen chests are lost.** Chests are the one pickup the magnet never pulls (`js/game.js:812`), and a boss chest left behind while kiting has no marker. Add a small gold arrow for off-screen `kind==='chest'`. Effort S.

**26. Nice: "SWARM!" does not say from where.** The swarm arrives from one angle (`js/game.js:127-128`). Store it on `R.banner` and draw a chevron on that edge for two seconds. Effort S.

**27. Nice: cards with conditions give no sign of being on or off.** Stand Your Ground, Hit and Run, Storm Rider, Sniper, Brawler, Tunnel Vision, Berserk and Mob Rule all switch on player state (`js/game.js:157-166,857`), but card icons are static (`js/ui.js:434-438`, `/tmp/billion-qol/desktop-17-mines-statuses.png`).
- Stand Your Ground needs 0.5s of stillness (`js/game.js:163`), which is impossible to judge by feel.
- "Up close" is 150/180px and "long range" is 300px (`js/game.js:159-160`), shown nowhere.
- Change: dim a card icon when its bonus is off and tint it red when its penalty is on. With Sniper or Brawler held, draw a faint ring at the threshold. With Tunnel Vision, draw a faint cone.
- Effort: M.

**28. Broken on touch: there is no dead zone, so "standing still" means lifting the finger.** `P.moving=ml>.05` (`js/game.js:855`) and the stick maps 50px to full deflection (`js/ui.js:171`), so 2.5px of thumb drift counts as moving and resets `P.still`. A resting thumb never earns Stand Your Ground, and it collects the "while moving" bonus of Storm Rider and Hit and Run without going anywhere. Add a dead zone of about 0.18 in the `pointermove` handler and rescale. Effort S.

**29. Nice: a second finger takes over the joystick.** `pointerdown` overwrites `joy.id` and the origin unconditionally (`js/ui.js:167`). A stray second touch re-centres the stick and the first finger stops steering. Ignore `pointerdown` while `joy.id!==null`. Effort S.

**30. Nice: enemy bullets are the same red as the most common enemy.** Bullets are `#ff4d6d` (`js/ui.js:278`) and grunts `#ff5d73` (`js/data.js:178`), an RGB distance of 17. In a crowd of grunts a 6px bullet is a small grunt. Give ordinary bullets a white core or a dark outline, and keep the white ring for armoured ones (`js/ui.js:279`) but make it thicker. Effort S.

**31. Nice: damage numbers are unformatted and cannot be turned off.** Every hit pushes `''+Math.round(d)` (`js/game.js:185,198`), up to 70 on screen. Late-game values are five and six raw digits stacked over the fight (`/tmp/billion-qol/desktop-06-play-5min-offer.png`, top-left). Use `fmt` above 9,999 and add a setting: all / crits and kills only / off. Effort S.

**32. Nice: the combo rules are invisible.** Taking a hit halves the combo (`js/game.js:322`), and the 3px yellow line under it is the 2.5s decay timer (`js/ui.js:402`). Neither is explained. High Roller's cost ("any hit resets your combo to zero") only makes sense once the normal rule is known. Flash the combo text red with "−50%" on a hit, and add a line to the explainer in item 7. Effort S.

**33. Nice: overtime is announced by one red word.** After the clear the timer gains "OVERTIME" (`js/ui.js:396`). Enemy health multiplies by four per minute, experience dries up and chests stop (`js/game.js:98,273,332`). Follow the "RUN CLEARED" banner with "OVERTIME: it only gets worse. Everything you earn is already banked." Effort S.

**34. Nice: mute has no indicator.** `M` flips `save.mute` (`js/ui.js:152`) and nothing on any screen shows the state. Add a speaker glyph by the timer for a second after toggling, and a persistent toggle on the pause screen and hub. Effort S.

### Feedback for statuses, combos and weapons

**35. Broken for colour-blind players, weak for everyone: statuses are a 2.5px ring in four light colours, one per enemy.** `js/ui.js:262-263`. Under simulated deuteranopia (Machado matrices; script in the Bash history, palette from `js/data.js:116`):

| Pair | RGB distance, normal vision | Deuteranopia | Protanopia |
|---|---|---|---|
| Poison `#b6ff5d` vs Shock `#ffe95d` | 76 | 6 | 11 |
| Shock ring vs gold elite body `#ffd23f` | 38 | 34 | 49 |

- Only the highest-priority status shows (burn > poison > shock > chill), so a chilled, shocked enemy looks only shocked. Frost progress toward freezing and poison stack count, the two things a build is trying to raise, are not shown.
- Affects: roughly one male player in twelve for the colour pair; everyone for stacks.
- Change: give each status a shape as well as a colour.
  - Burn: two or three rising orange particles (cheap; `parts` exists).
  - Poison: a dashed ring whose dash count or thickness grows with stacks.
  - Shock: a jagged ring.
  - Chill: a solid ring that thickens toward freezing.
  - Draw up to two at once at different radii. On the boss bar, draw small status glyphs with the poison stack count.
- Effort: M.

**36. Broken, and named in PLAN: mines are still hard to see working.** PLAN.md lists "Mines work but can't be seen working". The mine is a 9px `#3a4275` disc on a `#0c0e1a` field with a 3.5px blinking dot (`js/ui.js:296-299`). In `/tmp/billion-qol/desktop-17-mines-statuses.png` the seven mines around the player are the dimmest objects on screen. Nothing shows the 30px trigger distance (`js/game.js:593`) or the 95px blast (`js/game.js:560`) before it goes off.
- Change: lighter body with a 1px bright rim; a faint dashed ring at the blast radius once armed; a brief "×N" at the blast for enemies killed; a line from mine to mine when Chain Reaction fires (`js/game.js:604`).
- Effort: S to M.

**37. Nice: no way to see which weapon is carrying the run until the run is over.** Covered by item 9. The cheapest version is a thin bar under each weapon icon in the HUD row (`js/ui.js:425-432`) showing its share of `R.dmg`, smoothed. Effort S.

**38. Nice: damage from statuses is folded into the weapon that applied them** (`burnS`, `poisonS`, `frozenS`, `js/game.js:218,233,227`). That is right for "which weapon", but a player cannot tell whether Incendiary is earning its slot. Track a second tally by kind (direct, burn, poison, shatter, arc, combust) in `dealRaw`, `blastRaw` and `arc`, and show it as a second block on the pause and summary screens. Effort M.

**39. Nice: Spiked Bubble, Mirror and the revive blast are credited to nobody.** They pass `''` or `w:null` as the source (`js/game.js:318,319,326`), so they vanish from the breakdown. Credit them to a "Bubble" or "Revive" row. Effort S.

### Pause and build screen

**40. Broken: "End run and bank" ends the run on one click, directly under RESUME.** `js/ui.js:128,145` has no confirmation. On a phone the two buttons are 37px apart (`/tmp/billion-qol/portrait-08-pause.png`). Make it two-step: the first tap changes the label to "Really end the run? Tap again". Effort S.

**41. Nice: on a short screen RESUME is below the fold.** `/tmp/billion-qol/landscape-08-pause.png`: at 844x390 four weapons push the button off screen. It can be scrolled to, but nothing indicates that. Add a compact header row with Resume, a settings gear and End run at the top of the pause panel. Effort S.

**42. Nice: the Pause on level-up setting can only be changed from the hub** (`js/ui.js:86`), as a 12px underlined link. The moment a player wants it is mid-run. Offer it on the pause screen too. Effort S.

**43. Nice: "RESUME [esc]" and "RUN AGAIN [space]" show keyboard hints on touch devices** (`js/ui.js:77,127`). Hide `small` under `@media(pointer:coarse)`. Effort S.

### Death and summary

**44. Nice: death cuts straight to the hub.** `die()` waits 1.1 seconds and replaces the screen (`js/game.js:968`), so the player rarely sees what hit them. Hold the frozen frame half a second longer with "Killed by …" (needs the source label from item 9). Effort S with item 9.

**45. Nice: kills and combo are raw integers.** "26412 kills · max combo 8123" (`js/ui.js:68`, `docs/hub.png`). Use `toLocaleString()`. Effort S.

**46. Nice: the summary is not something to screenshot.** There are no weapon icons with mods, no cards, no spice level and no date. With the build recap from item 9, add a compact one-line build string ("🔥 Sawstorm · Implosion Tantrum · Carrier Black Hole + Pyromaniac") and a copy button. PLAN's goal is that a run "should be describable as a build", and this prints the description. Effort M.

**47. Nice: "NEW BEST" does not say by how much, and there is no best-time badge.** `pb` is points only (`js/game.js:973`). Show "NEW BEST (was 14.1M)" and a separate "LONGEST RUN" flag from `bestTime`. Effort S.

### Hub and shop

**48. Broken: the hub hides spice-gated unlocks until every points unlock is done.** `nextGoal` returns as soon as it finds a lifetime-points unlock (`js/ui.js:45`). A player at 1M is never told that beating the final boss opens spice, Spiked Bubble, Mirror and Overdrive. Show both lines: "Next at 1.50M: 😤 Bad Vibes" and "Beat the final boss: 🌶️ Spice, 🦔 Spiked Bubble, 🪩 Mirror, Overdrive". Effort S.

**49. Nice: there is no collection view.** Eleven weapons, about 50 mods and 24 cards exist; the hub shows only the single next unlock. A codex panel would show the content the rework created and give the lifetime thresholds a visible ladder: weapons with both evolutions, mods grouped by weapon, cards, and locked entries shown as "??? at 6.00M". Mark things as seen from `applyPick` into a small `save.seen` set. Effort M to L.

**50. Nice: shop cards do not show what you already have or what one more level gives.** "Fun Multiplier 12/20, +15% fun points" (`js/ui.js:82`). Print the running total: "+180% → +195%". Effort S.

**51. Nice: unaffordable, maxed and locked items all look the same** (45% opacity, `index.html:43`), and tapping one does nothing (`js/ui.js:111`).
- Give maxed items a tick and full opacity, with no price.
- Give locked items a padlock.
- On unaffordable items show "need 1.2M more".
- Give affordable items a gold left border, and sort them first or add a "can afford: 3" count by the bank.
- Effort: S.

**52. Nice: the shop cannot be used from the keyboard.** Items are `div`s with click handlers and no `tabindex` (`js/ui.js:81`). Make them `button`s. Effort S.

**53. Nice: the two spice arrows are 34x26px** (`.ghost.sm`, `index.html:38`; measured). "Reset all progress" is a 12px, 107x14px link directly beside the Pause on level-up toggle (`js/ui.js:86`). The `confirm()` protects the save, but the targets are well under a comfortable thumb size. Make the arrows 44px and move Reset into a settings section with spacing. Effort S.

**54. Nice: the save does not follow the player between devices.** The README says progress is saved in the browser, and the owner plays on a device other than the dev laptop. `server.js` solves this only on a local network. Add "Export save" and "Import save" (a base64 string of the `save` object, to the clipboard and a prompt). PLAN lists save export as "not in this pass". Effort S to M.
- Related: on GitHub Pages `REMOTE` is true (`js/core.js:32`), so every `persist()` fires a `PUT save` that I expect to fail with a 405. Harmless, but it is a failed request per purchase; gate it on the initial `GET save` succeeding. I did not test this against the live site.

**55. Nice: the shop comes before the instructions on a phone.** The help block is the last thing in the panel (`js/ui.js:84`), about sixteen cards down in portrait. Move the controls line directly under PLAY. Effort S.

### Controls and settings

**56. Nice: there is no settings surface.** The settings that exist are `M` (invisible) and one link. Add one small panel, shared by hub and pause, holding the items below. Effort M in total; each is S once the panel exists.
- **Volume.** All sound goes straight to `AC.destination` (`js/core.js:54`). Route through one `GainNode` and add a three-step control (off, low, full).
- **Reduce flash and shake.** Whole-screen white flashes reach 0.5 alpha (`js/game.js:282`) and 0.3 every six seconds for a whole run with Nuke (`js/game.js:670`). The red hurt wash is `js/ui.js:383` and shake reaches 30px (`js/ui.js:196`). One toggle that scales `R.flash`, `R.hurt` and `R.shake` by 0.25 in `render()`. Default it on when `matchMedia('(prefers-reduced-motion)')` matches.
- **Damage numbers** (item 31).
- **Pause on level-up** (item 42).
- **Fullscreen.** There is no fullscreen control, and landscape phones lose much of 390px to browser chrome. Add a button calling `document.documentElement.requestFullscreen()`, plus `apple-mobile-web-app-capable` and a web manifest so "Add to Home Screen" launches without chrome.

**57. Nice: no gamepad.** Movement is one vector (`js/game.js:851-852`), so adding `navigator.getGamepads()` to the same sum is small. Face buttons can map to picks 1 to 4, shoulders to reroll and banish, Start to pause. Effort M.

**58. Good as shipped, worth keeping:**
- Keys are read by physical position (`e.code`, `js/ui.js:149`), so WASD works unchanged on AZERTY and Dvorak.
- The numpad takes picks (`js/ui.js:156`), which suits arrow-key and left-handed players.
- The floating joystick works for either hand.
- Blur pauses the game (`js/ui.js:164`).
- Restart has a 400ms guard against a held key (`js/ui.js:153`).
- Remapping is not needed. Alternates for R, B and Tab on the right side of the keyboard (for example `,` `.` `/`) would finish the left-handed layout. Effort S.

**59. Nice: pinch and double-tap zoom on the DOM layers.** `user-scalable=no` (`index.html:6`) is, as far as I know, ignored by iOS Safari, and only the canvas has `touch-action:none` (`index.html:10`). Add `touch-action:manipulation` to `#tray` and `#ov`, and `-webkit-touch-callout:none` to `body`. Not verified on a device. Effort S.

**60. Nice: no safe-area handling.** The mod pips are drawn at `H-10` (`js/ui.js:430`) and the XP bar at y=0 (`js/ui.js:389`), where a phone's home indicator and notch sit. Add `viewport-fit=cover` and offset the HUD by `env(safe-area-inset-*)`, read once into JS. Not verified on a device. Effort S.

### Wording, numbers and terminology

**61. Descriptions that say less, or something different, than the code:**

| Text | Where | What the code does |
|---|---|---|
| Incendiary: "4% of max health a second" | `js/data.js:54` | 4% normal, 2.5% elites, 1% bosses (`js/game.js:733`), plus half the weapon's DPS |
| Frost: "chill and then freeze" | `js/data.js:55` | bosses never freeze (`js/game.js:223`) |
| Siphon: "Kills heal 1 HP" | `js/data.js:58` | only that weapon's kills, at most 8 a second (`js/game.js:268,861`) |
| Vampire: "Kills heal you" | `js/data.js:128` | 0.5 HP, at most 6 a second (`js/game.js:267,861`) |
| Heavy Boots: "enemies hit 30% softer" | `js/data.js:125` | contact only; bullets do full damage (`js/game.js:795,805`) |
| Mob Rule: "per enemy nearby" | `js/data.js:131` | counts everything within view distance (`js/game.js:738`); say "on screen" |
| Sniper / Brawler: "up close", "at long range" | `js/data.js:120-121` | 150/180px and 300px (`js/game.js:159-160`), shown nowhere (item 27) |
| Buzzkill: "and one more of them" | `js/data.js:24` | Sawstorm gets the extra blade too (`js/game.js:464`) |
| Dread: "simply die" | `js/data.js:33` | bosses take double damage instead (`js/game.js:500-501`) |
| Pyromaniac: "you lose 0.75 HP a second near fire" | `js/data.js:138` | cannot kill you; it stops at 1 HP (`js/game.js:798`) |
| Luck: "+8% crit chance" | `js/data.js:154` | crits are double damage, base chance 5% (`js/game.js:26,181`); neither is stated |

Effort S for the lot.

**62. Number formatting.**
- `fmt` (`js/core.js:13-18`) always shows three significant figures, so round prices read "2.00K FP", "5.00M FP", "1.00B". Strip trailing zeros.
- `fmt` floors before formatting, which caused the spice bug in item 4. Do not use it for multipliers.
- The top unit is "Q"; "Qa" is the usual abbreviation.

**63. Terminology drift.**
- "max HP" (`js/data.js:125,141,151`) versus "max health" (`js/data.js:54,126`).
- "rate", "attack rate" and "fire rate" (`js/data.js:60,149,8`) for the same stat.
- "size and area", "radius" and "blast" for area.
- Numbers as "×1.15" in Training and "+10%" in the shop, for effects that stack differently. This distinction is useful; keep it, but explain "Stacks multiply" once.
- Mod descriptions end with a full stop; cost lines and card gains do not, except Bubble's.

**64. README, PLAN and game disagree.**
- The README calls Training "small permanent stat bumps"; they last one run. The shop is the permanent layer.
- The README controls table omits Space/Enter (start), the numpad and the 1 to 9 range.
- The hub help says three mods evolve a weapon (`js/ui.js:85`); README and code say rank 3 and three mods; the PLAN body still says "at least two mods".
- PLAN says "Chests still pause, since they are a reward moment"; in the game they do not (`js/game.js:937`). A chest pick pausing is worth reconsidering: it is rare and earned.
- PLAN's card table has older costs than `js/data.js` throughout. Add a line at the top of PLAN: "numbers below are the original proposal; `js/data.js` is current."
- `ELEMENTS[..].name` (Burn, Chill, Poison, Shock; `js/data.js:116`) is never displayed. The README says fire, frost, venom and shock; mods are Incendiary, Frost, Venom and Voltaic. Pick one set of four status names and use it in descriptions and the explainer.

**65. Small wording.**
- "blows 50% harder" (`js/data.js:110`) → "explodes 50% harder".
- "Half again as large" (`js/data.js:32`) → "+50% radius", matching the numeric style elsewhere.
- Cluster Bombs' description (`js/data.js:28`) is the longest in the game and runs to six lines on a 150px phone card: "+1 rocket. Every blast throws out four smaller ones."
- Wide Arc (`js/data.js:85`): "Flies a wide loop out through the target and back. +30% damage."
- Overdrive: "Fuel for the spice ladder." (`js/data.js:174`) is flavour in a field that is otherwise mechanical, and it wraps the card to a taller row than its neighbours (`/tmp/billion-qol/desktop-01-hub-fresh.png`).

---

## Quick wins (all S, doable in one sitting)

Ordered by benefit.

1. Correct the rank-up text from `RANK_DM` (item 4, `js/ui.js:11`).
2. Fix the spice multiplier display and add enemy damage (item 4, `js/ui.js:76`).
3. Replace "Clear spice 0" with "Beat the final boss" (item 4, `js/ui.js:49,83`).
4. Keep the tray visible and usable while paused (item 3, `js/ui.js:23,161`).
5. Add a 350ms arming delay in `takePick` (items 2 and 14, `js/game.js:940`).
6. Add `@media(max-height:500px){.tc{width:150px}}` and a scrollable, compact loadout modal (items 2 and 6, `index.html:66,90`).
7. Make Reroll and Banish tappable buttons in the tray header (item 1, `js/ui.js:27-32`).
8. Draw the HP number and revive hearts (items 22 and 23, `js/ui.js:393`).
9. Add a boss arrow and chest arrow by copying the piggy block (items 24 and 25, `js/ui.js:415`).
10. In ban mode, dim what cannot be banished and say that B cancels (item 12).
11. Two-step "End run" (item 40, `js/ui.js:145`).
12. Fix the help line to "rank 3 and three mods" and add touch wording (items 8 and 10, `js/ui.js:84-85`).
13. Show both the next points unlock and the next clear unlock (item 48, `js/ui.js:41-51`).
14. Show best run and longest time on the hub (item 9; `save.best` and `save.bestTime` already exist).
15. Filter Oversized and Concussive from weapons they do not affect (item 11, `js/game.js:871`).
16. Add a joystick dead zone and ignore a second finger (items 28 and 29, `js/ui.js:165-174`).
17. Give enemy bullets a white core (item 30, `js/ui.js:278`).
18. Brighten mines and add a blast-radius ring (item 36, `js/ui.js:296-299`).
19. Use `toLocaleString` for kills and combo; `fmt` for big damage numbers; strip trailing zeros in prices (items 31, 45, 62).
20. Raise the mod tag to 12px and give the tray header a background (items 15 and 17, `index.html:67,78`).
21. Add card slot counts and "takes no slot" on card options (item 16, `js/ui.js:19`).
22. Explain reroll and banish in the shop text (item 13, `js/data.js:165-166`).
23. Add `touch-action:manipulation` on `#tray` and `#ov`; hide `[space]`/`[esc]` hints on coarse pointers (items 43 and 59).
24. Apply the description corrections in the table under item 61.
