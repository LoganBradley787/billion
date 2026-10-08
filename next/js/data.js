'use strict';
// Everything a run can offer is declared here as data; js/game.js gives it behaviour.
// unlock: lifetime points needed. need: spice levels cleared. secret: only past the goal.

const WEAPONS={
  blaster:{name:'Pea Shooter',icon:'🔫',role:'Reliable single target',desc:'Fires at the nearest enemy.',
    mods:['split','ricochet','hollow'],
    evo:[{name:'Minigun',desc:'Five times the fire rate. Applies statuses constantly.'},
         {name:'Railgun',desc:'One huge shot that pierces everything in its path.'}]},
  orbit:{name:'Moons',icon:'🪐',role:'Close defence',desc:'Orbs circle you, smack anything close and eat enemy bullets.',
    mods:['ring2','bumper','grinder','mirrororb'],
    evo:[{name:'Saturn',desc:'Twice the orbs: a near-solid wall.'},
         {name:'Comets',desc:'Your orbs break off to slam into distant crowds, burst there and fly home.'}]},
  nova:{name:'Tantrum',icon:'💥',role:'Burst around you',desc:'A shockwave bursts out around you and wipes enemy bullets.',
    mods:['after','implode','focus','flinch'],
    evo:[{name:'Supernova',desc:'Bigger, harder, twice as often.'},
         {name:'Earthquake',desc:'Each wave leaves a field that applies every status you own.'}]},
  lightning:{name:'Zap',icon:'⚡',role:'Chains through crowds',unlock:5e3,desc:'Lightning strikes and chains between enemies.',
    mods:['fork','overload','conductor','storm'],
    evo:[{name:'Thunderstorm',desc:'Three more strikes every time.'},
         {name:'Tesla Coil',desc:'Constant arcs to the three nearest enemies.'}]},
  saw:{name:'Sawblade',icon:'🪚',role:'Piercing line',unlock:4e4,desc:'A blade flies out through the nearest enemy and comes back, cutting everything.',
    mods:['twin','lodged','arc','serr','vortex'],
    evo:[{name:'Buzzkill',desc:'Huge blades, and one more of them.'},
         {name:'Sawstorm',desc:'Blades never return. They bounce around the screen.'}]},
  rocket:{name:'Rockets',icon:'🚀',role:'Homing explosions',unlock:25e4,desc:'Homing rockets that explode on whatever is closest to you.',
    mods:['bigone','carpet','seeker'],
    evo:[{name:'Cluster Bombs',desc:'Every blast throws out four more, each half as strong.'},
         {name:'Nuke',desc:'One enormous blast every six seconds.'}]},
  aura:{name:'Bad Vibes',icon:'😤',role:'Support aura',unlock:15e5,desc:'Everything near you gets hurt and slowed.',
    mods:['leech','intens','weaken','repel'],
    evo:[{name:'Menace',desc:'Half again as large, and a much heavier slow.'},
         {name:'Dread',desc:'Enemies inside below 15% health simply die.'}]},
  hole:{name:'Black Hole',icon:'🕳️',role:'Crowd control',unlock:6e6,desc:'Opens on the thickest crowd, drags it in and grinds it up.',
    mods:['carrier','sticky','spag','horizon'],
    evo:[{name:'Singularity',desc:'Each hole collapses in a huge explosion.'},
         {name:'Pet Hole',desc:'A second, smaller hole orbits you forever.'}]},
  laser:{name:'Laser',icon:'🔦',role:'Boss killer',unlock:2e7,desc:'Locks onto one enemy and burns hotter the longer it holds. Slow to switch targets.',
    mods:['painter','lens','prism','overheat'],
    evo:[{name:'Death Ray',desc:'The beam pierces everything in line.'},
         {name:'Lance',desc:'Hunts the toughest enemy. Triple damage to elites and bosses.'}]},
  mine:{name:'Mines',icon:'🧨',role:'Traps',unlock:6e7,desc:'Lobs mines at the nearest crowd.',
    mods:['chain','bait','stickym'],
    evo:[{name:'Minefield',desc:'Three more mines per throw, bigger blasts.'},
         {name:'Sentries',desc:'Mines shoot at enemies until they go off.'}]},
  money:{name:'Money Printer',icon:'💸',role:'Pays you',secret:true,desc:'Sprays bills that cut through everything. Bills grow with your combo.',
    mods:['tips','counterfeit'],
    evo:[{name:'The Mint',desc:'More bills, faster, bigger.'}]},
};

