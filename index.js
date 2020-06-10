/**
 * Bithook: Bitcoin Webhook Server
 *
 * Webhook callback server capability of scanning 10,000's of addresses, scripthashes, or outpoints.
 *
 * Features:
 *
 * - REST API for adding and removing outputs.
 * - NeDB (MongoDB) compatible fast file-based database
 *
 * See: https://github.com/matterpool/bithook-server
 *
 */
const fetch = require('node-fetch');
const express = require('express');
const app = express();
const version = require('./package.json').version;
const cors = require('cors');
const compression = require('compression');
const bitcoinfiles = require('bitcoinfiles-sdk');
const backoff = require('exponential-backoff');

global.debug = false;
const config = require('./config.js');
const bsv = require('bsv');
// Initialize the nedb persistence (Fast file system based subset of mongodb)
const Datastore = require('nedb');
const db = new Datastore({ filename: './bithook_subscribed_outputs.nedb', autoload: true });
// Using a unique constraint with the index
db.ensureIndex({ fieldName: 'idx', unique: true }, function (err) {
	// Nothing to do
});
// Index for fast script/address searching
db.ensureIndex({ fieldName: 'f', unique: false }, function (err) {
	// Nothing to do
});
const bodyParser = require('body-parser');

function invokeHttpEndpoint(url, secret, tx) {
	console.log('invokeHttpEndpoint', url, 'with tx:', tx.hash);
	return fetch(url + '?secret=' + secret, {
        method: 'post',
        body:    JSON.stringify(tx),
        headers: { 'Content-Type': 'application/json' },
    })
}

/**
 * Insert a notification into the callback queue
 * @param {} e Transaction data to callback
 */
let insertCallbackQueue = async (tx, channel, f) => {
	console.log('insertCallbackQueue', tx.hash, channel, f);
	if (!config.channels[channel]) {
		console.log('Channel not configured', channel);
		return;
	}
	try {
		const response = await backoff.backOff(
			() => invokeHttpEndpoint(config.channels[channel].callback_url, config.channels[channel].secret, tx),
			{
				maxDelay: config.channels[channel].max_seconds * 1000,
				numOfAttempts: config.channels[channel].max_attempts_expiry
			}
		);
		console.log('insertCallbackQueue Response', tx.hash, channel, f, response);
		// process response
	} catch (e) {
		console.log('insertCallbackQueue', e);
	}
}

/**
 * Process a matched transaction
 * @param {} e Transaction data to callback
 */
let createQueueTask = (rawtx) => {
	let tx;
	try {
		tx = new bsv.Transaction(rawtx);
	} catch (err){
		console.log('createQueueTask err', err);
		return;
	}
	console.log('createQueueTask', tx.hash);

	for (const o of tx.outputs) {
		try {
			const address = bsv.Address.fromScript(o.script).toString();
			db.find({ f: address }, function (err, docs) {
				if (err) {
					console.log('err', err);
					return;
				}
				if (docs && docs.length) {
					console.log('Found matching address', address, docs);
					for (const doc of docs) {
						insertCallbackQueue(tx, doc.c, doc.f);
					}
				}
			});
		} catch (ex) {
			// Not an address
			continue;
		}
	}
}

/**
 * Process a matched transaction
 * @param {} e Transaction data to callback
 */
let triggerWebhook = (e) => {
	if (e.raw) {
		createQueueTask(e.raw);
		return;
	}

	// The tx is too large, therefore fetch via the rawtx_url
	fetch(e.rawtx_url)
	.then(res => res.text())
	.then((rawtx) =>  {
		createQueueTask(rawtx);
	})
	.catch((err) => {
		console.log('triggerWebhook', err);
	});
}

/**
 *
 *
 * Initialize the blockchain scanner to monitor all transactions
 *
 *
 */
const scanner = bitcoinfiles.scanner({
	media_base: 'http://localhost:8082',
	initHeight: config.init_height,     // Start crawling at this height from very first time
	saveUpdatedHeight: true, 			// Save last height to file on disk to not start over again
	fromMempool: config.from_mempool,   // include mempool or not
	fromBlocks: config.from_blocks,   	// include mempool or not
	debug: false
})
.filter({
	baseFilter: '01234567891234',	    // Initially not used. Overwritten when output added/deleted.
	outputFilter: null,
	outputFilterId: null,
})
.mempool((e, self) => {
	if (self.debug) {
		console.log('mempool', e);
	}
	// If there is no 'raw', then it means the transaction is too big
	if (!e.raw) {
		// e.rawtx_url contains the full raw transaction
		// Retrieve and do something with it
	} else {
		// const tx = new bsv.Transaction(e.raw);
		// Do something with the transaction...
	}
	triggerWebhook(e);
})
.block((block, self) => {
	for (const e of block.tx) {
		if (self.debug) {
			// console.log('blocktx', e);
		}
		// If there is no 'raw', then it means the transaction is too big
		if (!e.raw) {
			// e.rawtx_url contains the full raw transaction
			// Retrieve and do something with it
		} else {
			// const tx = new bsv.Transaction(e.raw);
			// Do something with the transaction...
		}
		triggerWebhook(e);
	}
})
.error((err, self) => {
 	console.log(err);
});

