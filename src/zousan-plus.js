// zousan-plus : Extensions for Zousan Promises
// Home: https://github.com/bluejava/zousan-plus
// Author: Glenn Crownover <glenn@bluejava.com> (http://www.bluejava.com)
// License: MIT

(function(global, factory) {
	if(typeof define === "function" && define.amd) // eslint-disable-line no-undef
		define(["../node_modules/zousan/src/zousan"], factory) // eslint-disable-line no-undef
	else
		if(typeof exports === "object")
			module.exports = factory(require("zousan"))
		else
		{
			if(typeof Zousan !== "function")
				throw Error("You must first load Zousan as global to use zousan-plus globally")
			global.Zousan = factory(Zousan)
		}
	}(this, function(Zousan) {

	/* ==== map ==== */

	function map(iter, fn) {

			if(iter.then)
				return iter.then(function(iterResolved) {
						return map(iterResolved, fn)
					})
			else
				if(iter.map)
					return map2(iter, fn)
				else
					throw Error("first argument must be a promise or an iterable")
		}

	function map2(iter, fn)
	{
		return Zousan.all(
				iter.map(function(item) {
						return item.then ? item.then(fn) : fn(item)
					})
		)
	}

	/* ==== END map ==== */

	/* ====== Series ====== */

	// Handles the results of the evaluation of an item in the series
	function processSeriesResult(ar, i, results, val)
	{
		results[i] = val
		i++
		if(ar.length > i)
			return processSeriesItem(ar, i, results, val)
		else
			return val
	}

	// Handles the evaluation of an item in the series.
	function processSeriesItem(ar, i, results, inval)
	{
		var nextVal = ar[i]

		if(typeof nextVal === "function")
			nextVal = nextVal.call(null, inval) // eslint-disable-line no-useless-call

		if(nextVal && nextVal.then)
			return nextVal.then(function(resVal) {
					return processSeriesResult(ar, i, results, resVal)
				})

		return processSeriesResult(ar, i, results, nextVal)
	}

	/*
		Tracking Series

		Evaluates each item in a series, tracking each result in an array that is returned
		along with the final promise of the series completion.

		Example:

		var ts = tSeries(1,2,3,add6,add3Later)
		ts.prom.then(function(final) {
				// ts.res[0] = 1
				// ts.res[3] = 9
				// ts.res[4] = 12
				// final = 12
			})
	*/


	function tSeries(ar)
	{
		// We accept either an array or items specified as individual arguments...
		if(!ar) return undefined

		// ...but we convert the series into an array either way
		if(arguments.length > 1 || !Array.isArray(ar))
			ar = Array.prototype.slice.call(arguments)

		var z = new Zousan(),
			results = [ ]

		// throw the processing on the microtask queue to allow items in the
		// series reference the results (i.e. return from this function before processing)
		Zousan.soon(function() {
				try
				{
					z.resolve(processSeriesItem(ar, 0, results))
				}
				catch(er) { z.reject(er) }
			})

		return { prom: z, res: results } // return promise and results in "prom" and "res" properties
	}

	// The series utility is simply a tracking series that ignores the results tracking and returns
	// a promise directly
	function series()
	{
		return tSeries.apply(null, arguments).prom
	}

	/* ===== END series / tSeries ====== */


	/*

		==== promisify ====

		Usage:
		var fs = Zousan.promisify(require("fs"))
		fs.readFileProm(name, { encoding: "utf-8"})
			.then(function(contents) {
					// contents of file available here
				})
			.catch(function(err) {
					// handle errors here
				})

	*/

	var defaultCBArgNames = [ "cb", "callback", "done", "callback_" ]
	function shouldPromisify(ob, conf)
	{
		// no need for argument inspection if promisifyAll is specified
		if(conf.promisifyAll)
			return true

		if(conf.fnNames)
			return conf.fnNames.indexOf(ob.name) >= 0

		var cbArgNames = conf.cbArgNames || defaultCBArgNames

		var args = getArgs(ob)
		if(args.length)
		{
			var lastArg = args[args.length - 1]
			if(cbArgNames.indexOf(lastArg) >= 0)
				return true
		}

		return false
	}

	function promisifyFn(fn)
	{
		return function() {
				var ca = Array.prototype.splice.call(arguments, 0),
					me = this
				return new Zousan(function(resolve, reject) {
						ca.push(function(er, val) {
								if(er)
									reject(er)
								else
									resolve(val)
							})
							fn.apply(me, ca)
					})
			}
	}

	function promisify(ob, conf)
	{
		conf = conf || {}

		if(typeof ob === "function")
			return promisifyFn(ob)

		for(var n in ob)
			if(typeof ob[n] === "function")
				if(shouldPromisify(ob[n], conf))
					ob[n + Zousan.PROMISIFY_FN_EXTENSION] = promisifyFn(ob[n])

		return ob
	}

	// extracts the argument names of a function into an array of strings
	// any commented-out arguments are ignored.
	// i.e.  if myFunc = function(a,b,c) { ... }
	//  getArgs(myFunc) --> [ "a","b","c" ]
	function getArgs(func)
	{
		var args = func.toString().match(/function\s.*?\(([^)]*)\)/)[1]
		return args.replace(/\/\*.*\*\//, "").split(",")
			.map(trim)
	}

	function trim(s) { return s.trim() }

	// The extension for all promisified versions of functions. Change to "" to replace originals (not recommended)
	Zousan.PROMISIFY_FN_EXTENSION = "Prom"


	/*

			namedAll(valuesObject) -> Promise - just like Promise.all except each item is a name/value pair and the resolved value is
				an object with name/value pairs with the resolved values. A mix of values, functions, and promises
				can be used as values. Promises and functions that return promises are first resolved before assigned.

			Example:
				return Zousan.namedAll({
						id: userId,  // Integer
						pb: startProgressBar, // function whose return is ignored
						user: getUser(userId), // returns a promise
						items: getUserItemList(userId) // returns a promise
					})
					.then(function(ob) {
							// Here ob contains the following:
							// { id: userId, pb: <??>, user: userObject <from resolved promise>, items: itemList <from promise> }
							endProgressBar()
						})
					.catch(function(err) {
							// lets hope this doesn't happen!
						})

			Note: With function values, you can put the parens in (execute immediately) or not. If you do, it is executed BEFORE calling
			Zousan.namedAll and its result (which can be a promise) is assigned (or resolved and assigned). If you do not, namedAll will
			detect its a function and call it (with no arguments)

	*/

	function namedAll(ob)
	{
		// First gather ordered lists of keys and values respectively. While we are at it,
		// 	evaluate any functions, since Promise.all does not offer that.
		var keys = Object.keys(ob),
			values = keys.map(function(key) {
					if(typeof ob[key] === "function")
						return ob[key].apply(null)
					else
						return ob[key]
				})

		// Zousan.all expects an array of values (mixed promises/non-promises ok)
		return Zousan.all(values)
			.then(function(ret) {
					// Once all promises are resolved, we match them up with their keys
					// based on the ordering
					var retOb = { }
					keys.forEach(function(name, i) {
							retOb[name] = ret[i]
						})
					return retOb
				})
	}


	function eval(ar) // eslint-disable-line no-shadow-restricted-names
	{
		// We accept either an array or items specified as individual arguments...
		// ...but we convert the series into an array either way
		if(!Array.isArray(ar))
			ar = Array.prototype.slice.call(arguments)

		var items = { } // map names to items

		// This forEach is where it all happens - we evaluate each item within the eval array.
		// If there are dependencies, those are first resolved.
		// Its the mother of all promise workflows is just 10 lines!
		ar.forEach(function(zex, i) {
			items[zex.name || ("_p" + i)] =
				Zousan.all((zex.deps || []).map(function(arg) {
							// even if items[arg] is undefined, using "arg in items" is true when the property exists
							if(typeof arg === "string" && arg in items)
								return items[arg]
							else
								return arg
						}))
					.then(function(dResults) {
							var value = zex.value
							if(typeof value === "function")
								value = value.apply(null, dResults)
							return value
						})
			})

		// Now we just wait for each promise to complete - then assign the resolved value to its named property
		var names = Object.keys(items),
			itemVals = names.map(function(name) { return items[name] }) // Object.values()

		return Zousan.all(itemVals)
			.then(function(paResults) {
					var results = { }
					names.forEach(function(name, i) {
							results[name] = paResults[i]
						})
					return results
				})
	}

	Zousan.eval = eval
	Zousan.map = map
	Zousan.namedAll = namedAll
	Zousan.promisify = promisify
	Zousan.promisifyFn = promisifyFn
	Zousan.series = series
	Zousan.tSeries = tSeries

	return Zousan
})); // eslint-disable-line semi
