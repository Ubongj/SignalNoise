const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT, 10) || 3000;

// ─── WORD + CLUE BANK ────────────────────────────────────────────────────────

const CLUE_BANK = {
  OCEAN:     { helpful: ['WAVES','DEEP','SALTWATER','VAST','PACIFIC'],      misleading: ['LAKE','PUDDLE','POND','BATH'] },
  MOUNTAIN:  { helpful: ['PEAK','SUMMIT','ALTITUDE','ROCKY','EVEREST'],      misleading: ['FLAT','VALLEY','BEACH','PLAIN'] },
  FOREST:    { helpful: ['TREES','WOODS','CANOPY','DENSE','AMAZON'],         misleading: ['DESERT','URBAN','BARE','PAVEMENT'] },
  VOLCANO:   { helpful: ['LAVA','MAGMA','ERUPTION','CRATER','MOLTEN'],       misleading: ['FROZEN','CALM','GENTLE','LAKE'] },
  AURORA:    { helpful: ['NORTHERN','LIGHTS','ARCTIC','COLORFUL','SKY'],     misleading: ['DAYTIME','SOUTHERN','DARK','SILENT'] },
  GLACIER:   { helpful: ['ICE','FROZEN','SLOW','ARCTIC','MASSIVE'],          misleading: ['TROPICAL','WARM','RAPID','LIQUID'] },
  TORNADO:   { helpful: ['FUNNEL','TWISTER','SPIN','WIND','STORM'],          misleading: ['CALM','STILL','DRIZZLE','GENTLE'] },
  HURRICANE: { helpful: ['CATEGORY','SPIRAL','COASTAL','WIND','SURGE'],      misleading: ['INLAND','CALM','GENTLE','BREEZE'] },
  COMPASS:   { helpful: ['NORTH','NAVIGATE','NEEDLE','MAGNETIC','DIRECTION'],misleading: ['LOST','RANDOM','BROKEN','BLIND'] },
  LANTERN:   { helpful: ['FLAME','GLOW','CARRIED','CANDLELIGHT','OLD'],      misleading: ['PLUGGED','ELECTRIC','SOLAR','DARK'] },
  ANCHOR:    { helpful: ['SHIP','HEAVY','HOLD','METAL','SEABED'],            misleading: ['FLOAT','FLY','FEATHER','BALLOON'] },
  TELESCOPE: { helpful: ['STARS','LENS','DISTANT','OBSERVE','SPACE'],        misleading: ['MICROSCOPE','TINY','NEAR','BLIND'] },
  TROPHY:    { helpful: ['WIN','GOLD','CUP','CHAMPION','PRIZE'],             misleading: ['LOSE','LAST','FAILURE','DISCARD'] },
  LIGHTHOUSE:{ helpful: ['BEACON','COAST','FLASH','SAILOR','ROTATING'],      misleading: ['DARK','INLAND','HIDING','SMALL'] },
  PYRAMID:   { helpful: ['EGYPT','ANCIENT','TRIANGLE','PHARAOH','STONE'],    misleading: ['MODERN','ROUND','WOODEN','SHORT'] },
  FORTRESS:  { helpful: ['WALLS','DEFEND','MILITARY','STONE','RAMPART'],     misleading: ['OPEN','GLASS','WEAK','PEACEFUL'] },
  DRAGON:    { helpful: ['FIRE','WINGS','MYTH','SCALES','MEDIEVAL'],         misleading: ['REAL','HARMLESS','TINY','FRIENDLY'] },
  PHOENIX:   { helpful: ['REBIRTH','ASHES','RISE','FIRE','IMMORTAL'],        misleading: ['FREEZE','PERISH','STAY','COLD'] },
  CRYSTAL:   { helpful: ['CLEAR','MINERAL','FACETS','TRANSPARENT','SHINE'],  misleading: ['OPAQUE','MUDDY','ROUGH','DULL'] },
  SHADOW:    { helpful: ['DARK','SILHOUETTE','CAST','FOLLOW','OUTLINE'],     misleading: ['BRIGHT','SOLID','ALONE','VISIBLE'] },
  GALAXY:    { helpful: ['SPIRAL','MILKY','UNIVERSE','VAST','STARS'],        misleading: ['TINY','NEARBY','PLANET','SOLO'] },
  NEBULA:    { helpful: ['GAS','SPACE','STELLAR','COLORFUL','CLOUD'],        misleading: ['SOLID','LOCAL','GROUND','SIMPLE'] },
  VORTEX:    { helpful: ['SPIN','SPIRAL','WHIRL','PULL','CENTER'],           misleading: ['STILL','STRAIGHT','PUSH','STOP'] },
  PHANTOM:   { helpful: ['GHOST','INVISIBLE','SPIRIT','HAUNT','EERIE'],      misleading: ['SOLID','FRIENDLY','VISIBLE','REAL'] },
  LABYRINTH: { helpful: ['MAZE','WINDING','MINOTAUR','PUZZLE','LOST'],       misleading: ['STRAIGHT','SIMPLE','CLEAR','EASY'] },
  ROBOT:     { helpful: ['MACHINE','METAL','PROGRAM','AUTOMATE','CIRCUIT'],  misleading: ['HUMAN','WOODEN','ALIVE','FEELING'] },
  ROCKET:    { helpful: ['LAUNCH','ORBIT','FUEL','THRUST','SPACE'],          misleading: ['SLOW','GROUND','FLOAT','CRAWL'] },
  CIPHER:    { helpful: ['CODE','SECRET','ENCRYPT','KEY','HIDDEN'],          misleading: ['PLAIN','PUBLIC','OBVIOUS','CLEAR'] },
  NEXUS:     { helpful: ['CONNECTION','HUB','CENTER','LINK','CORE'],         misleading: ['ISOLATED','EDGE','SEPARATE','BREAK'] },
  GLITCH:    { helpful: ['ERROR','BUG','CRASH','CORRUPT','DIGITAL'],         misleading: ['PERFECT','SMOOTH','FIXED','CLEAN'] },
  BITCOIN:   { helpful: ['CRYPTO','BLOCKCHAIN','WALLET','DIGITAL','MINING'], misleading: ['CASH','PHYSICAL','BANK','PAPER'] },
  SIGNAL:    { helpful: ['WAVE','FREQUENCY','BROADCAST','TRANSMIT','PING'],  misleading: ['NOISE','SILENCE','STATIC','BLOCK'] },
  ORACLE:    { helpful: ['PROPHECY','PREDICT','DIVINE','FUTURE','WISE'],     misleading: ['WRONG','IGNORANT','RANDOM','BLIND'] },
  PIZZA:     { helpful: ['CHEESE','CRUST','SLICE','ITALIAN','BAKED'],        misleading: ['SUSHI','COLD','FRENCH','RAW'] },
  SUSHI:     { helpful: ['JAPANESE','RAW','RICE','SEAWEED','FISH'],          misleading: ['COOKED','ITALIAN','HOT','BREAD'] },
  RAMEN:     { helpful: ['NOODLE','BROTH','JAPANESE','HOT','BOWL'],          misleading: ['COLD','DRY','FRENCH','SWEET'] },
  NINJA:     { helpful: ['STEALTH','SILENT','JAPAN','SHADOW','ASSASSIN'],    misleading: ['LOUD','CLUMSY','KNIGHT','VISIBLE'] },
  WOLF:      { helpful: ['HOWL','PACK','PREDATOR','WILD','TEETH'],           misleading: ['TAME','ALONE','PET','SILENT'] },
  EAGLE:     { helpful: ['SOAR','TALONS','SHARP','RAPTOR','BIRD'],           misleading: ['SWIM','BLIND','GROUND','CRAWL'] },
  SHARK:     { helpful: ['FIN','TEETH','PREDATOR','OCEAN','BITE'],           misleading: ['FRIENDLY','GRASS','GROUND','STILL'] },
  THUNDER:   { helpful: ['LOUD','LIGHTNING','BOOM','STORM','RUMBLE'],        misleading: ['QUIET','CLEAR','SOFT','SUNNY'] },
  ECHO:      { helpful: ['REPEAT','BOUNCE','CAVE','SOUND','HOLLOW'],         misleading: ['ORIGINAL','SOLID','MUTE','ABSORB'] },
  PRISM:     { helpful: ['RAINBOW','REFRACT','GLASS','SPECTRUM','LIGHT'],    misleading: ['OPAQUE','DARK','ABSORB','BLACK'] },
  MIRAGE:    { helpful: ['ILLUSION','DESERT','HEAT','FAKE','VISION'],        misleading: ['REAL','COLD','SOLID','TRUE'] },
  CASCADE:   { helpful: ['WATERFALL','FLOW','POUR','STEPS','RUSH'],          misleading: ['DRY','STILL','CLIMB','ASCEND'] },
  EMBER:     { helpful: ['GLOW','ASH','SPARK','FIRE','HOT'],                 misleading: ['COLD','ICE','DARK','WATER'] },
  ZENITH:    { helpful: ['APEX','PEAK','HIGHEST','TOP','ABOVE'],             misleading: ['BOTTOM','BASE','BELOW','LOW'] },
  ABYSS:     { helpful: ['VOID','BOTTOMLESS','DARK','DEEP','CHASM'],         misleading: ['SHALLOW','BRIGHT','SURFACE','FULL'] },
  DIAMOND:   { helpful: ['PRECIOUS','HARD','CARBON','FACETS','BRILLIANT'],   misleading: ['SOFT','CHEAP','CLAY','GLASS'] },
  SUBMARINE: { helpful: ['UNDERWATER','VESSEL','DIVE','PERISCOPE','SILENT'], misleading: ['FLY','SURFACE','LOUD','VISIBLE'] },
  CASTLE:    { helpful: ['MEDIEVAL','TOWER','MOAT','KNIGHT','BATTLEMENT'],   misleading: ['TENT','MODERN','CARDBOARD','OPEN'] },
  LAVA:      { helpful: ['MOLTEN','HOT','FLOW','ROCK','VOLCANO'],            misleading: ['COLD','SOLID','FROZEN','BLUE'] },
  QUEST:     { helpful: ['JOURNEY','MISSION','SEEK','ADVENTURE','HERO'],     misleading: ['STAY','REST','AVOID','SURRENDER'] },
  CROWN:     { helpful: ['ROYAL','KING','GOLD','JEWEL','HEAD'],              misleading: ['COMMONER','CHEAP','FOOT','STONE'] },
  RIDDLE:    { helpful: ['PUZZLE','MYSTERY','CLEVER','SPHINX','THINK'],      misleading: ['OBVIOUS','SIMPLE','BORING','ANSWER'] },
};

