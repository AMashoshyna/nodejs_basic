
const stringifyHeaders = (obj) => {
    let headers = ''
    Object.keys(obj).forEach(header => {
        headers += `${header}: ${obj[header]}\n`
    })
    headers += '\r\n'
    return headers
}

function addCurrentDateHeader(headersObj) {
    Object.defineProperty(headersObj, '_date', {
        enumerable: false,
        writable: true,
        configurable: true
    })
    Object.defineProperty(headersObj, 'Date', {
        enumerable: true,
        configurable: true,
        get() {
            headersObj._date = new Date(Date.now()).toUTCString()
            return headersObj._date
        },
        set(val) {
            headersObj._date = val
        }

    })
    return headersObj
}

function processHeaders(buf, req) {
    let headers = buf.toString()
    if(headers) {
        headers.split('\r\n')
            .forEach((element, index) => {
                if(index == 0) {
                    let [method, url] = element.split(' ')
                    req.method = method
                    req.url = url
                } else {
                    let title = element.slice(0, element.indexOf(':'))
                    let value = element.slice(element.indexOf(':')+2).trim()
                    req.headers[title] = value
                }
            })
    }
}

module.exports = {
    processHeaders,
    stringifyHeaders,
    addCurrentDateHeader    
}