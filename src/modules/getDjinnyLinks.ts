import Browser from "./browser";

export class DjinnyParser {
	private pagesNumber: number;
	private currentPage: number;
	private _pagesLinks: string[];
	private _jobsLinks: string[];
	private Browser;

	constructor() {
		this.Browser = new Browser();
		this.pagesNumber = 0;
		this.currentPage = 1;
		this._pagesLinks = [];
		this._jobsLinks = [];
	}

	async getLinksNumber() {
		const browser = await this.Browser.browserInstance();
		const page = await browser.newPage();

		try {
			console.log("Starting to parse pages number");
			await page.goto("https://djinni.co/jobs/");
			await page.waitForSelector("h1");
			const djinnyPageButtons = await page.$$eval(".page-link", (el) => el.map((elem) => elem.text));
			this.pagesNumber = +djinnyPageButtons.at(-2);
			console.log("Pages number acquired");
			this.setPagesLinks();
		} catch (e) {
			throw new Error("Error in getting links number");
		} finally {
			await browser.close();
		}
	}

	async getJobLinks() {
		const cluster = await this.Browser.clusterInstance(15);

		cluster.on("taskerror", (err, data, willRetry) => {
			if (willRetry) {
				console.warn(`Encountered an error while crawling ${data}. ${err.message}\nThis job will be retried`);
			} else {
				console.error(`Failed to crawl ${data}: ${err.message}`);
			}
		});

		await cluster.task(async ({ page, data: url }) => {
			await page.goto(url);
			await page.waitForSelector("h1");
			const jobLinks = await page.$$eval(".profile", (el) => el.map((elem) => elem.href));
			jobLinks.forEach((link: string) => this._jobsLinks.push(link));
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

}