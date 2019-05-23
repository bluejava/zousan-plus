import resolve from 'rollup-plugin-node-resolve'
import { uglify } from "rollup-plugin-uglify"
import { terser } from "rollup-plugin-terser"

export default {
	input: 'src/zousan-plus.js',
	output: {
		format: 'umd',
		name: 'Zousan',
		file: "zousan-plus-min.js",
		sourcemap: true
	},
	plugins: [
		resolve(),
		// uglify(),
		terser()
	]
}