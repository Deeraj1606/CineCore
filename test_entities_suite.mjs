import { EntityDictionary } from './js/entities.js';

let failed = 0;
let passed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✓ ${message}`);
        passed++;
    } else {
        console.error(`  ✗ FAIL: ${message}`);
        failed++;
    }
}

console.log('--- Screenplay Entity Suggestion Test Suite ---');

// Test 1: Initialization and Defaults
console.log('\n[Test 1] Initialization & Built-in Defaults');
const dict = new EntityDictionary();
assert(dict.getCollection('scenePrefix').size >= 5, 'Default scene prefixes initialized (INT., EXT., etc.)');
assert(dict.getCollection('timeOfDay').size >= 10, 'Default times of day initialized (DAY, NIGHT, etc.)');
assert(dict.getCollection('transition').size >= 9, 'Default transitions initialized (CUT TO:, etc.)');
assert(dict.getCollection('character').size === 0, 'No characters initialized by default');

// Test 2: Character Learning & Sanitization
console.log('\n[Test 2] Character Learning & Normalization');
dict.learn('character', 'ARUN');
dict.learn('character', 'DEERAJ');
dict.learn('character', 'DHEENA');
dict.learn('character', 'HARISH');
assert(dict.getCollection('character').size === 4, 'Learned 4 characters');

// Parenthetical stripping: "KAI (V.O.)" -> "KAI"
const kai = dict.learn('character', 'KAI (V.O.)');
assert(kai.name === 'KAI', 'Parentheticals stripped from character name');

// Repeat learning increments usage count
const deerajBefore = dict.getCollection('character').get('DEERAJ').usageCount;
dict.learn('character', 'DEERAJ');
const deerajAfter = dict.getCollection('character').get('DEERAJ').usageCount;
assert(deerajAfter === deerajBefore + 1, 'Usage count increments when character is reused');

// Test 3: Progressive Keystroke Filtering (User's Exact Scenario)
console.log('\n[Test 3] User Real-Time Keystroke Scenario (D -> DE -> DEE -> DEER)');

// Query 'D'
let resD = dict.query('character', 'D').map(r => r.label);
console.log('Query "D" results:', resD);
assert(resD.includes('DEERAJ') && resD.includes('DHEENA'), 'Query "D" shows DEERAJ and DHEENA');
assert(!resD.includes('ARUN') && !resD.includes('HARISH'), 'Query "D" does NOT show ARUN or HARISH');
assert(!resD.some(item => ['door', 'dark', 'day', 'down'].includes(item.toLowerCase())), 'No generic dictionary words included');

// Query 'DE'
let resDE = dict.query('character', 'DE').map(r => r.label);
console.log('Query "DE" results:', resDE);
assert(resDE.includes('DEERAJ') && resDE.includes('DHEENA'), 'Query "DE" shows DEERAJ and DHEENA');
assert(!resDE.includes('ARUN'), 'Query "DE" does not show ARUN');

// Query 'DEE'
let resDEE = dict.query('character', 'DEE').map(r => r.label);
console.log('Query "DEE" results:', resDEE);
assert(resDEE.includes('DEERAJ') && resDEE.includes('DHEENA'), 'Query "DEE" shows DEERAJ and DHEENA');

// Query 'DEER'
let resDEER = dict.query('character', 'DEER').map(r => r.label);
console.log('Query "DEER" results:', resDEER);
assert(resDEER.includes('DEERAJ'), 'Query "DEER" shows DEERAJ');
assert(!resDEER.includes('DHEENA'), 'Query "DEER" strictly excludes DHEENA');

// Exact full match should not suggest itself as an uncompleted word
let resFull = dict.query('character', 'DEERAJ').map(r => r.label);
assert(!resFull.includes('DEERAJ'), 'Query "DEERAJ" suppresses self-suggestion when already fully typed');

// Test 4: Element-Specific Suggestions
console.log('\n[Test 4] Element-Specific Query Isolation');
// Locations
dict.learn('location', 'HOUSE');
dict.learn('location', 'HOSPITAL');
dict.learn('location', 'HOSTEL');
dict.learn('location', 'COFFEE SHOP');

let resLocH = dict.query('location', 'H').map(r => r.label);
console.log('Query location "H" results:', resLocH);
assert(resLocH.includes('HOUSE') && resLocH.includes('HOSPITAL') && resLocH.includes('HOSTEL'), 'Location "H" shows HOUSE, HOSPITAL, HOSTEL');
assert(!resLocH.includes('DEERAJ'), 'Location does not suggest characters');

// Word boundary search in locations
let resLocShop = dict.query('location', 'SHOP').map(r => r.label);
console.log('Query location "SHOP" results:', resLocShop);
assert(resLocShop.includes('COFFEE SHOP'), 'Location "SHOP" matches "COFFEE SHOP" via word boundary');

// Transitions
let resTransC = dict.query('transition', 'C').map(r => r.label);
console.log('Query transition "C" results:', resTransC);
assert(resTransC.includes('CUT TO:'), 'Transition "C" includes CUT TO:');
assert(!resTransC.includes('COFFEE SHOP'), 'Transition does not suggest locations');

// Time of Day
let resTimeD = dict.query('timeOfDay', 'D').map(r => r.label);
console.log('Query timeOfDay "D" results:', resTimeD);
assert(resTimeD.includes('DAY') && resTimeD.includes('DAWN') && resTimeD.includes('DUSK'), 'Time of Day "D" shows DAY, DAWN, DUSK');
assert(!resTimeD.includes('DEERAJ'), 'Time of day does not suggest characters');

// Test 5: Serialization and Deserialization
console.log('\n[Test 5] Serialization & Persistence');
const serialized = dict.serialize();
assert(serialized.characters.length >= 5, 'Serialized characters array contains saved characters');
assert(serialized.locations.length >= 4, 'Serialized locations array contains saved locations');

const newDict = new EntityDictionary();
newDict.deserialize(serialized);
const restoredQuery = newDict.query('character', 'DEER').map(r => r.label);
assert(restoredQuery.includes('DEERAJ'), 'Deserialized dictionary restores learned entities and query works');

// Test 6: Ranking by usage count & recency
console.log('\n[Test 6] Ranking by usage count');
newDict.learn('character', 'DAN');
newDict.learn('character', 'DANNY');
// Boost DANNY multiple times
newDict.learn('character', 'DANNY');
newDict.learn('character', 'DANNY');
newDict.learn('character', 'DANNY');

const resDan = newDict.query('character', 'DAN').map(r => r.label);
console.log('Ranking results for "DAN":', resDan);
assert(resDan[0] === 'DANNY', 'Higher usage entity "DANNY" is ranked above "DAN"');

console.log(`\n--- Test Summary: ${passed} passed, ${failed} failed ---`);
if (failed > 0) process.exit(1);