// el: applies a status. not: can't share a weapon with that mod. cost: the downside, shown in red.
// Every mod also adds MOD_DMG damage to its weapon, so no pick is ever a pure sidegrade.
const MODS={
  burn:{name:'Incendiary',icon:'🔥',el:'burn',desc:'Hits ignite. Fire eats 4% of max health a second and spreads between touching enemies.'},
  chill:{name:'Frost',icon:'❄️',el:'chill',unlock:2e4,desc:'Hits chill and then freeze. Frozen enemies shatter when killed.'},
  poison:{name:'Venom',icon:'☠️',el:'poison',unlock:2e5,desc:'Hits stack poison. Great against anything tough.'},
  shock:{name:'Voltaic',icon:'🌩️',el:'shock',unlock:2e6,desc:'Shocked enemies arc your next hit to two neighbours.'},
  siphon:{name:'Siphon',icon:'🩸',desc:'Kills heal 1 HP.'},
  conc:{name:'Concussive',icon:'🥊',desc:'Double knockback.'},
  heavy:{name:'Heavy',icon:'🏋️',desc:'+80% damage.',cost:'-20% rate',not:'rapid'},
  rapid:{name:'Rapid',icon:'💨',desc:'+60% rate.',cost:'-10% damage',not:'heavy'},
  big:{name:'Oversized',icon:'🎈',desc:'+35% size and area.'},

  split:{name:'Split Shot',icon:'🔱',desc:'+2 projectiles in a fan.',cost:'-15% damage each'},
  ricochet:{name:'Ricochet',icon:'🎱',desc:'Bullets bounce to two more enemies.'},
  hollow:{name:'Hollow Point',icon:'🎯',desc:'Double damage to enemies above 80% health.'},

  ring2:{name:'Second Ring',icon:'⭕',desc:'An outer ring of orbs at half damage.'},
  bumper:{name:'Bumper',icon:'🎳',desc:'Triple knockback.'},
  grinder:{name:'Grinder',icon:'⚙️',desc:'Orbs hit twice as often.',cost:'orbit 25% tighter'},
  mirrororb:{name:'Mirror Orbs',icon:'🪞',desc:'Eaten bullets are fired back.'},

  after:{name:'Aftershock',icon:'〰️',desc:'A second, weaker wave follows each one.'},
  implode:{name:'Implosion',icon:'🌀',desc:'Pulls enemies in and stuns them for a second. +40% damage.'},
  focus:{name:'Focused',icon:'🔍',desc:'Double damage.',cost:'-30% radius'},
  flinch:{name:'Flinch',icon:'😖',desc:'Also fires whenever you are hit or a bubble pops.'},

  fork:{name:'Fork',icon:'🍴',desc:'Chains hit twice as many enemies and reach further.'},
  overload:{name:'Overload',icon:'💢',desc:'Enemies killed by Zap explode.'},
  conductor:{name:'Conductor',icon:'🧲',desc:'Strikes seek enemies with a status and hit them 50% harder.'},
  storm:{name:'Storm Rider',icon:'🏃',desc:'+60% rate while moving.',cost:'-15% rate while still'},

  twin:{name:'Twin',icon:'♊',desc:'A second blade is thrown the opposite way.'},
  lodged:{name:'Lodged',icon:'📌',desc:'The blade stops at full range and spins in place for 2 seconds.'},
  arc:{name:'Wide Arc',icon:'🪃',desc:'Thrown like a boomerang: a wide loop out through the target and back to you. +30% damage.'},
  serr:{name:'Serrated',icon:'🦷',desc:'Blades hit twice as often.'},
  vortex:{name:'Vortex',icon:'🌪️',desc:'Blades drag nearby enemies into themselves.'},

  bigone:{name:'Big One',icon:'🎆',desc:'One rocket with triple damage and double blast.',cost:'-40% rate'},
  carpet:{name:'Carpet',icon:'🛬',desc:'Fired fast and straight at the nearest enemy. +40% blast radius.',cost:'no homing'},
  seeker:{name:'Seeker',icon:'🦈',desc:'Targets the toughest enemy. +50% to elites and bosses.'},

  leech:{name:'Leech',icon:'🧛',desc:'Heals you for every enemy inside.'},
  intens:{name:'Intensify',icon:'📈',desc:'Damage ramps the longer an enemy stays inside.'},
  weaken:{name:'Weaken',icon:'🫠',desc:'Enemies inside take +20% damage from everything.'},
  repel:{name:'Repel',icon:'🚫',desc:'Constantly pushes enemies outward.'},

  carrier:{name:'Carrier',icon:'🦠',desc:'Applies every status you own to everything inside.'},
  sticky:{name:'Sticky',icon:'🍯',desc:'Enemies stay 50% slowed for 3 seconds after it closes.'},
  spag:{name:'Spaghettify',icon:'🍝',desc:'More damage the more enemies are inside.'},
  horizon:{name:'Event Horizon',icon:'🌌',desc:'Larger and longer lasting.'},

  painter:{name:'Painter',icon:'🖌️',desc:'The target takes +30% from your other weapons.'},
  lens:{name:'Focus Lens',icon:'🔎',desc:'Reaches full heat twice as fast.'},
  prism:{name:'Prism',icon:'🔺',desc:'Splits to two nearby enemies at half strength.'},
  overheat:{name:'Overheat',icon:'🥵',desc:'Double damage.',cost:'shuts off 1 second in every 4'},

  chain:{name:'Chain Reaction',icon:'⛓️',desc:'A blast sets off nearby mines, each 25% stronger.'},
  bait:{name:'Bait',icon:'🧀',desc:'Mines lure enemies toward them.'},
  stickym:{name:'Sticky Mines',icon:'🩹',desc:'Sticks to the first enemy it touches and blows 50% harder.'},

  tips:{name:'Tips',icon:'🪙',desc:'Kills by bills pay 25% more.'},
  counterfeit:{name:'Counterfeit',icon:'🖨️',desc:'+2 bills.',cost:'all kills pay 10% less'},
};
const UNIVERSAL=['burn','chill','poison','shock','siphon','conc','heavy','rapid','big'];
const ELEMENTS={burn:{name:'Burn',col:'#ff8a3f'},chill:{name:'Chill',col:'#9fe8ff'},poison:{name:'Poison',col:'#b6ff5d'},shock:{name:'Shock',col:'#ffe95d'}};

