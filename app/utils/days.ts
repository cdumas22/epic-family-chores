export const DAY = {
	monday: 1 << 0,
	tuesday: 1 << 1,
	wednesday: 1 << 2,
	thursday: 1 << 3,
	friday: 1 << 4,
	saturday: 1 << 5,
	sunday: 1 << 6,
}
export const EVERY_DAY = Object.values(DAY).reduce((x, y) => x | y, 0)
export function DayValue(days: number[]) {
	return days.reduce((x, y) => x | y)
}
export function IsDayChecked(value: number, day: number) {
	return !!(value & day)
}
