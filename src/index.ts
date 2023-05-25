import { DjinnyParser } from "./modules/djinnyParser";
import { DouParser } from "./modules/douParser";
import writeToDatabase from "./modules/writeToDatabase";

const parseDjinny = async () => {
	const djinnyParser = new DjinnyParser();
	const linksNumber = await djinnyParser.getDjinnyJobsLinks();
	const JinnyJobs = await djinnyParser.getDataFromJobPost();
	// if (JinnyJobs.length === linksNumber.length) writeToDatabase(JinnyJobs);
	console.log(JinnyJobs);
};

const parseDou = async () => {
	const douParser = new DouParser();
	const linksNumber = await douParser.getDouJobsLinks();
	const DouJobs = await douParser.getDataFromJobPost();
	// if (DouJobs.length === linksNumber.length) writeToDatabase(DouJobs);
	console.log(DouJobs);

};

const main = async () => {
	await parseDjinny();
	await parseDou();
};

main();