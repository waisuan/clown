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

export function sanitizeSearchTerm(response: string) {
    return response.replace(/\//g, '-');
}

export function sanitizeFormDataForRead(data: {}) {
    var sanitizedData = JSON.parse(JSON.stringify(data));
    if (sanitizedData['tncDate']) {
        var tokens = sanitizedData['tncDate'].split('/');
        sanitizedData['tncDate'] = { year: parseInt(tokens[2]), month: parseInt(tokens[1]), day: parseInt(tokens[0]) };
    }
    if (sanitizedData['ppmDate']) {
        var tokens = sanitizedData['ppmDate'].split('/');
        sanitizedData['ppmDate'] = { year: parseInt(tokens[2]), month: parseInt(tokens[1]), day: parseInt(tokens[0]) };
    }
    return sanitizedData;
}

export function sanitizeFormDataForWrite(data: {}) {
    var sanitizedData = JSON.parse(JSON.stringify(data));
    if (sanitizedData['tncDate']) {
        sanitizedData['tncDate'] = padNumber(sanitizedData['tncDate']['day']) + '/' + padNumber(sanitizedData['tncDate']['month']) + '/' + sanitizedData['tncDate']['year'];
    }
    if (sanitizedData['ppmDate']) {
        sanitizedData['ppmDate'] = padNumber(sanitizedData['ppmDate']['day']) + '/' + padNumber(sanitizedData['ppmDate']['month']) + '/' + sanitizedData['ppmDate']['year'];
    }
    return sanitizedData;
}