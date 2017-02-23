/* global section, test, assert  */

(function(global, factory) {
    if(typeof define === "function" && define.amd) // eslint-disable-line no-undef
        define(["../src/zousan-plus"], factory) // eslint-disable-line no-undef
    else if(typeof exports === "object")
        module.exports = factory(require("../src/zousan-plus.js"))
    else
        global.Zousan = factory()

    }(this, function(Zousan) {

		// This function returns a promise of a value (that is specifiec) after a specified
		// delay time.
		// delayedValue(1000,"test"); // returns a promise that resolves to "test" after 1 second
		function delayedValue(ms, value)
		{
			return new Zousan(function(resolve) {
					setTimeout(resolve, ms, value)
				})
		}

		// This is similar to above but uses callback style asychronicity.
		// the callback is called with (error, value) as is typical.
		// The value parameter is optional - if not specified, the ms delay
		// time is used as the value. This "optional" style argument is not
		// uncommon in JS APIs and so it was used here for testing.
		// i.e. delayedCallback(123,cb); // will call cb(null,123) after 123ms
		function delayedCallback(ms, value, cb)
		{
			if(!cb && typeof value === "function")
			{
				cb = value
				value = ms
			}

			setTimeout(function() {
					cb(null, value)
				}, ms)
		}

		/* =========  map =========== */

		section("map", function() {

			test("Simple array map", function() {

				var a = [5, 6, 7]

				return Zousan.map(a, function(x) { return x + 1 })
					.then(function(x) {
							assert.deepEqual(x, [6, 7, 8])
						})
			})

			test("array map with promises", function() {

				var a = [ delayedValue(150, 5),	// later resolves to 5
						delayedValue(10, 6), // later resolves to 6
						delayedValue(100, 7)] // later resolves to 7

				return Zousan.map(a, function(x) { return x + 1 })
					.then(function(x) {
							assert.deepEqual(x, [6, 7, 8])
						})
			})

			test("promised array map with promises", function() {

				// Return a promise to an array in 200ms
				var ap = delayedValue(200, [ delayedValue(150, 5),	// later resolves to 5
						delayedValue(10, 6), // later resolves to 6
						delayedValue(100, 7)]) // later resolves to 7

				return Zousan.map(ap, function(x) { return x - 1 })
					.then(function(x) {
							assert.deepEqual(x, [4, 5, 6])
						})
			})

			test("array map with mapping function that returns promises", function() {

				// A simple array of strings
				var a = [ "hello", "goodbye", "konichiwa", "sayonara" ]

				// returns a promise to resolve to the first letter of the string specified
				function firstLetter(s)
				{
					return delayedValue(50, s.substring(0, 1))
				}

				return Zousan.map(a, firstLetter)
					.then(function(x) {
						assert.deepEqual(x, ["h", "g", "k", "s"])
					})
			})

		})

		/* =========  promisify =========== */

		section("promisify", function() {

			test("Promisify single function", function() {

				var pDelayedCallback = Zousan.promisify(delayedCallback)
				return pDelayedCallback(123, "test123")
					.then(function(value) { assert.equal(value, "test123") })
			})

			test("Promisify single function with optional argument missing", function() {

				var pDelayedCallback = Zousan.promisify(delayedCallback)
				return pDelayedCallback(123)
					.then(function(value) { assert.equal(value, 123) })
			})

			test("Promisify mock object with mixed properties including callback functions", function() {

				var mo = {
					a: 10,
					b: 20,
					c: delayedCallback,
					d: function(a, b, c) { return a + b + c },
					e: delayedValue
				}

				Zousan.promisify(mo)

				assert.equal(mo.a, 10)
				assert.equal(mo.b, 20)

				return mo.cProm(55, "hi") // cProm is the promisified version of c!
					.then(function(v) {
							assert.equal(v, "hi")
							assert.equal(mo.d(1, 2, 3), 6)
							return mo.e(33, "bye")
								.then(function(val) {
										assert.equal(val, "bye")
									})
						})
			})
		})

		/* =========  series =========== */

		section("series", function() {

			test("Process a series of simple values, resulting in final value", function() {

					return Zousan.series(1, 2, 3)
						.then(function(val) { assert.equal(val, 3) })

				})

			test("Process a series of functions beginning with an initial value", function() {

					function add5(x) { return x + 5 }

					return Zousan.series(7, add5, add5)
						.then(function(val) { assert.equal(val, 17) })

				})

			test("Process a series of functions and functions that return promises", function() {

					function add5(x) { return x + 5 }
					function valueIn100(val) { return delayedValue(100, val) }

					return Zousan.series(7, valueIn100, add5, valueIn100, add5, valueIn100, add5)
						.then(function(val) { assert.equal(val, 22) })

				})

			test("Process a series of functions, functions that return promises and direct promises", function() {

					function add5(x) { return x + 5 }
					function valueIn100(val) { return delayedValue(100, val) } // a function that returns a promise

					var promiseOf2 = valueIn100(2) // a promise already "processing"

					return Zousan.series(promiseOf2, valueIn100, add5, valueIn100, add5, valueIn100, add5)
						.then(function(val) { assert.equal(val, 17) })

				})

			test("A rejection mid-series halts processing the series and rejects the series promise", function() {

					var y = 0
					function incy() { y++ }
					function reject() { return Zousan.reject("Test Rejection") }

					return Zousan.series(incy, incy, incy, reject, incy, incy)
						.catch(function() { y -= 5; return y })
						.then(function() { assert.equal(y, -2) }) // should get +1 +1 +1 -5 = -2

				})

			test("An exception thrown in a mid-series function behaves just as a rejection above", function() {

					var y = 0
					function incy() { y++ }
					function except() { throw Error("Test Exception") }

					return Zousan.series(incy, incy, incy, except, incy, incy)
						.catch(function() { y -= 5 })
						.then(function() { assert.equal(y, -2) }) // should get +1 +1 +1 -5 = -2

				})
		})

		section("tracking series (tSeries)", function() {

			test("Process and track 3 native values", function() {

					var ts = Zousan.tSeries(1, 2, 3)
					return ts.prom.then(function(result) {
						assert.equal(ts.res[0], 1)
						assert.equal(ts.res[1], 2)
						assert.equal(ts.res[2], 3)
						return result
					})
				})

			test("Process a series of functions using previous results", function() {

					function add5(x) { return x + 5 }
					function sum(a, b) { return a + b }

					var ts = Zousan.tSeries(
							7,
							add5, // 5 + 7 = 12
							function() { return sum(ts.res[0], ts.res[1]) }, // sum last 2 results (12 + 7) = 19
							function() { return sum(ts.res[0], ts.res[2]) } // sum first and last result (7 + 19) = 26
						)
					return ts.prom.then(function(result) {
						assert.equal(ts.res[0], 7)
						assert.equal(ts.res[1], 12)
						assert.equal(ts.res[2], 19)
						assert.equal(ts.res[3], 26)
						return result
					})
				})

			test("Process a series of functions and functions that return promises using tracked values", function() {

					function add5(x) { return x + 5 }
					function sum(a, b) { return a + b }
					function valueIn100(val) { return delayedValue(100, val) }

					var ts = Zousan.tSeries(
							valueIn100(20),	// first item is a promise for 20
							add5, // 2nd item adds 5 to previous result = 25
							valueIn100, // this function takes previuos result, and returns promise to return it in 100ms (25)
							function() { return sum(ts.res[0], ts.res[2]) } // function that adds first item (20) and third item (25) = 45
							)

					return ts.prom.then(function(result) {
							assert.equal(result, 45)
						})
				})

			test("A rejection mid-series halts processing the series and rejects the series promise", function() {

					var y = 0
					function incy() { y++ }
					function reject() { return Zousan.reject("Test Rejection") }

					return Zousan.tSeries(incy, incy, incy, reject, incy, incy).prom
						.catch(function() { y -= 5; return y })
						.then(function() { assert.equal(y, -2) }) // should get +1 +1 +1 -5 = -2

				})

			test("An exception thrown in a mid-series function behaves just as a rejection above", function() {

					var y = 0
					function incy() { y++ }
					function except() { throw Error("Test Exception") }

					return Zousan.tSeries(incy, incy, incy, except, incy, incy).prom
						.catch(function() { y -= 5 })
						.then(function() { assert.equal(y, -2) }) // should get +1 +1 +1 -5 = -2

				})
		})

        section("Named All (Zousan.namedAll)", function() {

            test("A mixture of native values, function returns, promises, and function returning promises", function() {

                    function get22() { return 22 }
                    function get33() { return 33 }
                    function valueIn100(val) { return delayedValue(100, val) }

                    var d = delayedValue(100, 44)

                    return Zousan.namedAll({
                            a: 11,
                            b: get22,
                            c: get33(),
                            d: d,
                            e: valueIn100(55)
                        })
                        .then(function(retOb) {
                                assert.equal(retOb.a, 11)
                                assert.equal(retOb.b, 22)
                                assert.equal(retOb.c, 33)
                                assert.equal(retOb.d, 44)
                                assert.equal(retOb.e, 55)
                            })
                })

        })

        section("Zousan.evaluate", function() {

            test("Native object assignment", function() {
                    return Zousan.evaluate(
                            { name: "a", value: 100 },
                            { name: "b", value: 200 },
                            { name: "c", value: 300 }
                        ).then(function(obj) {
                                assert.deepEqual(obj, { a: 100, b: 200, c: 300 })
                            })
                })

            test("Function call with immediate dependencies", function() {

                    function add(a, b) { return a + b }

                    return Zousan.evaluate(
                            { name: "a", value: 10 },
                            { name: "b", value: add, deps: [ "a", 22 ]},
                            { name: "c", value: add, deps: [ "a", "b" ]}
                        ).then(function(obj) {
                                assert.deepEqual(obj, { a: 10, b: 32, c: 42 })
                            })

                })

            test("Dependencies on promises", function() {

                    function valueIn100(val) { return delayedValue(100, val) }
                    function add(a, b) { return a + b }

                    var a = valueIn100(33)

                    return Zousan.evaluate(
                            { name: "a", value: a },
                            { name: "b", value: add, deps: [ 5, "a" ]}
                        ).then(function(obj) {
                                assert.deepEqual(obj, { a: 33, b: 38 })
                            })
                })

            test("Dependencies on functions that return promises", function() {

                    function add(a, b) { return a + b }
                    function valueIn100(val) { return delayedValue(100, val) }

                    return Zousan.evaluate(
                            { name: "a", value: 20 },
                            { name: "b", value: valueIn100, deps: [ "a" ]},
                            { name: "c", value: add, deps: [ "a", "b" ]}
                        ).then(function(obj) {
                                assert.deepEqual(obj, { a: 20, b: 20, c: 40 })
                            })

                })

            test("value types", function() {

                    function get7() { return 7 }

                    var myob = { }

                    return Zousan.evaluate(
                            { name: "a", value: 20 }, // native Integer type
                            { name: "b", value: "hello" }, // native String type
                            { name: "c", value: [1, 2, 3] }, // Array value
                            { name: "d", value: get7 }, // function value
                            { name: "e", value: null }, // null value
                            { name: "f", value: 0 }, // 0 value
                            { name: "g", value: undefined }, // undefined value
                            { name: "h", value: myob } // object value
                        ).then(function(obj) {
                                // the g value works - but undefined fools assert.deepEqual
                                assert.deepEqual(obj, { a: 20, b: "hello", c: [1, 2, 3], d: 7,
                                        e: null, f: 0, g: undefined, h: myob })
                            })
                })

            test("Workflow optimization", function() {

                    /*
                        In this test we have a series of resources to evaluate and a dependency chain
                        that has various delays built into it. The best case scenerio will complete
                        the full eval in 300ms (plus some small surplus). A non-optimized approach
                        at resolving these resources could take much more. To ensure we optimize the
                        workflow, we will time the evaluation and make sure it falls between 300 and
                        320ms.
                    */

                    function add(a, b) { return a + b }
                    function valueIn100(val) { return delayedValue(100, val) }

                    var startTime = Date.now()

                    return Zousan.evaluate(
                            { name: "a", value: valueIn100, deps: [ 5 ] }, // should resolve in 100ms
                            { name: "b", value: valueIn100, deps: [ 12 ]}, // should resolve in 100ms
                            { name: "c", value: add, deps: [ "a", "b" ]},  // should resolve in 100ms (a,b simultaneous)
                            { name: "d", value: valueIn100, deps: [ "c" ]}, // should resolve in 200ms
                            { name: "e", value: valueIn100, deps: [ 4 ]}, // should resolve in 100ms
                            { name: "f", value: add, deps: [ "e", "d" ]}, // should resolve in 200ms
                            { name: "g", value: valueIn100, deps: [ "f" ]} // should resolve in 300ms
                        ).then(function(obj) {
                                assert.deepEqual(obj, { a: 5, b: 12, c: 17, d: 17, e: 4, f: 21, g: 21 })
                                var totalTime = Date.now() - startTime
                                assert(totalTime >= 300 && totalTime < 320) // 20ms of slackspace
                            })

                })
        }) // end of Zousan.eval section

}))
