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
            "callback_url": "http://localhost:8084/api/callback_test",  // Endpoint to callback on matching transaction
            "max_attempts_expiry": 10,                              // Expire after attempts. See /api/expired
            "max_seconds": 600,                                     // Number of seconds between redelivery attempts
        }
    },
    "connection": {
        "stream_url": "https://stream.bitcoinfiles.org",    // Upstream mempool Server-Sent Events (SSE) endpoint
        "blocks_url": "https://media.bitcoinfiles.org"      // Upstream block deivery endpoint
    },
}
module.exports = config;
