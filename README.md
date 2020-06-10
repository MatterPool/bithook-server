# Bithook
> Bitcoin (BSV) Webhook Server
> Created by  <a href='https://matterpool.io'>matterpool.io</a>

Monitor the BSV blockchain in real-time and trigger HTTP webhook callbacks to your applications.

<a href='https://github.com/louischatriot/nedb'>NeDB</a> is used for fast file-system based access (MongoDB compatible syntax)

**Features**:

- REST API for subscribing and unsubscribing addresses
- Notify on mempool and block transactions matching any output address
- Configure multiple callback endpoints ("channels")
- Exponential back-off to retry failed requests

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

## Callback Example

If any transaction in the mempool or blocks being scanned match the addresses, then a callback will be sent in the following format:

If tx merkleproof information is needed, then make a subsequent call to `https://media.bitcoinfiles.org/tx/f62a4f9278cc06aec86232877e1fe8237fe099b355e54359074c6fe3297e6a5f?includeBlock=1` to retrieve the block information (ie: merkle proof) when the block is mined.

`POST <your endpoint url>`

JSON Body:
```
x
```

## Usage API

See `index.js` routes for more details.


#### POST /api/outputs

Add address outputs to monitor to trigger webhook callbacks.

Example: Subscribe to all outputs to Twetch (`1Twetcht1cTUxpdDoX5HQRpoXeuupAdyf`)

Request:

```
{
  "outputs": [
     "1Twetcht1cTUxpdDoX5HQRpoXeuupAdyf"
  ],
  "channel": "main"
}
```

Response:

```
[
    {
        "idx": "1Twetcht1cTUxpdDoX5HQRpoXeuupAdyf_main",
        "f": "1Twetcht1cTUxpdDoX5HQRpoXeuupAdyf",
        "c": "main",
        "_id": "JAjCL49CSckexk8x"
    }
]
```


#### GET /api/outputs

Get all monitored addresses.

Response:

```
[
    {
        "idx": "1Twetcht1cTUxpdDoX5HQRpoXeuupAdyf_main",
        "f": "1Twetcht1cTUxpdDoX5HQRpoXeuupAdyf",
        "c":"main",
        "_id":"JAjCL49CSckexk8x"
    }
]
```


#### DELETE /api/outputs/JAjCL49CSckexk8x

Remove address from being monitored.

Response:

```
{
    "numRemoved": 1
}
```

