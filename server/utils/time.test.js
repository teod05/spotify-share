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
    assert(nextFriday.getDay() === 5, 'Should return a Friday');
    assert(nextFriday.getHours() === 18, 'Should be at 18:00');
    assert(nextFriday.getMinutes() === 0, 'Should be at exactly 18:00');
});

test('getNextFridayDrop - returns future date', () => {
    const nextFriday = getNextFridayDrop();
    const now = new Date();
    assert(nextFriday > now, 'Should return a date in the future');
});

test('getWeekRange - returns correct Monday and Sunday', () => {
    const testFriday = new Date('2024-10-25T18:00:00');
    const { monday, sunday } = getWeekRange(testFriday);
    
    assert(monday.getDay() === 1, 'Monday should be day 1');
    assert(sunday.getDay() === 0, 'Sunday should be day 0');
    assert((sunday - monday) / (1000 * 60 * 60 * 24) === 6, 'Should be 6 days apart');
});

test('getWeekRange - Monday is before Friday', () => {
    const testFriday = new Date('2024-10-25T18:00:00');
    const { monday } = getWeekRange(testFriday);
    
    assert(monday <= testFriday, 'Monday should be before or equal to the Friday');
});

test('getPreviousFridayDrop - returns previous Friday', () => {
    const monday = new Date('2024-10-28T12:00:00');
    const prevFriday = getPreviousFridayDrop(monday);
    
    assert(prevFriday.getDay() === 5, 'Should return a Friday');
    assert(prevFriday.getHours() === 18, 'Should be at 18:00');
    assert(prevFriday < monday, 'Should be before the reference date');
});

test('getPreviousFridayDrop - handles Friday before 18:00', () => {
    const fridayMorning = new Date('2024-10-25T10:00:00');
    const prevFriday = getPreviousFridayDrop(fridayMorning);
    
    assert(prevFriday.getDate() === 18, 'Should return previous week Friday');
});

test('getPreviousFridayDrop - handles Friday after 18:00', () => {
    const fridayEvening = new Date('2024-10-25T20:00:00');
    const prevFriday = getPreviousFridayDrop(fridayEvening);
    
    assert(prevFriday.getDate() === 25, 'Should return same day Friday');
});

test('isInGraceWindow - true on Friday evening', () => {
    const fridayEvening = new Date('2024-10-25T20:00:00');
    assert(isInGraceWindow(fridayEvening), 'Should be in grace window');
});

test('isInGraceWindow - true on Saturday', () => {
    const saturday = new Date('2024-10-26T12:00:00');
    assert(isInGraceWindow(saturday), 'Should be in grace window');
});

test('isInGraceWindow - true on Sunday before midnight', () => {
    const sunday = new Date('2024-10-27T23:30:00');
    assert(isInGraceWindow(sunday), 'Should be in grace window');
});

test('isInGraceWindow - false on Monday', () => {
    const monday = new Date('2024-10-28T00:00:00');
    assert(!isInGraceWindow(monday), 'Should not be in grace window');
});

test('isInGraceWindow - false before Friday 18:00', () => {
    const fridayMorning = new Date('2024-10-25T12:00:00');
    assert(!isInGraceWindow(fridayMorning), 'Should not be in grace window');
});

test('isInGraceWindow - DST spring forward (last Sunday March)', () => {
    const sundayBeforeDST = new Date('2024-03-31T01:30:00');
    assert(isInGraceWindow(sundayBeforeDST), 'Should handle DST spring forward');
});

test('isInGraceWindow - DST fall back (last Sunday October)', () => {
    const sundayBeforeDST = new Date('2024-10-27T02:30:00');
    assert(isInGraceWindow(sundayBeforeDST), 'Should handle DST fall back');
});

test('getWeekForSong - late pick assigns to previous week', () => {
    const fridayEvening = new Date('2024-10-25T20:00:00');
    const week = getWeekForSong(fridayEvening, false);
    
    assert(week.getDate() === 25, 'Should assign to same Friday');
});

test('getWeekForSong - normal pick assigns to next week', () => {
    const tuesday = new Date('2024-10-22T12:00:00');
    const week = getWeekForSong(tuesday, false);
    
    assert(week.getDate() === 25, 'Should assign to next Friday');
});

test('getWeekForSong - grace window with existing pick goes to next week', () => {
    const saturday = new Date('2024-10-26T12:00:00');
    const week = getWeekForSong(saturday, true);
    
    assert(week > saturday, 'Should assign to next week when user already has pick');
});

test('isLatePick - true when created after drop', () => {
    const drop = new Date('2024-10-25T18:00:00');
    const created = new Date('2024-10-25T20:00:00');
    
    assert(isLatePick(created, drop), 'Should be marked as late');
});

test('isLatePick - false when created before drop', () => {
    const drop = new Date('2024-10-25T18:00:00');
    const created = new Date('2024-10-25T10:00:00');
    
    assert(!isLatePick(created, drop), 'Should not be marked as late');
});

console.log('\nAll time utility tests completed\n');
