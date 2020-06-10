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
{
   "hash":"34c5f736cd07a6c0b246780e3cf5f2025d666d85395615980688ecfe385dfa21",
   "version":1,
   "inputs":[
      {
         "prevTxId":"0bb2cbb917527c8015e3c9e61110da79ca997aa6f88c37f6876d23efcd6acd80",
         "outputIndex":4,
         "sequenceNumber":4294967295,
         "script":"473044022059b46d75d51d64c2cfff771f36844bab13564b192cff24f7c9bf078dac4c33d402202893771aad65c7e171b6e6bf8bf3390399900c890b1b0516dbb1eb0b182a98d941210329a068a42332431e78313b3e802300666821373982bab5090ccb1d5d468dbc27",
         "scriptString":"71 0x3044022059b46d75d51d64c2cfff771f36844bab13564b192cff24f7c9bf078dac4c33d402202893771aad65c7e171b6e6bf8bf3390399900c890b1b0516dbb1eb0b182a98d941 33 0x0329a068a42332431e78313b3e802300666821373982bab5090ccb1d5d468dbc27"
      }
   ],
   "outputs":[
      {
         "satoshis":0,
         "script":"006a2231394878696756345179427633744870515663554551797131707a5a56646f4175744cc74966206d6f6e65792069732061207a65726f2073756d2067616d652c20776f756c646ee2809974207468652067616d65206861766520616c7265616479206265656e20776f6e2077697468206120626c6f636b2073697a6520696e6372656173653f0a0a4c6f6f6b7320746f206d65206c696b65206120736d616c6c206e756d626572206f6620666f6c6b73207370656e742076617374207265736f757263657320746f206576616e67656c697a6520746f206f74686572732e204032393536204034313739200a746578742f706c61696e04746578741f7477657463685f7477746578745f313539313730303638343338392e747874017c223150755161374b36324d694b43747373534c4b79316b683536575755374d74555235035345540b7477646174615f6a736f6e046e756c6c0375726c046e756c6c07636f6d6d656e74046e756c6c076d625f75736572053232393833057265706c794062313734393239333263633331393634306433303630353365343336663133306361633563323032663435613038343931363061386233663239383937326461047479706504706f73740974696d657374616d70046e756c6c036170700674776574636807696e766f6963652430303433366437392d386563302d343631642d386136352d646639626663373463656661017c22313550636948473232534e4c514a584d6f53556157566937575371633768436676610d424954434f494e5f4543445341223134557a61744b56697178536a78746b576b694b4e624842553646666f4c644252504c5849415a5a695265334548556d6136792f665257415677396e43462b3538632f4b6f51545a712f376f6771422f556367364e2b74554e633569776b717a5a7a4c477747504e3874347a417050515445717771485a3941686f3d"
      },
      {
         "satoshis":546,
         "script":"76a914d1da37a942140e9f3f2fd155d39d9c6c8461375888ac"
      },
      {
         "satoshis":2639,
         "script":"76a9141793421449a6b1596490095389a0bf265479bc6f88ac"
      },
      {
         "satoshis":2639,
         "script":"76a914adb466001190708014a0f26ec9e921b107c596e788ac"
      },
      {
         "satoshis":4750,
         "script":"76a91405186ff0710ed004229e644c0653b2985c648a2388ac"
      },
      {
         "satoshis":5278,
         "script":"76a9149fe90d66610b4381771792798ca2b9fe5d94ab5088ac"
      },
      {
         "satoshis":8676,
         "script":"76a9141db56bb4c09fd23315dc13619a5fb29a044acb0488ac"
      }
   ],
   "nLockTime":0
}
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