// max: can be taken that many times. req: needs that card first. free: takes no slot.
const CARDS={
  sniper:{name:'Sniper',icon:'🔭',gain:'+60% damage at long range',cost:'-15% up close',not:'brawler'},
  brawler:{name:'Brawler',icon:'👊',gain:'+60% damage up close',cost:'-15% at long range',not:'sniper'},
  tunnel:{name:'Tunnel Vision',icon:'👁️',unlock:5e4,gain:'+50% damage the way you face',cost:'-20% behind you'},
  stand:{name:'Stand Your Ground',icon:'🗿',gain:'+40% damage and +30% rate while still',cost:'-10% damage while moving',not:'hitrun'},
  hitrun:{name:'Hit and Run',icon:'💃',gain:'+40% rate while moving',cost:'-15% rate while still',not:'stand'},
  boots:{name:'Heavy Boots',icon:'🥾',unlock:5e4,gain:'+80 max HP, enemies hit 30% softer',cost:'-12% move speed'},
  glass:{name:'Glass Cannon',icon:'🍸',gain:'+70% damage',cost:'-30% max health'},
  berserk:{name:'Berserk',icon:'😡',unlock:5e4,gain:'Up to +100% damage as your health drops',cost:'half regeneration'},
  vampire:{name:'Vampire',icon:'🦇',gain:'Kills heal you',cost:'hearts heal half'},
  blood:{name:'Blood Price',icon:'💉',need:2,gain:'+1 option on every pick',cost:'each pick costs 5 HP'},
  ring:{name:'Ringleader',icon:'🎪',gain:'+30% experience',cost:'+20% more enemies'},
  mob:{name:'Mob Rule',icon:'👥',unlock:5e5,gain:'+2% damage per enemy nearby, up to +60%',cost:'-15% to bosses'},
  giant:{name:'Giant Slayer',icon:'🗡️',gain:'Double damage to elites and bosses',cost:'-10% to everything else'},
  magnetic:{name:'Magnetic',icon:'🧲',unlock:5e5,gain:'Double pickup range',cost:'enemies move 8% faster'},
  onetrick:{name:'One-Trick',icon:'🃏',unlock:3e6,gain:'Double damage on your first weapon',cost:'two weapons at most',ok:()=>Object.keys(P.weapons).length<=2},
  arsenal:{name:'Arsenal',icon:'🧰',unlock:5e5,gain:'+1 weapon slot',cost:'every weapon -8% damage',not:'onetrick'},
  elemental:{name:'Elementalist',icon:'🧪',unlock:3e6,gain:'Statuses last twice as long and hit 50% harder',cost:'-15% direct damage'},
  cold:{name:'Cold Blooded',icon:'🥶',unlock:15e6,gain:'Frozen enemies take double damage',cost:'you move 8% slower'},
  pyro:{name:'Pyromaniac',icon:'🧯',unlock:15e6,gain:'Fire spreads much further',cost:'you lose 0.75 HP a second near fire'},
  bubble:{name:'Bubble',icon:'🫧',max:3,gain:'Blocks a hit, then recharges. Take again for more charges.'},
  spiked:{name:'Spiked Bubble',icon:'🦔',need:1,req:'bubble',free:true,gain:'A popped bubble explodes',cost:'recharges 50% slower'},
  mirror:{name:'Mirror',icon:'🪩',need:1,req:'bubble',free:true,gain:'A popped bubble fires a ring of shots',cost:'-25 max HP'},
  greed:{name:'Greed',icon:'🤑',gain:'+50% fun points',cost:'enemies have 12% more health'},
  roller:{name:'High Roller',icon:'🎰',need:2,gain:'Combo multiplier +50%',cost:'any hit resets your combo to zero'},
};

