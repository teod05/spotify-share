import { toZonedTime } from 'date-fns-tz';

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

function shouldDropRun(date) {
    const berlin = toZonedTime(date, 'Europe/Berlin');
    const day = berlin.getDay();
    const hour = berlin.getHours();
    
    return day === 5 && hour === 18;
}

test('Drop guard - allows Friday 18:00 Berlin (CEST)', () => {
    const friday18 = new Date('2024-10-25T16:00:00Z'); // 18:00 Berlin (UTC+2)
    assert(shouldDropRun(friday18), 'Should allow drop at Friday 18:00 Berlin');
});

test('Drop guard - allows Friday 18:30 Berlin', () => {
    const friday1830 = new Date('2024-10-25T16:30:00Z');
    assert(shouldDropRun(friday1830), 'Should allow drop at Friday 18:30 Berlin');
});

test('Drop guard - allows Friday 18:59 Berlin', () => {
    const friday1859 = new Date('2024-10-25T16:59:00Z');
    assert(shouldDropRun(friday1859), 'Should allow drop at Friday 18:59 Berlin');
});

test('Drop guard - blocks Friday 17:00 Berlin (winter schedule would fire here)', () => {
    const friday17 = new Date('2024-10-25T15:00:00Z'); // 17:00 Berlin
    assert(!shouldDropRun(friday17), 'Should block drop at Friday 17:00 Berlin');
});

test('Drop guard - blocks Friday 19:00 Berlin', () => {
    const friday19 = new Date('2024-10-25T17:00:00Z');
    assert(!shouldDropRun(friday19), 'Should block drop at Friday 19:00 Berlin');
});

test('Drop guard - blocks Thursday 18:00 Berlin', () => {
    const thursday18 = new Date('2024-10-24T16:00:00Z');
    assert(!shouldDropRun(thursday18), 'Should block drop on Thursday');
});

test('Drop guard - blocks Saturday 18:00 Berlin', () => {
    const saturday18 = new Date('2024-10-26T16:00:00Z');
    assert(!shouldDropRun(saturday18), 'Should block drop on Saturday');
});

test('Drop guard - Friday 18:00 Berlin in winter (CET = UTC+1)', () => {
    const winterFriday18 = new Date('2024-12-20T17:00:00Z'); // 18:00 Berlin (UTC+1)
    assert(shouldDropRun(winterFriday18), 'Should allow drop at Friday 18:00 Berlin in winter');
});

test('Drop guard - Friday 17:00 Berlin in winter (16:00 UTC schedule)', () => {
    const winterFriday17 = new Date('2024-12-20T16:00:00Z'); // 17:00 Berlin
    assert(!shouldDropRun(winterFriday17), 'Should block 16:00 UTC winter schedule (17:00 Berlin)');
});

console.log('\nAll drop guard tests completed\n');
