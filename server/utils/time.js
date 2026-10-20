import { toZonedTime, fromZonedTime } from 'date-fns-tz';

const BERLIN_TZ = 'Europe/Berlin';

export function getNextFridayDrop(referenceDate = new Date()) {
    const berlin = toZonedTime(referenceDate, BERLIN_TZ);
    const day = berlin.getDay();
    
    let daysUntilFriday = (5 - day + 7) % 7;
    
    const nextFriday = new Date(berlin);
    nextFriday.setDate(berlin.getDate() + daysUntilFriday);
    nextFriday.setHours(18, 0, 0, 0);
    
    if (daysUntilFriday === 0 && berlin.getHours() >= 18) {
        nextFriday.setDate(nextFriday.getDate() + 7);
    }
    
    return fromZonedTime(nextFriday, BERLIN_TZ);
}

export function getWeekRange(dropDate) {
    const monday = new Date(dropDate);
    const mondayDay = dropDate.getDay();
    const daysFromMonday = mondayDay === 0 ? 6 : mondayDay - 1;
    monday.setDate(dropDate.getDate() - daysFromMonday);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    return { monday, sunday };
}

export function getPreviousFridayDrop(referenceDate = new Date()) {
    const berlin = toZonedTime(referenceDate, BERLIN_TZ);
    const day = berlin.getDay();
    
    let daysFromFriday = (day - 5 + 7) % 7;
    
    const previousFriday = new Date(berlin);
    previousFriday.setDate(berlin.getDate() - daysFromFriday);
    previousFriday.setHours(18, 0, 0, 0);
    
    if (daysFromFriday === 0 && berlin.getHours() < 18) {
        previousFriday.setDate(previousFriday.getDate() - 7);
    }
    
    return fromZonedTime(previousFriday, BERLIN_TZ);
}

export function isInGraceWindow(date = new Date()) {
    const lastDrop = getPreviousFridayDrop(date);
    const berlinLastDrop = toZonedTime(lastDrop, BERLIN_TZ);
    
    const graceEnd = new Date(berlinLastDrop);
    graceEnd.setDate(graceEnd.getDate() + 2);
    graceEnd.setHours(23, 59, 59, 999);
    
    const graceEndUTC = fromZonedTime(graceEnd, BERLIN_TZ);
    
    return date >= lastDrop && date <= graceEndUTC;
}

export function getWeekForSong(createdAt, userHasPickForPreviousWeek) {
    if (isInGraceWindow(createdAt) && !userHasPickForPreviousWeek) {
        return getPreviousFridayDrop(createdAt);
    }
    
    return getNextFridayDrop(createdAt);
}

export function isLatePick(createdAt, dropAt) {
    return createdAt > dropAt;
}
