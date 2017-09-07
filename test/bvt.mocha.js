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

        it('stringjs integrated', function () {
            let s = require('string');
            Util.S.should.be.exactly(s);
        });

        it('fs-extra integrated', function () {
            let fs = require('fs-extra');
            Util.fs.should.be.exactly(fs);
        });

        it('glob integrated', function () {
            let g = require('glob');
            Util.glob.should.be.exactly(g);
        });

        it('co integrated', function () {
            let co = require('co');
            Util.co.should.be.exactly(co);
        });

        it('async integrated', function () {
            let a = require('async');
            Util.async.should.be.exactly(a);
        });
    });

    describe('shell commands', function () {
        it('run a command asynchronously', function (done) {
            Util.runCmd('pwd', (error, { stdout, stderr } ) => {
                assert.ok(!error);
                stdout.should.endWith('k-utils\n');
                done();
            });
        });

        it('run a command synchronously', function () {
            let result = Util.runCmdSync('pwd');
            result.should.endWith('k-utils\n');
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

            Util.load(dataFile).then(bob2 => {
                bob1.should.not.equal(bob2);
                bob2.name.should.equal(bob1.name);
                bob2.value++;
                bob2.value.should.not.equal(bob1.value);

                bob2Stored = bob2;

                return Util.load(dataFile);
            }).then(bob3 => {
                bob2Stored.should.not.equal(bob3);
                done();
            }).catch(err => {
                done(err);
            });
        });
    });

    describe('co-style generator executor', function () {
        it('run a generator', function (done) {
            let g = function* () {
                return yield Promise.resolve(200);
            };

            Util.coWrap(g, (err, result) => {
                result.should.be.exactly(200);
                done();
            });
        });
    });

    describe('contract', function () {
        it('break a contract', function () {
            let shouldBeTrue = false;
            assert.throws(() => { Util.contract(() => shouldBeTrue, 'should be true') });
        });
    });

    describe('promise array', function () {
        it('run an array of promised function', function (done) {
            let a = [ () => Promise.resolve(1), () => Promise.resolve(2), () => Promise.resolve(3) ];
            Util.eachPromise(a).then(result => {
                result.length.should.be.exactly(3);
                result[0].should.be.exactly(1);
                result[1].should.be.exactly(2);
                result[2].should.be.exactly(3);
                done();
            }).catch(err => done(err));
        });
    });

    describe('url and path related', function () {
        it('append query', function () {
            let appended = Util.urlAppendQuery('http://www.xxx.yyy', { key1: 'value1', key2: 'value2' });
            appended.should.equal('http://www.xxx.yyy?key1=value1&key2=value2');
        });
        it('url join', function () {
            let joined = Util.urlJoin('http://www.xxx.yyy/', 'forum', 'posts');
            joined.should.equal('http://www.xxx.yyy/forum/posts');
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
        it('quote a string', function () {
            let quoted = Util.quote('string with a " in it', '"');
            quoted.should.equal('"string with a \\" in it"');
        });
        it('bin2Hex', function () {
            let bin = Buffer.from('tést', 'utf8');
            Util.bin2Hex(bin).should.equal('0x74e97374');
        });
    });

    describe('collection related', function () {
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