/**
 * Track the outputs(address, scripthash, tx, tx-vout) that are being monitored
 */
let lastOutputFilterId = null;
let reloadOutputs = () => {
	db.find({}, async (err, docs) => {
		if (err) {
			console.log('err', err);
			return;
		}
		const outputFilters = [];
		for (const doc of docs) {
			outputFilters.push(doc.f);
		}
		if (!outputFilters.length){
			scanner.stop();
			return;
		}
		const saveResult = await bitcoinfiles.instance().saveOutputFilter(outputFilters);
		/*
		{
			"result": {
			// outputFilterId created
			"id": "8d2267f19a9e8524e3d253631e19bf163bcefb5de74e1ad86c36365afe2a3f87"
			},
			"success": true,
		}
		*/
		// Update the filter to monitor for updated outputs
		console.log('Filter updating...', 'NewFilter', saveResult.result.id, "PrevFilter", lastOutputFilterId);
		lastOutputFilterId = saveResult.result.id;
		scanner.filter({
			baseFilter: null,
			outputFilter: null,
			outputFilterId: lastOutputFilterId,
		});
		scanner.start();
	});
};

let start = async () => {
	reloadOutputs();
	app.use(bodyParser.json({limit: '10mb'}));
	app.use(bodyParser.urlencoded({ extended: false }));
	app.use(cors());
	app.use(compression());
	app.use(function (req, res, next) {
		// Website you wish to allow to connect
		res.setHeader('Access-Control-Allow-Origin', config.api.access_control_allow_origin  ? config.api.access_control_allow_origin  : '*');
		// Request methods you wish to allow
		res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
		// Request headers you wish to allow
		res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
		// Set to true if you need the website to include cookies in the requests sent
		// to the API (e.g. in case you use sessions)
		// res.setHeader('Access-Control-Allow-Credentials', true);
		// Pass to next layer of middleware
		next();
	});

	app.get('/', (req, res) => res.send('Bithook Ready'));

	/**
	 *  Get outputs that are being monitored
	 */
	app.get('/api/outputs', function (req, res) {
		db.find({}, function (err, docs) {
			if (err) {
				return res.status(500).json({
					error: err
				});
			}
			res.json(docs);
		});
	});
	/**
	 * Insert outputs to monitor
	 */
	app.post('/api/outputs', async (req, res) => {
		if (!req.body.outputs) {
			return res.status(422).json({
				error: 'outputs field required'
			});
		}
		if (!req.body.channel) {
			return res.status(422).json({
				error: 'channel field required'
			});
		}
		let outputs = [];
		for (const o of req.body.outputs) {
			outputs.push({
				idx: o + '_' +req.body.channel,	// Create a 'composite' index
				f: o,							// Output filter.  Can be address, scripthash, outpoint, arbitrary hex scriptt
				c: req.body.channel				// Channel to notify callback
			});
		}
		db.insert(outputs, function (err, newDocs) {
			if (err) {
				return res.status(500).json({
					error: err
				});
			}
			reloadOutputs();
			res.json(newDocs);
		});
	});

	/**
	 * Delete output monitoring
	 */
	app.delete('/api/outputs/:id', async (req, res) => {
		db.remove({ _id: req.params.id }, {}, function (err, numRemoved) {
			if (err) {
				return res.status(500).json({
					error: err
				});
			}
			reloadOutputs();
			res.json({
				numRemoved
			});
		});
	});

	/**
	 * Callback tester endpoint for debugging
	 */
	app.post('/api/callback_test', async (req, res) => {
		console.log('callback_test:', req.body, req.query.secret);
		/**
		 * If tx merkleproof information is needed, then make a subsequent call to
		 * `https://media.bitcoinfiles.org/tx/f62a4f9278cc06aec86232877e1fe8237fe099b355e54359074c6fe3297e6a5f?includeBlock=1`
		 * to retrieve the block information (ie: merkle proof) when the block is mined.
		 */
		res.json(req.body);
	});

	app.listen(config.api.listen_port, () =>
		console.log(`Bithook Listening on ${config.api.listen_port} ...\n  Version: ${version}`)
	);
};

start();
