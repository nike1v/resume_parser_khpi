import { IJobDetails } from "../types";
import BodyParser from "./bodyParser";
import Browser from "./browser";
import { load } from "cheerio";
import writeToDatabase from "./writeToDatabase";
import { sleep } from "./utils";

export class DjinnyParser {
	private pagesNumber: number;
	private currentPage: number;
	private _pagesLinks: string[];
	private _jobsLinks: string[];
	private _jobDetails: IJobDetails[];
	private bodyParser: BodyParser;
	private Browser: Browser;

	constructor() {
		this.Browser = new Browser();
		this.pagesNumber = 0;
		this.currentPage = 1;
		this._pagesLinks = [];
		this._jobsLinks = [];
		this._jobDetails = [];
		this.bodyParser = new BodyParser();
	}

	async getLinksNumber() {
		const browser = await this.Browser.browserInstance();
		const page = await browser.newPage();

		try {
			console.log("Starting to parse pages number");
			await page.goto("https://djinni.co/jobs/");
			await page.waitForSelector("h1");
			const djinnyPageButtons = await page.$$eval(".page-link", (el) => el.map((elem) => (elem as HTMLAnchorElement).text));
			this.pagesNumber = Number(djinnyPageButtons.at(-2));
			console.log("Pages number acquired");
			this.setPagesLinks();
		} catch (e) {
			throw new Error("Error in getting links number");
		} finally {
			await browser.close();
		}
	}

	async getJobLinks() {
		const cluster = await this.Browser.clusterInstance(7, true, true);

		cluster.on("taskerror", (err, data, willRetry) => {
			if (willRetry) {
				console.warn(`Encountered an error while crawling ${data}. ${err.message}\nThis job will be retried`);
			} else {
				console.error(`Failed to get djinny jobs links ${data}: ${err.message}`);
			}
		});

		await cluster.task(async ({ page, data: url }) => {
			await page.goto(url, { waitUntil: "networkidle0", timeout: 0 });
			await page.waitForSelector("h1");
			const jobLinks = await page.$$eval(".profile", (el) => el.map((elem) => (elem as HTMLAnchorElement).href));
			jobLinks.forEach((link: string) => this._jobsLinks.push(link));
			sleep(3000);
		});

		console.log("Adding pages links to queue");
		this._pagesLinks.forEach(async (link: string) => cluster.queue(link));
		
		console.log("Starting to parse Job links");
		await cluster.idle();
		console.log("Job links acquired");

		await cluster.close();
	}

	private setPagesLinks() {
		while (this.currentPage < this.pagesNumber) {
			this._pagesLinks.push(`https://djinni.co/jobs/?page=${this.currentPage}`);
			this.currentPage++;
		}
		this.currentPage = 1;
	}

	async getDjinnyJobsLinks() {
		await this.getLinksNumber();
		await this.getJobLinks();
		return this._jobsLinks;
	}

	async getDataFromJobPost() {
		console.log(this._jobsLinks.length);
		const cluster = await this.Browser.clusterInstance(10);

		cluster.on("taskerror", (err, data, willRetry) => {
			if (willRetry) {
				console.warn(`Encountered an error while crawling ${data}. ${err.message}\nThis job will be retried`);
			} else {
				console.error(`Failed to crawl ${data}: ${err.message}`);
			}
		});

		await cluster.task(async ({ page, data: url }) => {
			this.bodyParser = new BodyParser();
			const siteId = Number(url.replace("https://djinni.co/jobs/", "").split("-")[0]);
			const id = "djinny_" + siteId;
			await page.goto(url, { waitUntil: "networkidle0", timeout: 0 });
			await page.waitForSelector("h1");
			const pageBody = await page.content();
			const $ = load(pageBody);
			const jobName = $("h1").text().trim().split("\n")[0];
			const jobDescription = $(".profile-page-section").text().trim().split("\n").filter(el=> /\S/.test(el)).map(el => el.trim()).join("\n");
			const englishLevelNode = $(".job-additional-info--body .job-additional-info--item:nth-child(4) .job-additional-info--item-text").text().trim().split("\n")[0];
			const englishLevel = this.bodyParser.englishLevelParser(jobDescription) || this.bodyParser.englishLevelParser(englishLevelNode);
			const salary = $(".public-salary-item").text().trim() || $("h1").text().trim().split("\n").at(-1) || "0";
			const country = $(".location-text").text().trim().split("\n")[0];
			const yearsOfExperience = Number($(".job-additional-info--body .job-additional-info--item:last-child .job-additional-info--item-text").text().replace(/\D/g, "").split("")[0] || 0);
			const companyName = $(".job-details--title").text().trim();
			const postDate = $(".text-muted").text().trim().split("\n")[1].trim();
			const professionKeywords = this.bodyParser.professionsParser(jobDescription);

			const jobObject = {
				id,
				siteId,
				name: jobName,
				description: jobDescription,
				salary,
				country,
				yearsOfExperience,
				englishLevel,
				professionKeywords,
				link: url,
				companyName,
				postDate
			};

			this._jobDetails.push(jobObject);
			writeToDatabase(jobObject);
			sleep(5000);
		});

		console.log("Adding pages links to queue");
		this._jobsLinks.forEach(async (link: string) => cluster.queue(link));
		
		console.log("Starting to parse Job links");
		await cluster.idle();
		console.log("Job links acquired");

		await cluster.close();
		
		return this._jobDetails;
	}
}