// small filler picks; these never run out, so a long run always has something to take
const TRAIN={
  might:{name:'Damage',icon:'💪',desc:'×1.15 all damage. Stacks multiply.'},
  haste:{name:'Tempo',icon:'☕',desc:'+10% attack rate.',cap:12},
  area:{name:'Reach',icon:'📐',desc:'+10% area.',cap:8},
  vigor:{name:'Health',icon:'❤️',desc:'+25 max HP and heal 40.'},
  speed:{name:'Legs',icon:'👟',desc:'+6% move speed.',cap:6},
  regen:{name:'Snacks',icon:'🍪',desc:'+0.6 HP per second.',cap:6},
  crit:{name:'Luck',icon:'🍀',desc:'+8% crit chance.',cap:6},
};

// g: how fast each level's price grows
const META=[
  {id:'greed',name:'Fun Multiplier',desc:'+15% fun points',max:20,cost:200,g:1.85},
  {id:'might',name:'Sharper Fun',desc:'+10% damage',max:10,cost:300,g:2.3},
  {id:'hp',name:'Thicker Skin',desc:'+15 max HP',max:10,cost:250,g:2.3},
  {id:'xp',name:'Fast Learner',desc:'+4% experience',max:10,cost:500,g:2.3},
  {id:'speed',name:'Fresh Legs',desc:'+4% move speed',max:5,cost:2e3,g:3.5},
  {id:'magnet',name:'Sticky Fingers',desc:'+20% pickup range',max:5,cost:1500,g:3.5},
  {id:'reroll',name:'Second Opinions',desc:'+1 reroll per run',max:5,cost:5e3,g:3.5},
  {id:'banish',name:'Hard Pass',desc:'+1 banish per run',max:3,cost:1e5,g:5},
  {id:'head',name:'Head Start',desc:'Start with +1 pick',max:3,cost:4e4,g:5},
  {id:'revive',name:'Not Today',desc:'+1 revive per run',max:2,cost:3e5,g:10},
  {id:'pickw',name:'Loadout',desc:'Choose your starting weapon',max:1,cost:4e5},
  {id:'opt4',name:'Fourth Option',desc:'+1 option on every pick',max:1,cost:5e6},
  {id:'cslot',name:'Sixth Card',desc:'+1 card slot',max:1,cost:8e6},
  {id:'wslot',name:'Fifth Weapon',desc:'+1 weapon slot',max:1,cost:12e6},
  {id:'wslot2',name:'Sixth Weapon',desc:'+1 weapon slot',max:1,cost:6e7,need:4},
  {id:'over',name:'Overdrive',desc:'+6% damage, no limit. Fuel for the spice ladder.',max:999,cost:2e6,g:1.5,need:1},
];

