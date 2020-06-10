# Bithook
> Bitcoin (BSV) Webhook Server
> Created by  <a href='https://matterpool.io'>matterpool.io</a>

Monitor the BSV blockchain in real-time and trigger HTTP webhook callbacks to your applications.

<a href='https://github.com/louischatriot/nedb'>NeDB</a> is used for fast file-system based access (MongoDB compatible syntax)

**Links**:

- <a href='https://matterpool.io'>matterpool.io</a>

## Installation

Requirements:
- Node 10+

Sample configuration (config.js):

```javascript
var config = {
    "api": {
        "listen_port": 8084,                                // Listen port for REST API
        "access_control_allow_origin": '*',                 // Optional. Set to FQDN.
    },
    "init_height": 638577,      // Initial sync height on very first start
    "from_mempool": true,       // Callback for transactions matched from mempool stream
    "from_blocks": true,        // Callback for transactions matched in new blocks
    "channels": {
        "main": {
            "secret": "secrett0ken1293",                            // Posted to callback endpoint
            "callback_url": "https://localhost:8082/foo/bar",       // Endpoint to callback on matching transaction
            "max_attempts_expiry": 10,                              // Expire after attempts. See /api/expired
            "max_seconds": 300,                                     // Number of seconds between redelivery attempts
            "col_name": "main",                                     // Do not change. DB mapping field.
        }
    },
    "connection": {
        "stream_url": "https://stream.bitcoinfiles.org",    // Upstream mempool Server-Sent Events (SSE) endpoint
        "blocks_url": "https://media.bitcoinfiles.org"      // Upstream block deivery endpoint
    },
}
module.exports = config;

```

```sh
npm install

# Start service
node index.js
```

## Installation