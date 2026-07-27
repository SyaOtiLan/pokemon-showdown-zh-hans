'use strict';

Object.assign(exports, require('./config-example'));

exports.port = 8000;
exports.bindaddress = '0.0.0.0';
exports.backdoor = false;
exports.proxyip = false;
exports.subprocesses = 0;
// Allows local unregistered nicknames when the official login server is unreachable.
exports.noguestsecurity = true;