function getBotClues(word, type, count) {
  const bank = CLUE_BANK[word];
  const pool = (bank?.[type] || ['ENIGMA','UNKNOWN','HIDDEN','CIPHER','VAGUE']).slice();
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Additional words that extend the bank into themed categories. Each carries the
// same {helpful, misleading} bot-clue hints so demo bots play well in any theme.
const EXTRA_CLUES = {
  // ── Crypto & Blockchain ──
  ETHEREUM:  { helpful: ['CONTRACT','GAS','VITALIK','MERGE'],          misleading: ['PHYSICAL','GOLD','SLOW','PAPER'] },
  WALLET:    { helpful: ['KEYS','FUNDS','SECURE','STORE'],             misleading: ['EMPTY','SPEND','LOSE','OPEN'] },
  MINING:    { helpful: ['HASH','REWARD','COMPUTE','ENERGY'],          misleading: ['IDLE','SLEEP','MANUAL','REST'] },
  LEDGER:    { helpful: ['RECORD','BALANCE','ENTRIES','PUBLIC'],       misleading: ['SECRET','ERASE','BLANK','PRIVATE'] },
  TOKEN:     { helpful: ['ASSET','MINT','DIGITAL','TRADE'],            misleading: ['CASH','BADGE','PHYSICAL','JUNK'] },
  STAKING:   { helpful: ['LOCK','REWARD','VALIDATE','YIELD'],          misleading: ['SPEND','WITHDRAW','GAMBLE','IDLE'] },
  PROTOCOL:  { helpful: ['RULES','NETWORK','STANDARD','LAYER'],        misleading: ['CHAOS','RANDOM','BROKEN','SOLO'] },
  GENESIS:   { helpful: ['FIRST','BLOCK','ORIGIN','START'],            misleading: ['LAST','FINAL','RECENT','END'] },
  // ── Science ──
  GRAVITY:   { helpful: ['FORCE','NEWTON','MASS','FALL'],              misleading: ['FLOAT','WEIGHTLESS','RISE','PUSH'] },
  ATOM:      { helpful: ['TINY','NUCLEUS','ELEMENT','PARTICLE'],       misleading: ['HUGE','PLANET','VISIBLE','WHOLE'] },
  ECLIPSE:   { helpful: ['SHADOW','ALIGN','SOLAR','BLOCK'],            misleading: ['BRIGHT','APART','NOON','CLEAR'] },
  NEURON:    { helpful: ['BRAIN','SIGNAL','SYNAPSE','NERVE'],          misleading: ['MUSCLE','BONE','STILL','SILENT'] },
  VOLTAGE:   { helpful: ['ELECTRIC','CURRENT','POWER','CHARGE'],       misleading: ['STILL','DEAD','WATER','CALM'] },
  ENZYME:    { helpful: ['PROTEIN','CATALYST','DIGEST','REACT'],       misleading: ['INERT','STONE','SLOW','BLOCK'] },
  MOLECULE:  { helpful: ['BOND','ATOMS','COMPOUND','TINY'],            misleading: ['SINGLE','HUGE','METAL','SOLO'] },
  // ── Animals ──
  DOLPHIN:   { helpful: ['SMART','OCEAN','CLICKS','LEAP'],             misleading: ['SLOW','DESERT','DULL','SINK'] },
  ELEPHANT:  { helpful: ['TRUNK','HUGE','TUSK','MEMORY'],              misleading: ['TINY','SMOOTH','FAST','LIGHT'] },
  PENGUIN:   { helpful: ['WADDLE','ANTARCTIC','TUXEDO','COLD'],        misleading: ['DESERT','FLYING','WARM','SPRINT'] },
  OCTOPUS:   { helpful: ['TENTACLES','INK','EIGHT','OCEAN'],           misleading: ['LEGS','DRY','SINGLE','LAND'] },
  TIGER:     { helpful: ['STRIPES','JUNGLE','ROAR','FELINE'],          misleading: ['SPOTS','TAME','PURR','ARCTIC'] },
  FALCON:    { helpful: ['SWIFT','DIVE','HUNTER','WINGS'],             misleading: ['SLOW','WALK','PREY','GROUND'] },
  PANDA:     { helpful: ['BAMBOO','BLACK','CHINA','BEAR'],             misleading: ['MEAT','DESERT','TINY','STRIPED'] },
  // ── Places & Countries ──
  PARIS:     { helpful: ['FRANCE','EIFFEL','SEINE','LOUVRE'],          misleading: ['DESERT','LONDON','RURAL','BEACH'] },
  TOKYO:     { helpful: ['JAPAN','NEON','SUSHI','CROWDED'],            misleading: ['QUIET','EUROPE','VILLAGE','COLD'] },
  EGYPT:     { helpful: ['PYRAMIDS','NILE','PHARAOH','DESERT'],        misleading: ['ARCTIC','FOREST','MODERN','OCEAN'] },
  ICELAND:   { helpful: ['GEYSER','NORDIC','GLACIER','VOLCANIC'],      misleading: ['TROPICAL','WARM','DESERT','FLAT'] },
  SAHARA:    { helpful: ['DESERT','DUNES','AFRICA','ARID'],            misleading: ['SNOW','OCEAN','FOREST','COLD'] },
  VENICE:    { helpful: ['CANALS','GONDOLA','ITALY','WATER'],          misleading: ['DESERT','HILLS','DRY','MODERN'] },
  BRAZIL:    { helpful: ['AMAZON','SAMBA','CARNIVAL','SOCCER'],        misleading: ['ARCTIC','DESERT','QUIET','TINY'] },
  EVEREST:   { helpful: ['PEAK','TALLEST','HIMALAYA','CLIMB'],         misleading: ['VALLEY','SHORT','BEACH','FLAT'] },
  SYDNEY:    { helpful: ['OPERA','HARBOUR','AUSTRALIA','BEACH'],       misleading: ['LANDLOCKED','FROZEN','EUROPE','DESERT'] },
  KENYA:     { helpful: ['SAFARI','AFRICA','SAVANNA','WILDLIFE'],      misleading: ['ARCTIC','URBAN','OCEAN','SNOW'] },
  // ── Famous People ──
  EINSTEIN:  { helpful: ['RELATIVITY','PHYSICS','GENIUS','THEORY'],    misleading: ['PAINTER','ATHLETE','SINGER','ACTOR'] },
  SHAKESPEARE:{helpful: ['PLAYWRIGHT','HAMLET','SONNET','BARD'],       misleading: ['SCIENTIST','PAINTER','MODERN','SILENT'] },
  NEWTON:    { helpful: ['GRAVITY','PHYSICS','APPLE','LAWS'],          misleading: ['PAINTER','SINGER','MODERN','CHEMISTRY'] },
  CLEOPATRA: { helpful: ['EGYPT','QUEEN','PHARAOH','NILE'],            misleading: ['KING','MODERN','PEASANT','EUROPE'] },
  MOZART:    { helpful: ['COMPOSER','SYMPHONY','PIANO','AUSTRIA'],     misleading: ['PAINTER','SCIENTIST','SILENT','MODERN'] },
  GANDHI:    { helpful: ['PEACE','INDIA','PROTEST','NONVIOLENT'],      misleading: ['WARRIOR','KING','VIOLENT','EUROPE'] },
  TESLA:     { helpful: ['ELECTRIC','INVENTOR','COILS','CURRENT'],     misleading: ['PAINTER','SINGER','STEAM','ANCIENT'] },
  DARWIN:    { helpful: ['EVOLUTION','SPECIES','FINCHES','NATURAL'],   misleading: ['PHYSICS','PAINTER','KING','FIXED'] },
  PICASSO:   { helpful: ['PAINTER','CUBISM','SPAIN','ABSTRACT'],       misleading: ['SCIENTIST','WRITER','REALIST','SINGER'] },
  LINCOLN:   { helpful: ['PRESIDENT','ABRAHAM','UNION','HONEST'],      misleading: ['KING','PAINTER','MODERN','EUROPE'] },
  // ── Food & Drink ──
  TACO:      { helpful: ['MEXICAN','SHELL','FILLING','CRUNCH'],        misleading: ['SUSHI','SOUP','SWEET','BLAND'] },
  CHOCOLATE: { helpful: ['COCOA','SWEET','DARK','MELT'],              misleading: ['SOUR','SAVORY','FROZEN','PLAIN'] },
  PANCAKE:   { helpful: ['SYRUP','FLAT','BREAKFAST','STACK'],         misleading: ['SAVORY','TALL','DINNER','SPICY'] },
  ESPRESSO:  { helpful: ['COFFEE','SHOT','STRONG','ITALIAN'],         misleading: ['WEAK','TEA','COLD','SWEET'] },
  MANGO:     { helpful: ['TROPICAL','FRUIT','SWEET','JUICY'],         misleading: ['SOUR','ARCTIC','VEGETABLE','BLAND'] },
  NOODLE:    { helpful: ['PASTA','LONG','SLURP','WHEAT'],             misleading: ['SHORT','SOLID','RICE','CRISP'] },
  BURGER:    { helpful: ['PATTY','GRILL','BEEF','STACK'],             misleading: ['SUSHI','SOUP','SWEET','RAW'] },
  // ── Nature ──
  CANYON:    { helpful: ['GORGE','DEEP','CARVED','RIVER'],            misleading: ['FLAT','PEAK','SHALLOW','OCEAN'] },
  DESERT:    { helpful: ['SAND','DRY','DUNES','ARID'],               misleading: ['WET','FOREST','OCEAN','LUSH'] },
  // ── Myth & Fantasy ──
  WIZARD:    { helpful: ['SPELLS','MAGIC','STAFF','ROBE'],           misleading: ['WARRIOR','MUGGLE','SWORD','ORDINARY'] },
  KRAKEN:    { helpful: ['SEA','MONSTER','TENTACLES','LEGEND'],      misleading: ['TINY','LAND','GENTLE','REAL'] },
  GRIFFIN:   { helpful: ['EAGLE','LION','WINGS','MYTH'],             misleading: ['REAL','FISH','TAME','TINY'] },
  GOBLIN:    { helpful: ['GREEN','SNEAKY','CAVE','SMALL'],           misleading: ['GIANT','KIND','ANGELIC','TALL'] },
  SORCERER:  { helpful: ['MAGIC','SPELLS','DARK','POWER'],           misleading: ['KNIGHT','FARMER','WEAK','ORDINARY'] },
  GOLEM:     { helpful: ['CLAY','STONE','GUARDIAN','ANIMATED'],      misleading: ['FLESH','TINY','FRAGILE','LIVING'] },
};
Object.assign(CLUE_BANK, EXTRA_CLUES);

const BOT_NAMES = ['Nova', 'Echo', 'Cipher'];

// ─── CATEGORIES ────────────────────────────────────────────────────────────
// Host picks a theme at room creation; the round word pool is drawn from it.
const ALL_WORDS = Object.keys(CLUE_BANK);

const CATEGORY_META = [
  { key: 'mixed',   label: 'Mixed',               emoji: '🎲' },
  { key: 'crypto',  label: 'Crypto & Blockchain', emoji: '🪙' },
  { key: 'science', label: 'Science',             emoji: '🔬' },
  { key: 'animals', label: 'Animals',             emoji: '🐾' },
  { key: 'places',  label: 'Places & Countries',  emoji: '🌍' },
  { key: 'people',  label: 'Famous People',       emoji: '👑' },
  { key: 'food',    label: 'Food & Drink',        emoji: '🍜' },
  { key: 'nature',  label: 'Nature',              emoji: '🌋' },
  { key: 'fantasy', label: 'Myth & Fantasy',      emoji: '🐉' },
];

const CATEGORY_WORDS = {
  crypto:  ['BITCOIN','ETHEREUM','WALLET','MINING','LEDGER','TOKEN','STAKING','PROTOCOL','GENESIS','ORACLE','CIPHER'],
  science: ['GRAVITY','ATOM','ECLIPSE','NEURON','VOLTAGE','ENZYME','MOLECULE','GALAXY','NEBULA','TELESCOPE','PRISM','ROCKET'],
  animals: ['WOLF','EAGLE','SHARK','DOLPHIN','ELEPHANT','PENGUIN','OCTOPUS','TIGER','FALCON','PANDA'],
  places:  ['PARIS','TOKYO','EGYPT','ICELAND','SAHARA','VENICE','BRAZIL','EVEREST','SYDNEY','KENYA'],
  people:  ['EINSTEIN','SHAKESPEARE','NEWTON','CLEOPATRA','MOZART','GANDHI','TESLA','DARWIN','PICASSO','LINCOLN'],
  food:    ['PIZZA','SUSHI','RAMEN','TACO','CHOCOLATE','PANCAKE','ESPRESSO','MANGO','NOODLE','BURGER'],
  nature:  ['OCEAN','MOUNTAIN','FOREST','VOLCANO','GLACIER','TORNADO','THUNDER','AURORA','HURRICANE','CASCADE','LAVA','EMBER','CANYON','DESERT'],
  fantasy: ['DRAGON','PHOENIX','PHANTOM','LABYRINTH','VORTEX','WIZARD','KRAKEN','GRIFFIN','GOBLIN','SORCERER','GOLEM'],
  mixed:   ALL_WORDS,
};

function normalizeCategory(key) { return CATEGORY_WORDS[key] ? key : 'mixed'; }
function getCategoryWords(key)  { const l = CATEGORY_WORDS[normalizeCategory(key)]; return (l && l.length) ? l : ALL_WORDS; }
function categoryLabel(key)     { const m = CATEGORY_META.find(c => c.key === normalizeCategory(key)); return m ? m.label : 'Mixed'; }

// ─── CLUE VALIDATION (anti-cheat) ────────────────────────────────────────────
// A real-word dictionary plus every curated bank word/clue, so themed/proper-noun
// clues pass but gibberish and acronyms don't.
const ALLOWED_WORDS = new Set(require('an-array-of-english-words'));
for (const w of ALL_WORDS) ALLOWED_WORDS.add(w.toLowerCase());
for (const v of Object.values(CLUE_BANK)) {
  for (const t of [...(v.helpful || []), ...(v.misleading || [])]) ALLOWED_WORDS.add(t.toLowerCase());
}

// Returns an error string if the clue is illegal, or null if it's allowed.
function validateClue(raw, word) {
  const c = String(raw ?? '').trim();
  if (!c) return 'Clue cannot be empty.';
  if (!/^[A-Za-z]+$/.test(c)) return 'Single word, letters only — no spaces, numbers or symbols.';
  const C = c.toUpperCase();
  const W = String(word ?? '').toUpperCase();
  if (C.length < 3) return 'Clue must be at least 3 letters — no initials or abbreviations.';
  if (C === W) return 'You cannot use the secret word itself.';
  if (W.length >= 3 && (W.includes(C) || C.includes(W))) return `"${c}" is part of the word — pick a different clue.`;
  if (W.length >= 2 && C.slice(0, 2) === W.slice(0, 2)) return `Clue can't start with the word's first two letters.`;
  if (!ALLOWED_WORDS.has(c.toLowerCase())) return `"${c}" isn't a recognized word — no acronyms or made-up words.`;
  return null;
}

// ─── GAME STORE ──────────────────────────────────────────────────────────────

let io = null; // set once server starts

const rooms        = new Map();
const socketToRoom = new Map();
const phaseTimers  = new Map();

const PHASE_DURATIONS = {
  ROLE_REVEAL:     5500,
  CLUE_SUBMISSION: 62000,
  REVEAL:          4000,
  GUESS:           27000, // 25s + 2s buffer
};

function generateId()          { return Math.random().toString(36).substring(2, 8).toUpperCase(); }
function shuffle(arr)          { return [...arr].sort(() => Math.random() - 0.5); }
function getCurrentRound(room) { return room.rounds[room.currentRound - 1] || null; }

function getPlayerRole(room, playerId) {
  const r = getCurrentRound(room);
  if (!r) return null;
  if (r.guesserId   === playerId) return 'guesser';
  if (r.helperId    === playerId) return 'helper';
  if (r.saboteurId  === playerId) return 'saboteur';
  if (r.observerId  === playerId) return 'observer';
  return null;
}

function clearPhaseTimer(roomId) {
  const t = phaseTimers.get(roomId);
  if (t) { clearTimeout(t); phaseTimers.delete(roomId); }
}

function setPhaseTimer(roomId, ms, fn) {
  clearPhaseTimer(roomId);
  phaseTimers.set(roomId, setTimeout(fn, ms));
}

function setPhase(room, phase) {
  room.phase = phase;
  const dur = PHASE_DURATIONS[phase] ?? null;
  room.phaseDuration = dur;
  room.phaseEndsAt   = dur ? Date.now() + dur : null;
}

// ─── ROOM MANAGEMENT ─────────────────────────────────────────────────────────

function createRoom(socketId, playerName, isDemo, walletAddress, clientId, category) {
  const roomId = generateId();
  const cat = normalizeCategory(category);
  const room = {
    id: roomId,
    players: [{ id: socketId, clientId: clientId || socketId, name: playerName, team: 'A', isHost: true, connected: true, isBot: false, address: walletAddress || null }],
    phase: 'LOBBY',
    currentRound: 0,
    rounds: [],
    scores: { A: 0, B: 0 },
    category: cat,
    wordPool: shuffle(getCategoryWords(cat)),
    winner: null,
    phaseEndsAt: null,
    phaseDuration: null,
    isDemo: !!isDemo,
  };
  rooms.set(roomId, room);
  socketToRoom.set(socketId, roomId);

  if (isDemo) {
    // Add 3 bots: Nova→A, Echo→B, Cipher→B
    BOT_NAMES.forEach((name, i) => {
      const botId = `bot_${roomId}_${i}`;
      socketToRoom.set(botId, roomId);
      room.players.push({ id: botId, name, team: i === 0 ? 'A' : 'B', isHost: false, connected: true, isBot: true });
    });
    // Auto-start after a brief lobby view
    setTimeout(() => doStartGame(room, io), 1800);
  }

  return room;
}

// Repoint every stored reference to a player from an old socket id to a new one
// (used when a player reconnects with a fresh socket after a reload).
function remapPlayerId(room, oldId, newId) {
  for (const r of room.rounds || []) {
    if (r.guesserId === oldId) r.guesserId = newId;
    if (r.helperId === oldId) r.helperId = newId;
    if (r.saboteurId === oldId) r.saboteurId = newId;
    if (r.observerId === oldId) r.observerId = newId;
    for (const c of r.clues || []) if (c.playerId === oldId) c.playerId = newId;
  }
}

function joinRoom(socketId, roomId, playerName, walletAddress, clientId) {
  const room = rooms.get(roomId);
  if (!room) return { error: 'Room not found. Check the code and try again.' };

  // Same socket already in the room (idempotent).
  if (room.players.find(p => p.id === socketId)) { socketToRoom.set(socketId, roomId); return { room }; }

  // Reconnect: a player from this browser (clientId) already has a slot — reattach
  // it to the new socket instead of creating a duplicate. Works mid-game too.
  const existing = clientId ? room.players.find(p => p.clientId === clientId && !p.isBot) : null;
  if (existing) {
    const oldId = existing.id;
    existing.id = socketId;
    existing.connected = true;
    existing.name = playerName || existing.name;
    if (walletAddress) existing.address = walletAddress;
    remapPlayerId(room, oldId, socketId);
    socketToRoom.delete(oldId);
    socketToRoom.set(socketId, roomId);
    return { room, reattached: true };
  }

  // Otherwise it's a genuinely new player — only allowed before the game starts.
  if (!['WAITING', 'LOBBY'].includes(room.phase)) return { error: 'Game already in progress.' };
  if (room.players.length >= 4) return { error: 'Room is full (4 players max).' };
  room.players.push({ id: socketId, clientId: clientId || socketId, name: playerName, team: null, isHost: false, connected: true, isBot: false, address: walletAddress || null });
  if (room.players.length >= 2) room.phase = 'LOBBY';
  socketToRoom.set(socketId, roomId);
  return { room };
}

function chooseTeam(socketId, team) {
  const roomId = socketToRoom.get(socketId);
  if (!roomId) return { error: 'Not in a room.' };
  const room = rooms.get(roomId);
  if (!room) return { error: 'Room not found.' };
  if (!['WAITING', 'LOBBY'].includes(room.phase)) return { error: 'Cannot change team now.' };
  if (room.players.filter(p => p.team === team && p.id !== socketId).length >= 2)
    return { error: `Team ${team} is full.` };
  const player = room.players.find(p => p.id === socketId);
  if (player) player.team = team;
  return { room };
}

// ─── ROUND BUILDER ────────────────────────────────────────────────────────────

const TOTAL_ROUNDS = 8;

function buildRounds(room) {
  const a = room.players.filter(p => p.team === 'A');
  const b = room.players.filter(p => p.team === 'B');
  const order = [a[0], b[0], a[1], b[1]]; // rotation of guessers (repeats each cycle)

  const rounds = [];
  for (let i = 0; i < TOTAL_ROUNDS; i++) {
    const guesser   = order[i % order.length];              // each player guesses twice over 8 rounds
    const helper    = room.players.find(p => p.team === guesser.team && p.id !== guesser.id);
    const opponents = guesser.team === 'A' ? b : a;
    const sabIdx    = i < order.length ? 0 : 1;             // opponents swap saboteur/observer each cycle
    const saboteur  = opponents[sabIdx];
    const observer  = opponents[1 - sabIdx];
    rounds.push({
      roundNumber: i + 1,
      guesserId:  guesser.id,
      helperId:   helper.id,
      saboteurId: saboteur.id,
      observerId: observer.id,
      word:       room.wordPool[i],
      helperClues:   null,
      saboteurClues: null,
      clues:    [],
      guess:    null,
      isCorrect:   false,
      timeExpired: false,
    });
  }
  return rounds;
}

// ─── GAME FLOW ────────────────────────────────────────────────────────────────

function startGame(socketId) {
  const roomId = socketToRoom.get(socketId);
  if (!roomId) return { error: 'Not in a room.' };
  const room = rooms.get(roomId);
  if (!room) return { error: 'Room not found.' };
  if (!room.players.find(p => p.id === socketId)?.isHost) return { error: 'Only the host can start.' };
  return doStartGame(room, io);
}

function doStartGame(room, _io) {
  const a = room.players.filter(p => p.team === 'A');
  const b = room.players.filter(p => p.team === 'B');
  if (a.length !== 2 || b.length !== 2) return { error: 'Need 2 players per team.' };
  room.rounds       = buildRounds(room);
  room.currentRound = 1;
  room.scores       = { A: 0, B: 0 };
  setPhase(room, 'ROLE_REVEAL');
  setPhaseTimer(room.id, PHASE_DURATIONS.ROLE_REVEAL, () => advanceToClueSubmission(room.id, _io));
  broadcastState(room.id, _io);
  return { room };
}

// ── Clue Submission ──────────────────────────────────────────────────────────

function advanceToClueSubmission(roomId, _io) {
  const room = rooms.get(roomId);
  if (!room) return;
  setPhase(room, 'CLUE_SUBMISSION');
  setPhaseTimer(roomId, PHASE_DURATIONS.CLUE_SUBMISSION, () => advanceToReveal(roomId, _io));
  broadcastState(roomId, _io);
  scheduleBotClues(roomId, _io);
}

function scheduleBotClues(roomId, _io) {
  const room  = rooms.get(roomId);
  if (!room || room.phase !== 'CLUE_SUBMISSION') return;
  const round = getCurrentRound(room);
  if (!round) return;

  const helper   = room.players.find(p => p.id === round.helperId);
  const saboteur = room.players.find(p => p.id === round.saboteurId);
  const baseDelay = 2500 + Math.random() * 1500; // 2.5–4s

  if (helper?.isBot) {
    setTimeout(() => {
      if (room.phase !== 'CLUE_SUBMISSION' || round.helperClues) return;
      round.helperClues = getBotClues(round.word, 'helpful', 3).map(text => ({
        text, playerId: helper.id, playerName: helper.name, type: 'helpful',
      }));
      broadcastState(roomId, _io);
      maybeTriggerReveal(roomId, _io);
    }, baseDelay);
  }

  if (saboteur?.isBot) {
    setTimeout(() => {
      if (room.phase !== 'CLUE_SUBMISSION' || round.saboteurClues) return;
      round.saboteurClues = getBotClues(round.word, 'misleading', 2).map(text => ({
        text, playerId: saboteur.id, playerName: saboteur.name, type: 'misleading',
      }));
      broadcastState(roomId, _io);
      maybeTriggerReveal(roomId, _io);
    }, baseDelay + 600);
  }
}

function maybeTriggerReveal(roomId, _io) {
  const room  = rooms.get(roomId);
  if (!room || room.phase !== 'CLUE_SUBMISSION') return;
  const round = getCurrentRound(room);
  if (!round || !round.helperClues || !round.saboteurClues) return;
  clearPhaseTimer(roomId);
  setTimeout(() => advanceToReveal(roomId, _io), 700);
}

function submitClues(socketId, clues, _io) {
  const roomId = socketToRoom.get(socketId);
  if (!roomId) return { error: 'Not in a room.' };
  const room  = rooms.get(roomId);
  if (!room || room.phase !== 'CLUE_SUBMISSION') return { error: 'Not in clue submission phase.' };
  const round  = getCurrentRound(room);
  if (!round)  return { error: 'No active round.' };
  const player = room.players.find(p => p.id === socketId);
  if (!player) return { error: 'Player not found.' };

  const isHelper = socketId === round.helperId;
  const isSaboteur = socketId === round.saboteurId;
  if (!isHelper && !isSaboteur) return { error: 'Not your turn to submit clues.' };

  const need = isHelper ? 3 : 2;
  const list = (Array.isArray(clues) ? clues : []).map(c => String(c ?? '').trim()).filter(Boolean).slice(0, need);
  if (list.length < need) return { error: `Submit all ${need} clues.` };

  // Authoritative anti-cheat: reject invalid words, acronyms, the word itself,
  // word fragments, and clues sharing the word's first two letters.
  for (const c of list) {
    const reason = validateClue(c, round.word);
    if (reason) return { error: reason };
  }

  const type = isHelper ? 'helpful' : 'misleading';
  const built = list.map(c => ({ text: c.toUpperCase(), playerId: socketId, playerName: player.name, type }));
  if (isHelper) round.helperClues = built;
  else          round.saboteurClues = built;

  broadcastState(roomId, _io);
  maybeTriggerReveal(roomId, _io);
  return {};
}

// ── Reveal ───────────────────────────────────────────────────────────────────

function advanceToReveal(roomId, _io) {
  const room  = rooms.get(roomId);
  if (!room || room.phase !== 'CLUE_SUBMISSION') return; // guard against double-trigger
  const round = getCurrentRound(room);
  if (!round) return;
  round.clues = shuffle([...(round.helperClues || []), ...(round.saboteurClues || [])]);
  setPhase(room, 'REVEAL');
  setPhaseTimer(roomId, PHASE_DURATIONS.REVEAL, () => advanceToGuess(roomId, _io));
  broadcastState(roomId, _io);
}

// ── Guess ────────────────────────────────────────────────────────────────────

function advanceToGuess(roomId, _io) {
  const room = rooms.get(roomId);
  if (!room) return;
  setPhase(room, 'GUESS');
  setPhaseTimer(roomId, PHASE_DURATIONS.GUESS, () => resolveGuess(roomId, null, true, _io));
  broadcastState(roomId, _io);
  scheduleBotGuess(roomId, _io);
}

function scheduleBotGuess(roomId, _io) {
  const room  = rooms.get(roomId);
  if (!room)  return;
  const round = getCurrentRound(room);
  if (!round) return;
  const guesser = room.players.find(p => p.id === round.guesserId);
  if (!guesser?.isBot) return;

  const delay = 4000 + Math.random() * 2000; // 4–6s
  setTimeout(() => {
    if (room.phase !== 'GUESS') return;
    // Bots guess correctly 60% of the time
    const correct = Math.random() > 0.4;
    clearPhaseTimer(roomId);
    resolveGuess(roomId, correct ? round.word : 'WRONG', false, _io);
  }, delay);
}

function submitGuess(socketId, guess, _io) {
  const roomId = socketToRoom.get(socketId);
  if (!roomId) return { error: 'Not in a room.' };
  const room  = rooms.get(roomId);
  if (!room || room.phase !== 'GUESS') return { error: 'Not in guess phase.' };
  const round = getCurrentRound(room);
  if (!round || round.guesserId !== socketId) return { error: 'Not your turn to guess.' };
  clearPhaseTimer(roomId);
  resolveGuess(roomId, guess.trim().toUpperCase(), false, _io);
  return {};
}

function resolveGuess(roomId, guess, timeExpired, _io) {
  const room  = rooms.get(roomId);
  if (!room)  return;
  const round = getCurrentRound(room);
  if (!round) return;

  round.guess       = guess;
  round.timeExpired = timeExpired;
  round.isCorrect   = !!guess && guess === round.word;

  const guesser = room.players.find(p => p.id === round.guesserId);
  if (guesser) {
    if (round.isCorrect) room.scores[guesser.team]++;
    else                  room.scores[guesser.team === 'A' ? 'B' : 'A']++;
  }

  room.phase       = 'ROUND_END';
  room.phaseEndsAt = null;
  broadcastState(roomId, _io);
}

// ── Between rounds ───────────────────────────────────────────────────────────

function nextRound(socketId) {
  const roomId = socketToRoom.get(socketId);
  if (!roomId) return { error: 'Not in a room.' };
  const room   = rooms.get(roomId);
  if (!room || room.phase !== 'ROUND_END') return { error: 'Not in round end phase.' };
  if (!room.players.find(p => p.id === socketId)?.isHost) return { error: 'Only the host can advance.' };

  if (room.currentRound >= TOTAL_ROUNDS) {
    room.phase  = 'GAME_OVER';
    const { A, B } = room.scores;
    room.winner = A > B ? 'A' : B > A ? 'B' : 'TIE';
    broadcastState(roomId, io);
  } else {
    room.currentRound++;
    setPhase(room, 'ROLE_REVEAL');
    setPhaseTimer(roomId, PHASE_DURATIONS.ROLE_REVEAL, () => advanceToClueSubmission(roomId, io));
    broadcastState(roomId, io);
  }
  return {};
}

function playAgain(socketId) {
  const roomId = socketToRoom.get(socketId);
  if (!roomId) return;
  const room   = rooms.get(roomId);
  if (!room)   return;
  if (!room.players.find(p => p.id === socketId)?.isHost) return;
  clearPhaseTimer(roomId);
  room.phase        = 'LOBBY';
  room.currentRound = 0;
  room.rounds       = [];
  room.scores       = { A: 0, B: 0 };
  room.winner       = null;
  room.phaseEndsAt  = null;
  room.wordPool     = shuffle(getCategoryWords(room.category));
  broadcastState(roomId, io);
}

// ─── STATE SERIALIZATION ─────────────────────────────────────────────────────

function buildStateForPlayer(room, playerId) {
  const round       = getCurrentRound(room);
  const isPlaying   = !['WAITING', 'LOBBY'].includes(room.phase);
  const role        = isPlaying ? getPlayerRole(room, playerId) : null;

  const state = {
    roomId:        room.id,
    phase:         room.phase,
    players:       room.players.map(({ id, name, team, isHost, connected, address }) => ({ id, name, team, isHost, connected, address: address || null })),
    scores:        { ...room.scores },
    currentRound:  room.currentRound,
    totalRounds:   TOTAL_ROUNDS,
    phaseEndsAt:   room.phaseEndsAt,
    phaseDuration: room.phaseDuration,
    playerId,
    role,
    winner:        room.winner,
    category:      room.category || 'mixed',
    categoryLabel: categoryLabel(room.category),
  };

  if (!round || !isPlaying) return state;

  // Word visibility: helper, saboteur, observer all see it — guesser never does
  if (['ROLE_REVEAL','CLUE_SUBMISSION','REVEAL','GUESS'].includes(room.phase)) {
    if (role !== 'guesser') state.word = round.word;
  }

  if (room.phase === 'CLUE_SUBMISSION') {
    state.cluesSubmitted  = !!(role === 'helper' ? round.helperClues : role === 'saboteur' ? round.saboteurClues : false);
    state.helperSubmitted   = !!round.helperClues;
    state.saboteurSubmitted = !!round.saboteurClues;
  }

  if (['REVEAL','GUESS'].includes(room.phase)) {
    if (role === 'guesser') state.clues         = round.clues.map(c => c.text);
    else                    state.cluesAnnotated = round.clues;
  }

  if (room.phase === 'ROUND_END') {
    const guesserPlayer = room.players.find(p => p.id === round.guesserId);
    state.roundResult = {
      word: round.word, guess: round.guess, isCorrect: round.isCorrect,
      timeExpired: round.timeExpired, clues: round.clues,
      guesserName: guesserPlayer?.name, guesserTeam: guesserPlayer?.team,
    };
  }

  state.roundMeta = {
    roundNumber: round.roundNumber,
    guesserId:   round.guesserId,
    helperId:    round.helperId,
    saboteurId:  round.saboteurId,
    observerId:  round.observerId,
  };

  return state;
}

function broadcastState(roomId, _io) {
  const room = rooms.get(roomId);
  if (!room || !_io) return;
  for (const p of room.players) {
    if (p.connected) _io.to(p.id).emit('state_update', buildStateForPlayer(room, p.id));
  }
}

// ─── SERVER ──────────────────────────────────────────────────────────────────

const app    = next({ dev, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try { await handle(req, res, parse(req.url, true)); }
    catch (err) { console.error(err); res.statusCode = 500; res.end('Internal server error'); }
  });

  io = new Server(httpServer, { cors: { origin: '*' }, transports: ['websocket', 'polling'] });

  io.on('connection', (socket) => {

    socket.on('create_room', ({ playerName, isDemo, walletAddress, clientId, category }, cb) => {
      console.log(`[create_room] player="${playerName}" isDemo=${isDemo} category=${category} socket=${socket.id}`);
      try {
        const room = createRoom(socket.id, playerName, isDemo, walletAddress, clientId, category);
        socket.join(room.id);
        cb?.({ roomId: room.id, state: buildStateForPlayer(room, socket.id) });
        broadcastState(room.id, io);
      } catch (e) {
        console.error('[create_room] error:', e);
        cb?.({ error: 'Failed to create room.' });
      }
    });

    socket.on('join_room', ({ roomId, playerName, walletAddress, clientId }, cb) => {
      const result = joinRoom(socket.id, roomId, playerName, walletAddress, clientId);
      if (result.error) { cb?.({ error: result.error }); return; }
      socket.join(roomId);
      broadcastState(roomId, io);
      cb?.({ state: buildStateForPlayer(result.room, socket.id), reattached: !!result.reattached });
    });

    socket.on('choose_team', ({ team }) => {
      const result = chooseTeam(socket.id, team);
      if (result.error) { socket.emit('game_error', { message: result.error }); return; }
      broadcastState(result.room.id, io);
    });

    socket.on('start_game', (_, cb) => {
      const result = startGame(socket.id);
      if (result.error) { socket.emit('game_error', { message: result.error }); cb?.({ error: result.error }); return; }
      cb?.({});
    });

    socket.on('submit_clues', ({ clues }, cb) => {
      const result = submitClues(socket.id, clues, io);
      if (result.error) { cb?.({ error: result.error }); return; }
      cb?.({});
    });

    socket.on('submit_guess', ({ guess }) => {
      const result = submitGuess(socket.id, guess, io);
      if (result.error) socket.emit('game_error', { message: result.error });
    });

    socket.on('next_round', (_, cb) => {
      const result = nextRound(socket.id);
      if (result?.error) { socket.emit('game_error', { message: result.error }); cb?.({ error: result.error }); return; }
      cb?.({});
    });

    socket.on('play_again', () => playAgain(socket.id));

    socket.on('request_state', () => {
      const roomId = socketToRoom.get(socket.id);
      const room   = roomId ? rooms.get(roomId) : null;
      if (room) socket.emit('state_update', buildStateForPlayer(room, socket.id));
    });

    socket.on('disconnect', () => {
      const roomId = socketToRoom.get(socket.id);
      if (roomId) {
        const room = rooms.get(roomId);
        if (room) {
          const p = room.players.find(p => p.id === socket.id);
          if (p) p.connected = false;
          broadcastState(roomId, io);
          if (room.players.filter(p => !p.isBot).every(p => !p.connected)) {
            setTimeout(() => {
              const r = rooms.get(roomId);
              if (r && r.players.filter(p => !p.isBot).every(p => !p.connected)) {
                rooms.delete(roomId); clearPhaseTimer(roomId);
              }
            }, 600_000);
          }
        }
        socketToRoom.delete(socket.id);
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`\n  ▶  Signal vs Noise  →  http://localhost:${port}\n`);
  });
});
