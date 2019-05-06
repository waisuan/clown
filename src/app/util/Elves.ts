export function isNumber(value: any): value is number {
    return !isNaN(toInteger(value));
}

export function toInteger(value: any): number {
    return parseInt(`${value}`, 10);
}

export function padNumber(value: number) {
    if (isNumber(value)) {
        return `0${value}`.slice(-2);
    } else {
        return '';
    }
}