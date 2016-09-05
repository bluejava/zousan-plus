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
	function series3(ar,i,val)
	{
		i++
		if(ar.length > i)
			return series2(ar,i,val)
		else
			return val
	}

	function series2(ar,i,inval)
	{
		var next = ar[i]
		if(typeof next !== "function")
			return series3(ar,i,next)

		var fnRet = ar[i](inval)
		if(fnRet && fnRet.then)
			return fnRet
				.then(function(resVal) { return series3(ar,i,resVal) })
		else
			return series3(ar,i,fnRet)
	}

	function series(ar)
	{
		if(!ar) return undefined
		if(!Array.isArray(ar))
			ar = Array.prototype.slice.call(arguments)
		return Zousan.resolve(series2(ar,0))
	}

	/* ===== END series ====== */


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

	return Zousan
}));