export function getNextFridayDrop() {
    const now = new Date()
    const berlinTimeStr = now.toLocaleString('en-US', { timeZone: 'Europe/Berlin' })
    const berlin = new Date(berlinTimeStr)
    const day = berlin.getDay()
    
    let daysUntilFriday = (5 - day + 7) % 7
    
    const nextFriday = new Date(berlin)
    nextFriday.setDate(berlin.getDate() + daysUntilFriday)
    nextFriday.setHours(18, 0, 0, 0)
    
    if (daysUntilFriday === 0 && berlin.getHours() >= 18) {
        nextFriday.setDate(nextFriday.getDate() + 7)
    }
    
    return nextFriday
}

export function getWeekRange(dropDate) {
    const monday = new Date(dropDate)
    const mondayDay = dropDate.getDay()
    const daysFromMonday = mondayDay === 0 ? 6 : mondayDay - 1
    monday.setDate(dropDate.getDate() - daysFromMonday)
    
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    
    return { monday, sunday }
}
