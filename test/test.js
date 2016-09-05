(function (global, factory) {
    if (typeof define === "function" && define.amd)
        define(["../src/zousan-plus"], factory)
    else if (typeof exports === "object")
        module.exports = factory(require("../src/zousan-plus.js"))
    else
        global.Zousan = factory()
	    }(this, function (Zousan) {

		// This function returns a promise of a value (that is specifiec) after a specified
		// delay time.
		// delayedValue(1000,"test"); // returns a promise that resolves to "test" after 1 second
		function delayedValue(ms, value)
		{
			return new Zousan(function(resolve,reject) {
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
				},ms)
		}

		/* =========  map =========== */

		section("map", function() {

			test("Simple array map", function() {

				var a = [5,6,7]

				return Zousan.map(a, function(x) { return x + 1 })
					.then(function(x) {
							assert.deepEqual(x,[6,7,8])
						})
			})

			test("array map with promises", function() {

				var a = [ delayedValue(150, 5),	// later resolves to 5
						delayedValue(10, 6), // later resolves to 6
						delayedValue(100, 7)] // later resolves to 7

				return Zousan.map(a, function(x) { return x + 1 })
					.then(function(x) {
							assert.deepEqual(x,[6,7,8])
						})
			})

			test("promised array map with promises", function() {

				// Return a promise to an array in 200ms
				var ap = delayedValue(200, [ delayedValue(150, 5),	// later resolves to 5
						delayedValue(10, 6), // later resolves to 6
						delayedValue(100, 7)]) // later resolves to 7

				return Zousan.map(ap, function(x) { return x - 1 })
					.then(function(x) {
							assert.deepEqual(x,[4,5,6])
						})
			})

			test("array map with mapping function that returns promises", function() {

				// A simple array of strings
				var a = [ "hello", "goodbye", "konichiwa", "sayonara" ]

				// returns a promise to resolve to the first letter of the string specified
				function firstLetter(s)
				{
					return delayedValue(50, s.substring(0,1))
				}

				return Zousan.map(a, firstLetter)
					.then(function(x) {
						assert.deepEqual(x, ["h","g","k","s"])
					})
			})

		})

		/* =========  promisify =========== */

		section("promisify", function() {

			test("Promisify single function", function() {

				var pDelayedCallback = Zousan.promisify(delayedCallback)
				return pDelayedCallback(123, "test123")
					.then(function(value) { assert.equal(value,"test123") })
			})

			test("Promisify single function with optional argument missing", function() {

				var pDelayedCallback = Zousan.promisify(delayedCallback)
				return pDelayedCallback(123)
					.then(function(value) { assert.equal(value,123) })
			})

			test("Promisify mock object with mixed properties including callback functions", function() {

				var mo = {
					a: 10,
					b: 20,
					c: delayedCallback,
					d: function(a,b,c) { return a + b + c },
					e: delayedValue
				}

				Zousan.promisify(mo)

				assert.equal(mo.a,10)
				assert.equal(mo.b,20)

				return mo.c(55, "hi")
					.then(function(v) {
							assert.equal(v,"hi")
							assert.equal(mo.d(1,2,3),6)
							return mo.e(33,"bye")
								.then(function(v) {
										assert.equal(v,"bye")
									})
						})
			})
		})

		/* =========  series =========== */

		section("series", function() {

			test("Process a series of simple values, resulting in final value", function() {

					return Zousan.series(1,2,3)
						.then(function(val) { assert.equal(val,3) })

				})

			test("Process a series of functions beginning with an initial value", function() {

					function add5(x) { return x + 5 }

					return Zousan.series(7,add5,add5)
						.then(function(val) { assert.equal(val,17) })

				})

			test("Process a series of functions and promises beginning with an initial value", function() {

					function add5(x) { return x + 5 }
					function valueIn100(val) { return delayedValue(100,val) }

					return Zousan.series(7,valueIn100,add5,valueIn100,add5,valueIn100,add5)
						.then(function(val) { assert.equal(val,22) })

				})

		})

}));