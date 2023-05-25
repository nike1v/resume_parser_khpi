import { PrismaClient } from "@prisma/client";
import { sleep } from "./utils";

const prisma = new PrismaClient();

const writeToDatabase = async (jobsList: any) => {
	console.log("start writing data to db");
	const create = await prisma.jobDetails.create({
		data: jobsList,
	});
	sleep(3000);
	console.log("all data was written to db");
	return create;
};

export default writeToDatabase;