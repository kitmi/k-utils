"use strict";

require('debug')('tracing')(__filename);

// Built-in libs
const URL = require('url');
const QS = require('querystring');
const _ = require('lodash');
const childProcess = require('child_process');
const path = require('path');

class BreakContractError extends Error {
    /**
     * Unexpected behavior against the design purpose, only thrown in {@link module:Utilities.contract}
     * @constructs module:Utilities:BreakContractError
     * @extends Error
     * @param {string} principle - Design principle description
     */
    constructor(principle) {
        super(principle ? principle : 'Design contract Violation.');

        /**
         * Name of the error class
         * @member {string}
         */
        this.name = 'BreakContractError';
    }
}

/**
 * A pure closure to be called to check the status under certain conditions
 * @callback module:Utilities.purePredicateFunction
 * @returns {boolean}
 */


/**
 * @module Utilities
 * @summary Collection of utilities.
 */

let U = module.exports = {

    //exports commonly-used utility class

    /**
     * A utility-belt library for JavaScript that provides support for the usual functional suspects (each, map, reduce, filter...) without extending any core JavaScript objects.
     * See {@link https://lodash.com}
     * @member {lodash}
     */
    _: _,

    /**
     * Contains methods that aren't included in the vanilla JavaScript string such as escaping html, decoding html entities, stripping tags, etc.
     * See {@link http://stringjs.com}
     * @member {String}
     */
    get S() { return require('string'); },

    /**
     * Methods that aren't included in the native fs module and adds promise support to the fs methods. It should be a drop in replacement for fs.
     * See {@link https://www.npmjs.com/package/fs-extra}
     * @member {FileSystem}
     */
    get fs() { return require('fs-extra'); },

    /**
     * Match files using the patterns the shell uses, like stars and stuff.
     * See {@link https://www.npmjs.com/package/glob}
     * @member {glob}
     */
    get glob() { return require('glob'); },

    /**
     * Generator based control flow goodness for nodejs and the browser, using promises, letting you write non-blocking code in a nice-ish way.
     * See {@link https://www.npmjs.com/package/co}
     * @member {co}
     */
    get co() { return require('co'); },

    /**
     * Higher-order functions and common patterns for asynchronous code.
     * See {@link http://caolan.github.io/async}
     * @member {async}
     */
    get async() { return require('async'); },

    /**
     * Execute a shell command
     * @param {string} cmd - Command line to execute
     * @param cb - Callback
     * @returns {*|Array|{index: number, input: string}}
     */
    runCmd(cmd, cb) {
        const exec = childProcess.exec;

        return exec(cmd, function (error, stdout, stderr) {
            let output = { stdout, stderr };

            cb(error, output);
        });
    },

    /**
     * Execute a shell command synchronously
     * @param {string} cmd - Command line to execute
     * @returns {*|Array|{index: number, input: string}}
     */
    runCmdSync(cmd) {
        const exec = childProcess.execSync;
        return exec(cmd).toString();
    },

    /**
     * Load a js file in sand box.
     * @param {string} file - Source file
     * @param {object} variables - Variables as global
     * @param {object} deps = Dependencies
     * @returns {Promise}
     */
    load(file, variables, deps) {
        let System = require('systemjs');
        let loader = new System.constructor();

        if (variables) {
            loader.config({'global': variables});
        }

        if (deps) {
            for (let k in deps) {
                loader.set(k, deps[k]);
            }
        }

        return loader.import(file);
    },

    /**
     * Wrap a generator to be a callback-style async function
     * @param gen
     * @param cb
     * @param args
     * @returns {*|Promise|Function|any}
     */
    coWrap: function (gen, cb, ...args) {
        return U.co.wrap(gen)(...args).then(result => cb(null, result)).catch(reason => cb(reason || new Error()));
    },

    //debug related-----------

    /**
     * To place a design-by-contract predication, skipped checking in production environment
     * @param {module:Utilities.purePredicateFunction} predicate
     * @param {text} principle
     */
    contract: function (predicate, principle) {
        if (process.env.NODE_ENV && process.env.NODE_ENV === 'production') return;

        if (!predicate()) {
            throw new BreakContractError(principle);
        }
    },

    //async related-----------

    /**
     * Run an array of promise factory sequentially.
     * @param arrayOfPromiseFactory
     * @returns {Promise}
     * @example
     * let array = [ ... ];
     * Util.eachPromise(_.map(array, a => (lastResult) => new Promsie(...))).then(lastResult => { ... });
     */
    eachPromise: function (arrayOfPromiseFactory) {
        var accumulator = [];
        var ready = Promise.resolve(null);

        arrayOfPromiseFactory.forEach(promiseFactory => {
            ready = ready.then(promiseFactory).then(value => {
                accumulator.push(value);
            });
        });

        return ready.then(() => accumulator);
    },

    //url related-----------

    /**
     * Merge the query parameters into given url.
     * @param {string} url - Original url.
     * @param {object} query - Key-value pairs query object to be merged into the url.
     * @returns {string}
     */
    urlAppendQuery: function (url, query) {
        if (!query) return url;

        if (url.indexOf('?') === -1) {
            if (typeof query !== 'string') {
                return url + '?' + QS.stringify(query);
            }

            return url + '?' + query;
        }

        var urlObj = URL.parse(url, true);
        if (typeof query !== 'string') {
            delete urlObj.search;
            Object.assign(urlObj.query, query);
        } else {
            urlObj.search += '&' + query;
        }

        return URL.format(urlObj);
    },

    /**
     * Join url parts by adding necessary '/', query not supported, use urlAppendQuery instead.
     * @param {string} base - Left part
     * @param {array} parts - The rest of Url component parts
     * @returns {string}
     */
    urlJoin: function (base, ...parts) {
        base = U.trimRightSlash(base);

        if (!parts || parts.length === 0) {
            return base;
        }

        return base + U.ensureLeftSlash(parts.join('/'));
    },

    /**
     * Trim left '/' of a path.
     * @param {string} path - The path
     * @returns {string}
     */
    trimLeftSlash: function (path) {
        return U.S(path).chompLeft('/').s;
    },

    /**
     * Trim right '/' of a path.
     * @param {string} path - The path
     * @returns {string}
     */
    trimRightSlash: function (path) {
        return U.S(path).chompRight('/').s;
    },

    /**
     * Add a '/' to the left of a path if it does not have one.
     * @param {string} path - The path
     * @returns {string}
     */
    ensureLeftSlash: function (path) {
        return U.S(path).ensureLeft('/').s;
    },

    /**
     * Add a '/' to the right of a path if it does not have one.
     * @param {string} path - The path
     * @returns {string}
     */
    ensureRightSlash: function (path) {
        return U.S(path).ensureRight('/').s;
    },

    /**
     * Quote a string.
     * @param {string} str
     * @param {string} quoteChar
     * @returns {string}
     */
    quote: function (str, quoteChar = '"') {
        return quoteChar + str.replace(quoteChar, "\\" + quoteChar) + quoteChar;
    },

    /**
     * Bin to hex, like 0x7F
     * @param {binary} bin
     * @returns {string}
     */
    bin2Hex: function (bin) {
        bin = bin.toString();
        return '0x' + _.range(bin.length).map(i => bin.charCodeAt(i).toString(16)).join('');
    },

    //collection related-----------

    /**
     * Get a value by dot-separated path from a collection
     * @param {object} collection - The collection
     * @param {string} keyPath - A dot-separated path (dsp), e.g. settings.xxx.yyy
     * @param {object} [defaultValue] - The default value if the path does not exist
     * @returns {*}
     */
    getValueByPath: function (collection, keyPath, defaultValue) {
        let nodes = keyPath.split('.'),
            value = collection;

        if (_.isUndefined(value)) {
            return defaultValue;
        }

        if (nodes.length === 0) return null;

        U._.find(nodes, function(e) {
            value = value[e];
            return typeof value === 'undefined';
        });

        return value || defaultValue;
    },

    /**
     * Set a value by dot-separated path from a collection
     * @param {object} collection - The collection
     * @param {string} keyPath - A dot-separated path (dsp), e.g. settings.xxx.yyy
     * @param {object} value - The default value if the path does not exist
     * @returns {*}
     */
    setValueByPath: function (collection, keyPath, value) {
        let nodes = keyPath.split('.');
        let lastKey = nodes.pop();
        let lastNode = collection;

        U._.each(nodes, key => {
            if (key in lastNode) {
                lastNode = lastNode[key];
            } else {
                lastNode = lastNode[key] = {};
            }
        });

        lastNode[lastKey] = value;
    },

    /**
     * Push a non-array value into an array element of a collection
     * @param {object} collection
     * @param {string} key
     * @param {object} value
     * @returns {*}
     */
    putIntoBucket: function (collection, key, value) {
        U.contract(() => !_.isArray(value));

        let bucket = U.getValueByPath(collection, key);

        if (_.isArray(bucket)) {
            bucket.push(value);
        } else if (_.isNil(bucket)) {
            bucket = [ value ];
            U.setValueByPath(collection, key, bucket);
        } else {
            bucket = [ bucket, value ];
            U.setValueByPath(collection, key, bucket);
        }

        return bucket;
    }
};
