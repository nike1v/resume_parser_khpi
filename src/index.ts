import { DjinnyParser } from "./modules/getDjinnyLinks";
import { DouParser } from "./modules/getDouLinks";

const main = async () => {
	// const djinnyParser = new DjinnyParser();
	// const links = await djinnyParser.getDjinnyJobsLinks();
	// console.log(links);
	const douParser = new DouParser();
	const a = await douParser.getDouJobsLinks();
	console.log(a);
};

main();