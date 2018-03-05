const net = require('net')
const { Readable, Writable } = require('stream')

const {
    processHeaders,
    stringifyHeaders,
    addCurrentDateHeader    
        } = require('./utils')

class helperStream extends Writable {
    constructor(socket, requestStream) {
        super()
        this.socket = socket
        this.dest = requestStream
    }
    _write(data, enc, cb) {
        this.socket.pause()
        this.dest.push(data)
        cb()

        return this.dest
    }
}

class HttpRequest extends Readable {
    constructor(socket) {
        super()
        this.socket = socket
        this.headers = {}
    }
    _read(chunk) {
        this.socket.resume()
        this.socket.read()
    }
}

class HttpResponse extends Writable {
    constructor(socket) {
        super()
        this.socket = socket
        this.headers = {}
        this.headersSent = false
        this.statusCode = 200
        this.statusLine = Buffer.from(`HTTP/1.1 ${this.statusCode}\n`)
        addCurrentDateHeader(this.headers)
    }

    _write(data, enc, cb) {
        if(!this.headersSent) {
            this.socket.write(this.statusLine)
            this.socket.write(stringifyHeaders(this.headers).concat('\r\n\r\n'))
            this.headersSent = true
        }
        this.socket.write(data)
        cb()
    }

    setHeader(headerName, value) {
        if (this.headersSent) {
            throw new Error("Can't set headers after sending")
        }
        else if(headerName && value) {
            this.headers[headerName] = value
        } 
        else {
            throw new Error('Missing arguments')
        }
    }

    writeHead(statusCode, statusMessage) {
        if(this.headersSent) {
            throw new Error('Cannot set status when headers are sent')
        }
        this.statusCode = statusCode
        this.statusLine = 
            `HTTP/1.1 ${this.statusCode} ${statusMessage||""}\n`   
        
        this.socket.write(this.statusLine
            .concat(stringifyHeaders(this.headers)),
            'utf-8')
    }
    setStatus(statusCode) {
        if(this.headersSent) {
            throw new Error('Cannot set status when headers are sent')
        }
        this.statusCode = statusCode
    }
}

class HttpServer {
    constructor(port) {
        this.socket = net.createServer(

            (connection) => {
                let request = new HttpRequest(connection)
                let response = new HttpResponse(connection)
                const helper = new helperStream(connection, request)

                let tempHeadersBuffer = Buffer.from('')

                let dataHandler = (data) => {

                    let headersEnd = data.indexOf('\r\n\r\n')
                    if (headersEnd !== -1) {
                        tempHeadersBuffer += data.slice(0, headersEnd)
                        processHeaders(tempHeadersBuffer, request)

                        connection.removeListener('data', dataHandler)
                        connection.pause()
                        
                        this.socket.emit('request', request, response)
                        
                        let nextChunk = Buffer.from(data.slice(headersEnd + '\r\n\r\n'.length))
                        request.unshift(nextChunk)

                        connection.pipe(helper)
                    } else {
                        tempHeadersBuffer += data
                    }
                }

                connection.on('data', dataHandler)
                connection.on('close', () => {
                    console.log('Connection closed')
                })
                connection.on('error', err => console.error(err))
            }
        )

    }
    listen(port) {
        this.socket.listen(port)
        console.log(`Listening to port ${port}`)
    }
    on(event, fn) {
        this.socket.addListener(event, fn)
    }
}

class http {
    static createServer() {
        return new HttpServer()
    }
}

module.exports = http
