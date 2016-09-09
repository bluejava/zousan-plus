// zousan-plus : Extensions for Zousan Promises
// Home: https://github.com/bluejava/zousan-plus
// Author: Glenn Crownover <glenn@bluejava.com> (http://www.bluejava.com)
// License: MIT

(function (global, factory) {
	if(typeof define === "function" && define.amd)
		define(["../node_modules/zousan/src/zousan"], factory)
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

	function map(iter,fn) {

			if(iter.then)
				return iter.then(function(iter) {
						return map(iter,fn)
					})
			else
				if(iter.map)
					return map2(iter,fn)
				else
					throw Error("first argument must be a promise or an iterable")
		}

	function map2(iter,fn)
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
	function processSeriesResult(ar,i,results,val)
	{
		results[i] = val
		i++
		if(ar.length > i)
			return processSeriesItem(ar,i,results,val)
		else
			return val
	}

	// Handles the evaluation of an item in the series.
	function processSeriesItem(ar,i,results,inval)
	{
		var nextVal = ar[i]

		if(typeof nextVal === "function")
			nextVal = nextVal.call(null,inval)

		if(nextVal && nextVal.then)
			return nextVal.then(function(resVal) {
					return processSeriesResult(ar,i,results,resVal)
				})

		return processSeriesResult(ar,i,results,nextVal)
	}

	// Tracking Series - evaluates each item in a series, tracking each result in an
	// array that is returned along with the final promise of the series completion
	function tSeries(ar)
	{
		// We accept either an array or items specified as individual arguments...
		if(!ar) return undefined

		// ...but we convert the series into an array either way
		if(!Array.isArray(ar))
			ar = Array.prototype.slice.call(arguments)

		var z = new Zousan(),
			results = [ ]

		// throw the processing on the microtask queue to allow items in the
		// series reference the results (i.e. return from this function before processing)
		Zousan.soon(function() {
				try
				{
					z.resolve(processSeriesItem(ar,0,results))
				}
				catch(er) { z.reject(er) }
			})

		return { prom: z, res: results } // return promise and results in "prom" and "res" properties
	}

	// The series utility is simply a tracking series that ignores the results tracking and returns
	// a promise directly
	function series(ar)
	{
		return tSeries.apply(null,arguments).prom
	}

	/* ===== END series / tSeries ====== */


	/* ==== promisify ==== */
	var defaultCBArgNames = [ "cb", "callback", "done", "callback_" ]
	function shouldPromisify(ob,conf)
	{
		// no need for argument inspection if replaceAll is specified
		if(conf.replaceAll)
			return true

		if(conf.fnNames)
			return conf.fnNames.indexOf(ob.name) >= 0

		var cbArgNames = conf.cbArgNames || defaultCBArgNames

		var args = getArgs(ob)
		if(args.length)
		{
			var lastArg = args[args.length-1]
			if(cbArgNames.indexOf(lastArg) >= 0)
				return true
		}
	}

	function promisifyFn(fn)
	{
		return function() {
				var ca = Array.prototype.splice.call(arguments,0),
					me = this
				return new Zousan(function(resolve,reject) {
						ca.push(function(er,val) {
								if(er)
									reject(er)
								else
									resolve(val)
							})
							fn.apply(me,ca)
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
				if(shouldPromisify(ob[n],conf))
					ob[n] = promisifyFn(ob[n])

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

	Zousan.map = map
	Zousan.promisify = promisify
	Zousan.promisifyFn = promisifyFn
	Zousan.series = series
	Zousan.tSeries = tSeries

	return Zousan
}));