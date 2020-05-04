import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "rollup-plugin-typescript2";

export default [
	{
		input: "src/index.ts",
		onwarn(warning, rollupWarn) {
			if (warning.code !== "CIRCULAR_DEPENDENCY") {
				rollupWarn(warning);
			}
		},
	  output: [
			{
				file: "dist/sankey.mjs",
				format: "es",
				esModule: true
			},
			{
				file: "dist/sankey.js",
				format: "iife",
				name: "chart"
			},
			{
				file: "docs/lib/sankey.js",
				format: "iife",
				name: "chart"
			}
	  ],
	  plugins: [
			resolve(),
			commonjs(),
			typescript()	
		]
	}
];