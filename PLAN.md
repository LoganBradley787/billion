# Upgrade rework plan

Branch: `upgrade-rework`. `main` stays as the playable game until this is ready.

## Why

Feedback from the 2026-10-06 play session, in order of weight:

1. **No builds.** Every upgrade is "same weapon, bigger number". Nothing conflicts, passives are minor,
   rerolls are pointless because no option is ever wrong. After two runs every weapon has been seen.
2. **Dominant means idle.** Saturn + Supernova reached a 29,500 combo standing still.
3. **Economy.** A fresh save earned 118M, 477M, then 3.3B. The shop was bought out after run one.
4. **Level-ups interrupt.** Late game the screen pauses every few seconds.
5. **Evolutions arrive too early** (Death Ray at 1:43) and are gated by a passive, not a choice.
6. **Several weapons have no role** (Laser falls off, Rockets and Zap feel useless, Mines work but can't be seen working, Money Printer is a reskinned Minigun).

Goal: a run should be describable as a build ("fire saw into black hole"), two runs with the same
weapons should play differently, and some choices should be wrong for the build you have.

## The new shape of a run

| | Now | After |
|---|---|---|
| Picks by 12:00 | 100+ | about 38 |
| What a pick is | +1 level on a fixed path | a weapon, a mod, a rank, an evolution or a card |
| Weapon growth | levels 1-6, then evolve if you hold a passive | ranks 1-3, three mod slots, then choose one of two evolutions |
| Passives | nine flat stat bumps | cards with a cost, five slots |
| Choosing | game pauses | tray at the bottom, game keeps running |

Budget for one fully built weapon: acquire (1) + two ranks (2) + three mods (3) + evolution (1) = 7 picks.
Four weapons = 28, plus about 8 cards and stat picks = 36 to 40. You cannot finish everything, so going
deep on two weapons versus wide on four is a real decision. After the final boss, overclocks continue as now.

Offer rules: three options per pick (a shop upgrade adds a fourth). At most one "new weapon" per offer.
Mods are only offered for weapons you own with a free slot. An evolution is offered once a weapon is
rank 3 with at least two mods, and always shows both forms side by side.

## Status effects

Four statuses, applied by mods. A weapon can carry one element at most, so the element is a choice.

| Status | Effect | Good for |
|---|---|---|
| **Burn** | 25% of the hit's damage per second for 3s. Spreads to any enemy touching a burning one. | packed crowds |
| **Chill** | 30% slow for 2s. Three chills in 2s freezes for 1.5s. A frozen enemy that dies shatters, hitting neighbours for 25% of its max health. | control, chain kills |
| **Poison** | Stacks without limit up to 30. Each stack deals 5% of the hit's damage per second until death. | bosses, tanks |
| **Shock** | The next hit from any weapon arcs to two nearby enemies for 40%. | fast weapons |

Bosses: chill slows 15% and never freezes; poison caps at 15 stacks.

Reactions (the part that creates combos and conflicts):

- **Burn + Poison = Combust.** Poison stacks are consumed in an explosion, 10% of hit damage per stack.
- **Shock + Frozen = Shatter now.** The enemy shatters without having to die first.
- **Burn + Chill cancel.** Each removes the other. Mixing fire and ice is a mistake.

## Universal mods (fit any weapon)

| Mod | Effect | Cost |
|---|---|---|
| Incendiary | applies Burn | |
| Frost | applies Chill | |
| Venom | applies Poison | |
| Voltaic | applies Shock | |
| Siphon | kills heal 1 HP, max 8 per second | -15% damage |
| Concussive | double knockback | |
| Heavy | +70% damage | -35% rate |
| Rapid | +50% rate | -25% damage |
| Oversized | +35% area or projectile size | -20% damage |

## Weapons: role, own mods, two evolutions

Each weapon gets a defined job. "A / B" are the two evolutions.

**Pea Shooter** (reliable single target, the status applier)
- Split Shot: +2 projectiles in a fan, each -25% damage
- Ricochet: bullets bounce to two more enemies
- Hollow Point: +100% damage to enemies above 80% health
- Evolutions: **Minigun** (five times the rate, applies statuses constantly) / **Railgun** (one shot every 1.2s that pierces everything)
- Fix: odd/even fan so the centre shot always aims at the target

**Moons** (close defence, eats bullets)
- Second Ring: an outer ring at half damage
- Bumper: triple knockback, -30% damage
- Grinder: hits twice as often, orbit 25% tighter
- Mirror Orbs: bullets are reflected as your projectiles
- Evolutions: **Saturn** (a near-solid wall) / **Comets** (orbs launch at enemies and return)
- Fix: area must add orbs as the orbit widens, so the wall never opens gaps

**Tantrum** (burst around you)
- Aftershock: a second, weaker wave
- Implosion: pulls enemies in instead of pushing
- Focused: half radius, double damage
- Flinch: also fires whenever you are hit or a bubble pops
- Evolutions: **Supernova** (bigger and faster) / **Earthquake** (leaves a field for 3s that applies your statuses)

**Zap** (chains, spreads statuses)
- Fork: each chain splits in two
- Overload: enemies killed by Zap explode
- Conductor: chains seek enemies with a status, +50% damage to them
- Storm Rider: +60% rate while moving, -40% while still
- Evolutions: **Thunderstorm** (many strikes across the screen) / **Tesla Coil** (constant arcs to the three nearest)

**Sawblade** (piercing line)
- Twin: a second blade thrown the opposite way
- Lodged: stops at max range and spins in place for 2s
- Wide Arc: curves out and back in a loop
- Serrated: applies its status twice per hit
- Evolutions: **Buzzkill** (huge blades) / **Sawstorm** (blades never return, they bounce around the screen)

**Rockets** (homing area damage)
- Big One: one rocket, triple damage and radius, double cooldown
- Carpet: no homing, fired where you face, +100% blast
- Seeker: targets the highest-health enemy, +50% to elites and bosses
- Evolutions: **Cluster Bombs** / **Nuke** (one screen-shaking blast every 6s)
- Fix: base blast radius and damage up; currently 3% of damage in real runs

**Bad Vibes** (aura, the support weapon)
- Leech: heals 0.3 HP per second per enemy inside, capped
- Intensify: damage ramps the longer an enemy stays inside
- Weaken: enemies inside take +20% damage from everything
- Repel: constant push outward
- Evolutions: **Menace** (larger, 60% slow) / **Dread** (enemies inside below 15% health die)

**Black Hole** (control)
- Carrier: applies every status you own to everything inside
- Sticky: 50% slow for 3s after it ends
- Spaghettify: damage scales with how many are inside
- Event Horizon: larger and longer
- Evolutions: **Singularity** (collapses in an explosion) / **Pet Hole** (a smaller one orbits you permanently)
- Fix: always opens on the densest cluster near you, not a random enemy

**Laser** (boss killer)
- Rework: locks on, damage ramps the longer it holds, 0.5s delay to retarget. Highest single-target damage in the game.
- Painter: the target takes +30% from your other weapons
- Focus Lens: ramps twice as fast
- Prism: splits into two half-strength beams at the target
- Overheat: +100% damage, shuts off 1s in every 4
- Evolutions: **Death Ray** (wide, pierces everything) / **Lance** (triple damage to elites and bosses)

**Mines** (traps)
- Rework: lobbed toward the nearest cluster instead of dropped underfoot; bigger, clearer blasts
- Chain Reaction: a blast sets off nearby mines, each +25%
- Bait: mines attract enemies
- Sticky: attaches to the first enemy that touches it
- Evolutions: **Minefield** / **Sentries** (mines shoot until they detonate)

**Money Printer** (secret, the economy weapon)
- Rework: damage scales with your combo, visibly (bills get bigger)
- Tips: kills drop coins worth fun points
- Counterfeit: +2 bills, each kill pays 10% less
- Evolution: single form, **The Mint**

## Cards

Five slots. Every card has a cost. This is where sniper, brawler and glass-cannon builds come from.

| Group | Card | Gain | Cost |
|---|---|---|---|
| Range | Sniper | +60% damage beyond 320px | -40% within 160px |
| | Brawler | +60% within 160px | -40% beyond 320px |
| | Tunnel Vision | +50% in the direction you face | -50% behind you |
| Movement | Stand Your Ground | +40% damage, +30% rate while still | -20% damage while moving |
| | Hit and Run | +40% rate while moving | -30% while still |
| | Heavy Boots | +80 HP, contact damage -30% | -25% move speed |
| Risk | Glass Cannon | +70% damage | -50% max health |
| | Berserk | up to +100% damage as health drops | no regeneration |
| | Vampire | kills heal | hearts heal half |
| | Blood Price | +1 option on every pick | each pick costs 8 HP |
| Crowd | Ringleader | +30% experience | +30% more enemies |
| | Mob Rule | +2% damage per enemy on screen, max 60% | -30% to bosses |
| | Giant Slayer | +100% to elites and bosses | -25% to everything else |
| | Magnetic | pickup range doubled | enemies move 15% faster toward you |
| Shape | One-Trick | +100% damage on your first weapon | max two weapons |
| | Arsenal | +1 weapon slot | every weapon -15% |
| | Elementalist | statuses last twice as long | -25% direct damage |
| | Cold Blooded | frozen enemies take double | you move 15% slower |
| | Pyromaniac | burn spreads twice as far | burning enemies near you hurt you |
| Defence | Bubble | blocks a hit, recharges | (existing) |
| | Spiked Bubble | a popped bubble explodes | recharge 50% slower |
| | Mirror | bubble reflects bullets | one fewer charge |
| Economy | Greed | +40% fun points | enemies +20% health |
| | High Roller | combo cap tripled | any hit resets combo to zero |

## Builds this makes possible

1. **Firestorm.** Incendiary Sawblade, Implosion Tantrum to pack them together, Carrier Black Hole to light everything inside, Pyromaniac. Weak to bosses.
2. **Sniper.** Railgun, Lance Laser with Painter, Sniper card, Sticky Black Hole to hold them at range. Dies if anything gets close.
3. **Fortress.** Saturn with Bumper, Bad Vibes with Weaken and Leech, Brawler, Stand Your Ground, Spiked Bubble. Slow experience gain because nothing dies far away.
4. **Cryo-shatter.** Frost Minigun, Earthquake Tantrum, Conductor Zap to shatter frozen packs, Cold Blooded.
5. **Plague.** Venom Minigun stacking poison, Incendiary Rockets to Combust the stacks, Giant Slayer. The boss melter.
6. **Trapper.** Bait Mines with Chain Reaction, Black Hole, Hit and Run. You kite and the map does the work.
7. **One-Trick.** One-Trick card, Minigun with Split Shot, Ricochet and Voltaic. One weapon doing everything.
8. **Glass storm.** Fork and Overload Zap, Glass Cannon, Ringleader, Mob Rule. Clears the screen, dies to one hit.
9. **Tycoon.** Money Printer with Tips, Greed, High Roller. Weak run, enormous payout.

Wrong picks now exist: Frost on a fire build, Sniper with Moons, Stand Your Ground with Storm Rider.

## Level-up tray

- Picks queue in a tray at the bottom of the screen; the game does not pause.
- 1 / 2 / 3 picks, R rerolls, a badge shows how many picks are waiting.
- Holding Tab slows time to 25% for reading. Chests still pause, since they are a reward moment.
- Rerolls matter again, so the shop's reroll upgrade becomes worth buying.

## Economy

| | Now | Target |
|---|---|---|
| Fresh first run | 118M | 20K to 80K |
| First clear | 118M to 477M | 2M to 5M |
| Maxed spice-0 clear | 500M to 1B | 40M to 60M |
| Clears to reach a billion | 2 to 3 | roughly 15, or fewer by climbing spice |

- Flatten the time multiplier and the fun-point curve; the shop multiplier stays the main lever.
- Combo: no cap, but logarithmic (x2 at 50, x4 at 500, x6 at 5,000), so a long streak still counts.
- Spice: 2.0 times health per level instead of 2.5, so level 3 is a step and not a cliff.
- Shop adds meta unlocks that are not percentages: a fourth option per pick, a sixth card slot, banish.
- New mods and cards unlock over lifetime points and by feats ("clear with two weapons"), so there is
  something new for many more runs.

## Small fixes that ride along

- Progress bar: replace the log bar with milestone ticks (1M, 10M, 100M, 1B) and a linear fill between them.
- Piggy bank: pink, with an off-screen arrow, and the reward stated when caught.
- In-run slot counter ("weapons 3/5, cards 2/5").
- Swarm banners stop once swarms no longer threaten you.
- Final boss: bullets that survive Moons and Tantrum (a few armoured shots), less contact damage.
- Base pickup range up 30%, so Magnet stops being mandatory.
- Tantrum and Rockets get a stronger first rank.

## Code plan

Everything stays in one `index.html`. The combat core is restructured so content is data:

- `hit(e, dmg, src)` becomes a pipeline: card modifiers (range, movement, target type), then weapon mods, then status application, then reactions.
- Enemies carry a small status block (`burn`, `chill`, `poison`, `shock`) ticked in `updateEnemies`.
- Weapons become `{id, rank, mods[], evo}`. Each mod is a data entry with optional hooks: `stats(w)`, `onHit`, `onKill`, `onFire`.
- Cards are data entries with `apply(P)` and optional hooks into the hit pipeline.
- Offer generation moves to one function with weights and rules, so banish and a fourth option are trivial.
- Save key moves to v3 (a wipe). Shop levels cannot carry over because the economy is rebased.

The bot simulator moves into the repo as `tools/sim.js` with scripted builds, so each of the nine builds
above can be run to check clear rate, time to first evolution and earnings against the targets.

## Phases

1. **Engine.** Hit pipeline, statuses and reactions, weapon ranks and mod slots, tray, new XP curve, economy rebase. Universal mods only. Playable.
2. **Weapons.** Own mods and both evolutions for all eleven, plus the Laser, Mines, Black Hole and Money Printer reworks.
3. **Cards.** All cards, slot counter, shop changes, unlock feats.
4. **Tune.** Simulate the nine builds, then hand-play. Fix the small items.

Each phase ends playable. To try the branch without touching the live game, publish it under
`/billion/next/` alongside the current one.

## Not in this pass

- diep.io-style classes (a class picked at level 10 that bends the run). Better added once mods exist.
- Music, save export, daily seeded runs.

## Open questions

- Is a second save wipe acceptable? (Assumed yes.)
- Should the tray be the only mode, or should "pause on level-up" stay as a setting?
- Card slots: five feels right on paper; may need four to keep choices tight.
