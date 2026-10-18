import { getNextFridayDrop, getWeekRange } from './time.js';

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

console.log('\nAll time utility tests completed\n');
