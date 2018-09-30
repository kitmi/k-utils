"use strict";

// Built-in libs
const URL = require('url');
const QS = require('querystring');
const _ = require('lodash');
const childProcess = require('child_process');
const Promise = require('bluebird');

const templateSettings = {
    escape: false,
    evaluate: false,
    imports: false,
    interpolate: /{{([\s\S]+?)}}/g,
    variable: false
};

/**
 * A pure closure to be called to check the value status under certain conditions
 * @callback module:Utilities.predicateFunction
 * @param {*} value
 * @returns {boolean}
 */

/**
 * Async iterator
 * @callback module:Utilities.iteratorFunction
 * @param {*} value
 * @param {*} key
 * @param {*} object
 * @returns {Promise}
 */

/**
 * Promise function
 * @callback module:Utilities.promiseFunction
 * @returns {Promise}
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
     * Methods that aren't included in the native fs module and adds promise support to the fs methods. It should be a drop in replacement for fs.
     * See {@link https://www.npmjs.com/package/fs-extra}
     * @member {fs}
     */
    get fs() { return require('fs-extra'); },

    /**
     * Match files using the patterns the shell uses, like stars and stuff.
     * See {@link https://www.npmjs.com/package/glob}
     * @member {glob}
     */
    get glob() { return require('glob-promise'); },

    /**
     * Higher-order functions and common patterns for asynchronous code.
     * See {@link http://caolan.github.io/async}
     * @member {async}
     */
    get async() { return require('async'); },

    /**
     * Bluebird is a fully featured promise library with focus on innovative features and performance
     * @member {Promise}
     */
    Promise: Promise,

    /**
     * Execute a shell command
     * @param {string} cmd - Command line to execute     
     * @returns {Promise.<Object>}
     */
    runCmd_(cmd) {
        return new Promise((resolve, reject) => {
            childProcess.exec(cmd, (error, stdout, stderr) => {
                if (error) {
                    return reject(error);
                }

                let result = { stdout, stderr };

                return resolve(result);
            });
        });
    },

    /**
     * Execute a shell command and lively output 
     * @param {string} cmd - Command line to execute 
     * @param {Array} [args] - Arguments list
     * @returns {Promise.<Object>}
     */
    runCmdLive_(cmd, args, onStdOut, onStdErr) {
        return new Promise((resolve, reject) => {
            let ps = childProcess.spawn(cmd, args, { windowsHide: true });
            let e;
            
            if (onStdOut) {
                ps.stdout.on('data', onStdOut);      
            }

            if (onStdErr) {
                ps.stderr.on('data', onStdErr);
            }
            
            ps.on('close', (code) => e ? reject(e) : resolve(code));
            ps.on('error', (error) => { e = error; });              
        });
    },

    /**
     * Execute a shell command synchronously
     * @param {string} cmd - Command line to execute
     * @returns {string}
     */
    runCmdSync(cmd) {
        return childProcess.execSync(cmd).toString();
    },

    /**
     * Load a js file in sand box.
     * @param {string} file - Source file
     * @param {object} [variables] - Variables as global
     * @param {object} [deps] - Dependencies
     * @returns {AsyncFunction.<*>}
     */
    async load_(file, variables, deps) {
        let System = require('systemjs');
        let loader = new System.constructor();

        if (variables) {
            loader.config({'global': variables});
        }

        if (deps) {
            _.forOwn(deps, k => {
                loader.set(k, deps[k]);
            });
        }

        return await loader.import(file);
    },

    /**
     * Returns a function that can use yield to yield promises
     * @param {Generator} generator
     * @returns {Function}
     */
    coWrap_(generator) {
        return Promise.coroutine(generator);
    },

    //async related------
    /**
     * Run an array of promise factory sequentially.
     * @param {Array.<module:Utilities.promiseFunction>} arrayOfPromiseFactory
     * @returns {Promise.<Array>}
     * @example
     * let array = [ ... ];
     * Util.eachPromise_(_.map(array, a => (lastResult) => new Promsie(...))).then(lastResult => { ... });
     */
    eachPromise_(arrayOfPromiseFactory) {
        var accumulator = [];
        var ready = Promise.resolve(null);

        arrayOfPromiseFactory.forEach(promiseFactory => {
            ready = ready.then(promiseFactory).then(value => {
                accumulator.push(value);
            });
        });

        return ready.then(() => accumulator);
    },

    /**
     * Iterate an array of an object asynchronously
     * @param {Array|Object} obj
     * @param {module:Utilities.iteratorFunction} iterator
     * @returns {Promise.<Array|Object>}
     */
    async eachAsync_(obj, iterator) {
        if (_.isArray(obj)) {
            let r = [];

            let l = obj.length;
            for (let i = 0; i < l; i++) {
                r.push(await iterator(obj[i], i, obj));
            }

            return r;
        } else if (_.isPlainObject(obj)) {
            let r = {};

            for (let k in obj) {
                if (obj.hasOwnProperty(k)) {
                    r[k] = await iterator(obj[k], k, obj);
                }
            }

            return r;
        } else {
            return Promise.reject('Invalid argument!');
        }
    },

    /**
     * Run an array of promise factory sequentially and return immediately if any result of them meets the predication
     * @param {Array.<module:Utilities.promiseFunction>} arrayOfPromiseFactory
     * @param {module:Utilities.predicateFunction} [predicate]
     * @returns {Promise.<Array>}
     * @example
     * let array = [ ... ];
     * Util.ifAnyPromise_(_.map(array, a => () => new Promsie(...)), result => result === 'somevalue').then(found => { ... });
     */
    async ifAnyPromise_(arrayOfPromiseFactory, predicate) {
        let l = arrayOfPromiseFactory.length;

        for (let i = 0; i < l; i++) {
            let result = await arrayOfPromiseFactory[i]();
            if ((predicate && predicate(result)) || result) return Promise.resolve([i, result]);
        }

        return undefined;
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
     * 
     * @example
     *   urlJoin('/', '/user', 'login') => /user/login
     *   urlJoin('/') => '/'
     *   urlJoin('') => '/'
     *   urlJoin('/path/', '/user') => /path/user 
     */
    urlJoin: function (base, ...parts) {
        if (!parts || parts.length === 0) {
            if (base === '' || base === '/') return '/';

            return U.trimRightSlash(base);
        }

        return U.trimRightSlash(base) + U.ensureLeftSlash(parts.map(p => _.trim(p, '/')).filter(p => p !== '').join('/'), true);
    },

    /**
     * Interpolate values 
     * @param {string} str
     * @param {object} values
     */
    template: function (str, values) {
        return _.template(str, templateSettings)(values);
    },

    /**
     * Trim left '/' of a path.
     * @param {string} path - The path
     * @returns {string}
     */
    trimLeftSlash: function (path) {
        return path && _.trimStart(path, '/');
    },

    /**
     * Trim right '/' of a path.
     * @param {string} path - The path
     * @returns {string}
     */
    trimRightSlash: function (path) {
        return path && _.trimEnd(path, '/');
    },

    /**
     * Add a '/' to the left of a path if it does not have one.
     * @param {string} path - The path
     * @returns {string}
     */
    ensureLeftSlash: function (path, excludeEmpty) {
        return (path && path[0] === '/') ? path : ((excludeEmpty && path === '') ? '' : '/' + path);
    },

    /**
     * Add a '/' to the right of a path if it does not have one.
     * @param {string} path - The path
     * @returns {string}
     */
    ensureRightSlash: function (path) {
        return (path && path[path.length-1] === '/') ? path : path + '/';
    },

    /**
     * Replace all matched search in str by the replacement
     * @param {string} str
     * @param {string} search
     * @param {string} replacement
     * @returns {string}
     */
    replaceAll: function (str, search, replacement) {
        return str.split(search).join(replacement);
    },

    /**
     * Converts string to pascal case.
     * @param {string} str
     * @returns {string}
     */
    pascalCase: function (str) {
        return _.upperFirst(_.camelCase(str));
    },

    /**
     * Quote a string.
     * @param {string} str
     * @param {string} quoteChar
     * @returns {string}
     */
    quote: function (str, quoteChar = '"') {
        return quoteChar + U.replaceAll(str, quoteChar, "\\" + quoteChar) + quoteChar;
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
     * Push an value into an array element of a collection
     * @param {object} collection
     * @param {string} key
     * @param {object} value
     * @returns {*}
     */
    putIntoBucket: function (collection, key, value) {
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
