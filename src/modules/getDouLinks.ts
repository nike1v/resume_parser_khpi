import Browser from "./browser";

export class DouParser {
	private numberOfVacancies: number;
	private currentAmount: number;
	private _jobsLinks: string[];
	private Browser;

	constructor() {
		this.Browser = new Browser();
		this.numberOfVacancies = 0;
		this.currentAmount = 20;
		this._jobsLinks = [];
	}

	async getVacanciesNumber() {
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
			await page.goto("https://jobs.dou.ua/vacancies/");
			await page.waitForSelector("h1");
			while (this.currentAmount < this.numberOfVacancies) {
				await page.click(".more-btn > a");
				await page.waitForNetworkIdle();
				this.currentAmount = this.currentAmount + 40;
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

	private waitForTimeout(time: number) {
		return new Promise((resolve) => setTimeout(resolve, time));
	}

	async getDouJobsLinks() {
		await this.getVacanciesNumber();
		await this.getJobLinks();
		return this._jobsLinks;
	}

}