const ET={
  grunt:{r:12,hp:12,spd:70,dmg:8,xp:1,fp:5,col:'#ff5d73',sides:0},
  runner:{r:9,hp:8,spd:150,dmg:6,xp:1,fp:6,col:'#ffb347',sides:3},
  tank:{r:20,hp:90,spd:45,dmg:16,xp:5,fp:30,col:'#b06cff',sides:4},
  splitter:{r:16,hp:40,spd:65,dmg:10,xp:2,fp:15,col:'#5de0a0',sides:6},
  mini:{r:8,hp:10,spd:125,dmg:5,xp:1,fp:4,col:'#5de0a0',sides:0},
  shooter:{r:12,hp:25,spd:60,dmg:8,xp:3,fp:20,col:'#5db8ff',sides:4},
  elite:{r:26,hp:380,spd:62,dmg:20,xp:25,fp:300,col:'#ffd23f',sides:8},
  boss:{r:46,hp:1500,spd:56,dmg:30,xp:120,fp:3000,col:'#ff3fa4',sides:10},
  final:{r:60,hp:14000,spd:64,dmg:28,xp:400,fp:25000,col:'#ffffff',sides:12},
  piggy:{r:18,hp:600,spd:180,dmg:0,xp:40,fp:8000,col:'#ff8fd0',sides:0},
};
// one of each before the final boss, which uses all of their tricks in turn
const BOSSES=[
  {name:'THE BRUISER',col:'#ff3fa4',sides:10},
  {name:'THE CHARGER',col:'#ff8a3f',sides:5},
  {name:'THE BROODMOTHER',col:'#5de0a0',sides:7},
  {name:'THE SPINNER',col:'#5db8ff',sides:14},
];
const FINAL_NAME='THE BILL';
const MAXR=66,FINAL_AT=720,MAXHEAT=10,GOAL=1e9;
// tuning knobs: XP curve (scale and exponent), enemy health growth per minute, health and payout per spice level
const XP_K=.0724,XP_P=3.7,HPG=1.13,SPICE_HP=1.5,SPICE_FP=3;
// what each rank is worth, and what every installed mod adds on top
const RANK_DM=[1,1.6,2.4],MOD_DMG=.15;
