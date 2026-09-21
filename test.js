import Zousan from "."

const getc = (a,b) => Zousan.reject("Boo!") 

Zousan.evaluate(
	{ name: "a", value: 1 },
	{ name: "b", value: 2 },
	{ name: "c", deps: [ "a", "b"], value: getc }
)
	.then(o => console.log("Evaluated and success with ", o))
	.catch(console.error)
