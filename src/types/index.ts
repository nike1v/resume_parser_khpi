import { Prisma } from "@prisma/client";

export interface IJobDetails {
	id: string;
	siteId: number;
	name: string;
	description: string;
	salary: string;
	country: string;
	yearsOfExperience: number;
	englishLevel: string;
	professionKeywords: Prisma.JsonValue;
	link: string;
	companyName: string;
	postDate: string;
}