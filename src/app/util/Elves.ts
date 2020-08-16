export function isNumber(value: any): value is number {
    return !isNaN(toInteger(value))
}

export function toInteger(value: any): number {
    return parseInt(`${value}`, 10)
}

export function padNumber(value: number) {
    if (isNumber(value)) {
        return `0${value}`.slice(-2)
    } else {
        return ''
    }
}

export function sanitizeSearchTerm(response: string) {
    return response.replace(/\//g, '-')
}

export function sanitizeFormDataForRead(data: {}) {
    var sanitizedData = JSON.parse(JSON.stringify(data))
    if (sanitizedData['tncDate']) {
        var tokens = sanitizedData['tncDate'].split('-')
        sanitizedData['tncDate'] = { year: parseInt(tokens[0]), month: parseInt(tokens[1]), day: parseInt(tokens[2]) }
    }
    if (sanitizedData['ppmDate']) {
        var tokens = sanitizedData['ppmDate'].split('-')
        sanitizedData['ppmDate'] = { year: parseInt(tokens[0]), month: parseInt(tokens[1]), day: parseInt(tokens[2]) }
    }
    if (sanitizedData['workOrderDate']) {
        var tokens = sanitizedData['workOrderDate'].split('-')
        sanitizedData['workOrderDate'] = { year: parseInt(tokens[0]), month: parseInt(tokens[1]), day: parseInt(tokens[2]) }
    }    
    return sanitizedData
}

export function sanitizeFormDataForWrite(data: {}) {
    var sanitizedData = JSON.parse(JSON.stringify(data))
    if (sanitizedData['tncDate']) {
        sanitizedData['tncDate'] = sanitizedData['tncDate']['year'] + '-' + padNumber(sanitizedData['tncDate']['month']) + '-' + padNumber(sanitizedData['tncDate']['day'])
    }
    if (sanitizedData['ppmDate']) {
        sanitizedData['ppmDate'] = sanitizedData['ppmDate']['year'] + '-' + padNumber(sanitizedData['ppmDate']['month']) + '-' + padNumber(sanitizedData['ppmDate']['day'])
    }
    if (sanitizedData['workOrderDate']) {
        sanitizedData['workOrderDate'] = sanitizedData['workOrderDate']['year'] + '-' + padNumber(sanitizedData['workOrderDate']['month']) + '-' + padNumber(sanitizedData['workOrderDate']['day'])
    }   
    return sanitizedData
}