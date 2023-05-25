
import { load } from "cheerio";
import { IJobDetails } from "../types";
import BodyParser from "./bodyParser";
import Browser from "./browser";
import { sleep } from "./utils";
import writeToDatabase from "./writeToDatabase";

export class DouParser {
	private numberOfVacancies: number;
	private currentAmount: number;
	private _jobsLinks: string[];
	private _jobDetails: IJobDetails[];
	private bodyParser: BodyParser;
	private Browser: Browser;

	constructor() {
		this.Browser = new Browser();
		this.bodyParser = new BodyParser();
		this.numberOfVacancies = 0;
		this.currentAmount = 20;
		this._jobsLinks = [];
		this._jobsLinks = [];
		this._jobDetails = [];
	}

	async getLinksNumber() {
		const browser = await this.Browser.browserInstance();
		const page = await browser.newPage();

		try {
			console.log("Starting to parse pages number");
			await page.goto("https://jobs.dou.ua/vacancies/");
			await page.waitForSelector("h1");
			const djinnyPageButtons: string = await page.$eval(".b-vacancies-head h1", (el) => el.textContent) || "";
			this.numberOfVacancies = +djinnyPageButtons.replace(/\W/g, "");
			console.log("Pages number acquired");
		} catch (e) {
			throw new Error("Error in getting links number");
		} finally {
			await browser.close();
		}
	}

	async getJobLinks() {
		const browser = await this.Browser.browserInstance();
		const page = await browser.newPage();

		try {
			console.log("Starting to parse Job links");
			await page.goto("https://jobs.dou.ua/vacancies/", { waitUntil: "networkidle0", timeout: 0 });
			await page.waitForSelector("h1");
			while (this.currentAmount < this.numberOfVacancies) {
				await page.click(".more-btn > a");
				await page.waitForNetworkIdle();
				this.currentAmount = this.currentAmount + 40;
				sleep(3000);
			}

			const jobLinks = await page.$$eval(".vacancy .vt", (el) => el.map((elem) => (elem as HTMLAnchorElement).href));
			jobLinks.forEach((link: string) => this._jobsLinks.push(link));
			console.log("Job links acquired");
		} catch (e) {
			console.log(e);
			throw new Error("Error in getting jobs links");
		} finally {
			await browser.close();
		}
	}

	async getDouJobsLinks() {
		await this.getLinksNumber();
		await this.getJobLinks();
		return this._jobsLinks;
	}

	async getDataFromJobPost() {
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
			const siteId = Number(url.replace("https://jobs.dou.ua/companies/", "").split("/")[2]);
			const id = "dou_" + siteId;
			await page.goto(url, { waitUntil: "networkidle0", timeout: 0 });
			await page.waitForSelector("h1");
			const pageBody = await page.content();
			const $ = load(pageBody);
			const jobName = $(".g-h2").text();
			const jobDescriptionArray: string[] = [];
			$(".text.b-typo.vacancy-section").children().each((i, el) => {
				const element = $(el);
				if (element.is("ul")) {
					element.children().each((num, elem) => {
						jobDescriptionArray.push($(elem).text());
					});
				}
				jobDescriptionArray.push($(el).text());
			});
			const jobDescription = jobDescriptionArray.join("\n");
			const englishLevel = this.bodyParser.englishLevelParser(jobDescription);
			const salary = $(".salary").text().trim() || "0";
			const country = $(".place").text().trim().split(" ")[0];
			const yearsOfExperience = Number($(".job-additional-info--body .job-additional-info--item:last-child .job-additional-info--item-text").text().replace(/\D/g, "").split("")[0] || 0);
			const companyName = $(".l-n a").first().text().trim();
			const postDate = $(".date").text().trim().split("\n")[0];//, (node) => node.childNodes[2].textContent?.trim().split("\n")[1].trim()) || "";
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