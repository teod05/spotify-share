import { getNextFridayDrop, getWeekRange, getPreviousFridayDrop, isInGraceWindow, getWeekForSong, isLatePick } from './time.js';

function test(description, fn) {
    try {
        fn();
        console.log(`✓ ${description}`);
    } catch (error) {
        console.log(`✗ ${description}`);
        console.error(error.message);
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

test('getNextFridayDrop - returns a Friday', () => {
    const nextFriday = getNextFridayDrop();
    const berlinDate = new Date(nextFriday.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }));
    assert(berlinDate.getDay() === 5, 'Should return a Friday in Berlin time');
    assert(berlinDate.getHours() === 18, 'Should be at 18:00 Berlin time');
});

test('getNextFridayDrop - returns future date', () => {
    const nextFriday = getNextFridayDrop();
    const now = new Date();
    assert(nextFriday > now, 'Should return a date in the future');
});

test('getWeekRange - returns correct Monday and Sunday', () => {
    const testFriday = new Date('2024-10-25T16:00:00Z'); // 18:00 Berlin (CEST)
    const { monday, sunday } = getWeekRange(testFriday);
    
    assert(monday.getDay() === 1, 'Monday should be day 1');
    assert(sunday.getDay() === 0, 'Sunday should be day 0');
    assert((sunday - monday) / (1000 * 60 * 60 * 24) === 6, 'Should be 6 days apart');
});

test('getWeekRange - Monday is before Friday', () => {
    const testFriday = new Date('2024-10-25T16:00:00Z');
    const { monday } = getWeekRange(testFriday);
    
    assert(monday <= testFriday, 'Monday should be before or equal to the Friday');
});

test('getPreviousFridayDrop - returns previous Friday', () => {
    const monday = new Date('2024-10-28T10:00:00Z');
    const prevFriday = getPreviousFridayDrop(monday);
    const berlinPrev = new Date(prevFriday.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }));
    
    assert(berlinPrev.getDay() === 5, 'Should return a Friday');
    assert(berlinPrev.getHours() === 18, 'Should be at 18:00');
    assert(prevFriday < monday, 'Should be before the reference date');
});

test('getPreviousFridayDrop - handles Friday before 18:00 Berlin', () => {
    const fridayMorning = new Date('2024-10-25T08:00:00Z'); // 10:00 Berlin
    const prevFriday = getPreviousFridayDrop(fridayMorning);
    const berlinPrev = new Date(prevFriday.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }));
    
    assert(berlinPrev.getDate() === 18, 'Should return previous week Friday');
});

test('getPreviousFridayDrop - handles Friday after 18:00 Berlin', () => {
    const fridayEvening = new Date('2024-10-25T17:00:00Z'); // 19:00 Berlin (CEST)
    const prevFriday = getPreviousFridayDrop(fridayEvening);
    const berlinPrev = new Date(prevFriday.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }));
    
    assert(berlinPrev.getDate() === 25, 'Should return same day Friday');
});

test('isInGraceWindow - true on Friday evening Berlin time', () => {
    const fridayEvening = new Date('2024-10-25T17:00:00Z'); // 19:00 Berlin
    assert(isInGraceWindow(fridayEvening), 'Should be in grace window');
});

test('isInGraceWindow - true on Saturday', () => {
    const saturday = new Date('2024-10-26T10:00:00Z');
    assert(isInGraceWindow(saturday), 'Should be in grace window');
});

test('isInGraceWindow - true on Sunday before midnight Berlin', () => {
    const sunday = new Date('2024-10-27T21:30:00Z'); // 23:30 Berlin
    assert(isInGraceWindow(sunday), 'Should be in grace window');
});

test('isInGraceWindow - false on Monday', () => {
    const monday = new Date('2024-10-28T00:01:00Z'); // Definitely Monday in Berlin
    assert(!isInGraceWindow(monday), 'Should not be in grace window');
});

test('isInGraceWindow - false before Friday 18:00 Berlin', () => {
    const fridayMorning = new Date('2024-10-25T10:00:00Z'); // 12:00 Berlin
    assert(!isInGraceWindow(fridayMorning), 'Should not be in grace window');
});

test('isInGraceWindow - DST spring forward (last Sunday March)', () => {
    const sundayBeforeDST = new Date('2024-03-30T22:30:00Z'); // 23:30 Berlin (CET)
    assert(isInGraceWindow(sundayBeforeDST), 'Should handle DST spring forward');
});

test('isInGraceWindow - DST fall back (last Sunday October)', () => {
    const sundayDST = new Date('2024-10-27T00:30:00Z'); // 02:30 Berlin (CEST before transition)
    assert(isInGraceWindow(sundayDST), 'Should handle DST fall back');
});

test('getWeekForSong - late pick assigns to previous week', () => {
    const fridayEvening = new Date('2024-10-25T18:00:00Z'); // 20:00 Berlin
    const week = getWeekForSong(fridayEvening, false);
    const berlinWeek = new Date(week.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }));
    
    assert(berlinWeek.getDate() === 25, 'Should assign to same Friday');
});

test('getWeekForSong - normal pick assigns to next week', () => {
    const tuesday = new Date('2024-10-22T10:00:00Z');
    const week = getWeekForSong(tuesday, false);
    const berlinWeek = new Date(week.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }));
    
    assert(berlinWeek.getDate() === 25, 'Should assign to next Friday');
});

test('getWeekForSong - grace window with existing pick goes to next week', () => {
    const saturday = new Date('2024-10-26T10:00:00Z');
    const week = getWeekForSong(saturday, true);
    
    assert(week > saturday, 'Should assign to next week when user already has pick');
});

test('isLatePick - true when created after drop', () => {
    const drop = new Date('2024-10-25T16:00:00Z');
    const created = new Date('2024-10-25T18:00:00Z');
    
    assert(isLatePick(created, drop), 'Should be marked as late');
});

test('isLatePick - false when created before drop', () => {
    const drop = new Date('2024-10-25T16:00:00Z');
    const created = new Date('2024-10-25T08:00:00Z');
    
    assert(!isLatePick(created, drop), 'Should not be marked as late');
});

test('Timezone consistency - server TZ should not affect Berlin calculations', () => {
    const testDate = new Date('2024-10-25T17:00:00Z'); // 19:00 Berlin (CEST)
    
    const nextDrop = getNextFridayDrop(testDate);
    const prevDrop = getPreviousFridayDrop(testDate);
    const inGrace = isInGraceWindow(testDate);
    
    const nextBerlin = new Date(nextDrop.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }));
    const prevBerlin = new Date(prevDrop.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }));
    
    assert(nextBerlin.getHours() === 18, 'Next drop should be 18:00 Berlin');
    assert(prevBerlin.getHours() === 18, 'Prev drop should be 18:00 Berlin');
    assert(inGrace === true, 'Should correctly identify grace window regardless of server TZ');
});

console.log('\nAll time utility tests completed');
console.log(`Server timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}\n`);
