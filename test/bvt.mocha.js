'use strict';

/**
 * Module dependencies.
 */

const should = require('should');
const assert = require('assert');
const path = require('path');
const Util = require('../index.js');

describe('bvt', function () {
    describe('facade', function () {
        it('ladash integrated', function () {
            let _ = require('lodash');
            Util._.should.be.exactly(_);
        });

        it('fs-extra integrated', function () {
            let fs = require('fs-extra');
            Util.fs.should.be.exactly(fs);
        });

        it('glob integrated', function () {
            let g = require('glob-promise');
            Util.glob.should.be.exactly(g);
        });

        it('async integrated', function () {
            let a = require('async');
            Util.async.should.be.exactly(a);
        });
    });

    describe('shell commands', function () {
        it('run a command asynchronously', function (done) {
            Util.runCmd_('pwd').then(({ stdout, stderr }) => {
                stdout.should.endWith('k-utils\n');
                done();
            }).catch(error => {
                done(error);
            });
        });

        it('run a error command asynchronously', function () {
            return Util.runCmd_('fdfsfasfds').should.be.rejected();
        });

        it('run a command synchronously', function () {
            let result = Util.runCmdSync('pwd');
            result.should.endWith('k-utils\n');
        });

        it('run a command lively', function (done) {
            let stdout = '', stderr = '';

            Util.runCmdLive_('echo', [ 'hello' ], o => {
                stdout += o.toString();
            }, e => {
                stderr += e.toString();
            }).then(code => {
                stdout.should.be.equal('hello\n');
                stderr.should.be.empty();
                code.should.be.equal(0);
                done();
            }).catch(err => done(err));
        });

        it('run a error command', function () {
            return Util.runCmdLive_('fkdsfjsl', [ ]).should.be.rejected();
        });
    });

    describe('loading into sandbox', function () {
        it('usual loading', function () {
            let dataFile = path.resolve(__dirname, './data/load.js');
            let bob1 = require(dataFile);
            let bob2 = require(dataFile);
            bob1.should.equal(bob2);
        });

        it('sandbox loading', function (done) {
            let dataFile = path.resolve(__dirname, './data/load.js');
            let bob1 = require(dataFile);
            let bob2Stored;

            Util.load_(dataFile).then(bob2 => {
                bob1.should.not.equal(bob2);
                bob2.name.should.equal(bob1.name);
                bob2.value++;
                bob2.value.should.not.equal(bob1.value);

                bob2Stored = bob2;

                return Util.load_(dataFile);
            }).then(bob3 => {
                bob2Stored.should.not.equal(bob3);
                done();
            }).catch(err => {
                done(err);
            });
        });

        it('sandbox loading with context', function (done) {
            let dataFile = path.resolve(__dirname, './data/loadWithContext.js');
            
            Util.load_(dataFile, { Bob: 100 }).then(bob => {                
                bob.value.should.be.exactly(100);
                done();                
            }).catch(err => done(err));
        });
    });

    describe('co-style generator executor', function () {
        it('run a generator', function (done) {
            let g = function* () {
                return yield Promise.resolve(200);
            };

            Util.coWrap_(g)().then(result => {
                result.should.be.exactly(200);
                done();
            }).catch(error => done(error));
        });
    });

    describe('promise array', function () {
        it('run an array of promised function', function (done) {
            let a = [ () => Promise.resolve(1), () => Promise.resolve(2), () => Promise.resolve(3) ];
            Util.eachPromise_(a).then(result => {
                result.length.should.be.exactly(3);
                result[0].should.be.exactly(1);
                result[1].should.be.exactly(2);
                result[2].should.be.exactly(3);
                done();
            }).catch(err => done(err));
        });

        it('see if any promised function return true', function (done) {
            let a = [ () => Promise.resolve(false), () => Promise.resolve(false), () => Promise.resolve(true), () => Promise.resolve(false)];
            Util.ifAnyPromise_(a, s => s).then(result => {
                result[0].should.be.exactly(2);
                result[1].should.be.ok();
                done();
            }).catch(err => done(err));
        });

        it('all promised function return false', function (done) {
            let a = [ () => Promise.resolve(false), () => Promise.resolve(false), () => Promise.resolve(false), () => Promise.resolve(false)];
            Util.ifAnyPromise_(a, s => s).then(result => {
                should.not.exists(result);
                done();
            }).catch(err => done(err));
        });
    });

    describe('async each', function () {
        it('invalid arg', function () {
            return Util.eachAsync_(0, async () => 0).should.be.rejected();
        });

        it('iterate an array', function (done) {
            let a = [1, 2, 3];
            
            Util.eachAsync_(a, async (v, i) => {
                return await new Promise((resolve) => {
                    setTimeout(() => {
                        resolve(v+i);
                    }, 0)
                });
            }).then(result => {

                result.length.should.be.exactly(3);
                result[0].should.be.exactly(1);
                result[1].should.be.exactly(3);
                result[2].should.be.exactly(5);

                done();
            }).catch(err => {
                done(err);
            });
        });

        it('iterate an object', function (done) {
            let a = {
                a: 1,
                b: 2,
                c: 3
            };

            Util.eachAsync_(a, async (v, k) => {
                return await new Promise((resolve) => {
                    setTimeout(() => {
                        resolve(v * 2);
                    }, 0)
                });
            }).then(result => {

                result.should.have.property('a', 2);
                result.should.have.property('b', 4);
                result.should.have.property('c', 6);

                done();
            }).catch(err => {
                done(err);
            });
        });
    });

    describe('url and path related', function () {
        it('append query #0', function () {
            let appended = Util.urlAppendQuery('http://www.xxx.yyy');
            appended.should.equal('http://www.xxx.yyy');
        });

        it('append query #1', function () {
            let appended = Util.urlAppendQuery('http://www.xxx.yyy', { key1: 'value1', key2: 'value2' });
            appended.should.equal('http://www.xxx.yyy?key1=value1&key2=value2');
        });

        it('append query #2', function () {
            let appended = Util.urlAppendQuery('http://www.xxx.yyy', 'key1=value1&key2=value2');
            appended.should.equal('http://www.xxx.yyy?key1=value1&key2=value2');
        });

        it('append query #3', function () {
            let appended = Util.urlAppendQuery('http://www.xxx.yyy?key0=', { key1: 'value1', key2: 'value2' });
            appended.should.equal('http://www.xxx.yyy/?key0=&key1=value1&key2=value2');
        });

        it('append query #4', function () {
            let appended = Util.urlAppendQuery('http://www.xxx.yyy?key0=', 'key1=value1&key2=value2');
            appended.should.equal('http://www.xxx.yyy/?key0=&key1=value1&key2=value2');
        });

        it('url join #1', function () {
            let joined = Util.urlJoin('http://www.xxx.yyy');
            joined.should.equal('http://www.xxx.yyy');
        });

        it('url join #2', function () {
            let joined = Util.urlJoin('http://www.xxx.yyy/', 'forum', 'posts');
            joined.should.equal('http://www.xxx.yyy/forum/posts');
        });

        it('url join root slash', function () {
            let joined = Util.urlJoin('/');
            joined.should.equal('/');
        });

        it('url join empty base', function () {
            let joined = Util.urlJoin('');
            joined.should.equal('/');
        });

        it('url join root slash with left slash in middle', function () {
            let joined = Util.urlJoin('/', '/user', '/login');
            joined.should.equal('/user/login');
        });

        it('url join with multiple slash', function () {
            let joined = Util.urlJoin('/', '/', '/login', '', 'form');
            joined.should.equal('/login/form');
        });

        it('url join with empty slash', function () {
            let joined = Util.urlJoin('/user', '');
            joined.should.equal('/user');
        });

        it('path helpers', function () {
            let a = '/something/';
            Util.trimLeftSlash(a).should.equal('something/');
            Util.trimRightSlash(a).should.equal('/something');

            let b = 'something';
            Util.ensureLeftSlash(b).should.equal('/something');
            Util.ensureRightSlash(b).should.equal('something/');

            Util.ensureLeftSlash(a).should.equal(a);
            Util.ensureRightSlash(a).should.equal(a);
        });
    });

    describe('string related', function () {
        it('replace all occurrences in a string', function () {
            let replaced = Util.replaceAll('string with .. .. in it', '..', '**');
            replaced.should.equal('string with ** ** in it');
        });
        it('template interpolate', function () {
            let interpolated = Util.template('Hello {{ name }}', { name: 'World!' });
            interpolated.should.equal('Hello World!');
        });
        it('template exceptional', function () {
            let interpolated = Util.template('Hello <%- value %>', { value: '<b>' });
            interpolated.should.equal('Hello <%- value %>');

            interpolated = Util.template('Hello <% 1+2 %>', { value: '<b>' });
            interpolated.should.equal('Hello <% 1+2 %>');
        });
        it('pascal case', function () {
            let converted = Util.pascalCase('Foo Bar');
            converted.should.equal('FooBar');

            converted = Util.pascalCase('--foo-bar--');
            converted.should.equal('FooBar');

            converted = Util.pascalCase('__FOO_BAR__');
            converted.should.equal('FooBar');

            converted = Util.pascalCase('fooBar');
            converted.should.equal('FooBar');
        });
        it('quote a string', function () {
            let quoted = Util.quote('string with a " in it', '"');
            quoted.should.equal('"string with a \\" in it"');
        });
        it('quote a string with multiple quotes', function () {
            let quoted = Util.quote('string with multiple " ... " ... " in it', '"');
            quoted.should.equal('"string with multiple \\" ... \\" ... \\" in it"');
        });
        it('bin2Hex', function () {
            let bin = Buffer.from('tést', 'utf8');
            Util.bin2Hex(bin).should.equal('0x74e97374');
        });
    });

    describe('collection related', function () {
        it('get a default value #1', function () {
            let a = Util.getValueByPath(undefined, 'any', 1);
            a.should.be.exactly(1);
        });

        it('get a default value #2', function () {
            let a = Util.getValueByPath({ abc: 'def' }, '', 1);
            a.should.be.exactly(1);
        });

        it('get a default value by array', function () {
            let a = Util.getValueByPath({ abc: { def: 'ok' } }, [ 'abc', 'def' ]);
            a.should.be.exactly('ok');
        });

        it('get a deeply hived value by path', function () {
            let obj = {
                kol1: {
                    kol2: {
                        k1: 100,
                        k2: 200
                    }
                }
            };

            let v1 = Util.getValueByPath(obj, 'kol1.kol2.k1');
            let v2 = Util.getValueByPath(obj, 'kol1.kol2.k2');
            let v3 = Util.getValueByPath(obj, 'kol1.kol2.k3', 300);

            v1.should.be.exactly(100);
            v2.should.be.exactly(200);
            v3.should.be.exactly(300);
        });
        it('set a deeply hived value by path', function () {
            let obj = {
            };

            Util.setValueByPath(obj, 'kol1.kol2.k1', 100);
            obj['kol1']['kol2']['k1'].should.be.exactly(100);
        });
        it('put into a bucket', function () {
            let obj = {
                k1: [ 1 ],
                k2: {
                    k22: 2
                }
            };

            let bucket1 = Util.putIntoBucket(obj, 'k1', 10);
            let bucket2 = Util.putIntoBucket(obj, 'k2.k22', 20);
            let bucket3 = Util.putIntoBucket(obj, 'k3', 3);
            Util.putIntoBucket(obj, 'k3', 30);

            bucket1.length.should.be.exactly(2);
            bucket2.length.should.be.exactly(2);
            bucket3.length.should.be.exactly(2);

            bucket1[1].should.be.exactly(10);
            bucket2[1].should.be.exactly(20);
            bucket3[0].should.be.exactly(3);
            bucket3[1].should.be.exactly(30);
        });
    });
});
