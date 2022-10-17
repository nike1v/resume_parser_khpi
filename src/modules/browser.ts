import { Cluster } from "puppeteer-cluster";
import puppeteer from "puppeteer";

class Browser {
	async clusterInstance (tabsNumber?: number, isHeadless = true) {
		try {
			console.time("clusterStart");
			console.log("Cluster instance starting");
			const cluster = await Cluster.launch({
				concurrency: Cluster.CONCURRENCY_CONTEXT,
				maxConcurrency: tabsNumber || 1,
				retryDelay: 10000,
				retryLimit: 10,
				skipDuplicateUrls: true,
				sameDomainDelay: 500,
				monitor: isHeadless,
				timeout: 2147483646,
				puppeteerOptions: {
					headless: isHeadless,
					defaultViewport: isHeadless ? { width: 1200, height: 800 } : null,
					args: [
						"--start-maximized"
					],
					timeout: 0
				}
			});
			console.timeEnd("clusterStart");
			return cluster;
		} catch {
			throw new Error("Cluster start error");
		}	
	}

	async browserInstance (isHeadless = true) {
		try {
			console.time("browserStart");
			console.log("Browser instance starting");
			const browser = await puppeteer.launch({
				headless: isHeadless,
				defaultViewport: isHeadless ? { width: 1200, height: 800 } : null,
				args: [
					"--start-maximized"
				],
				timeout: 0
			});
			console.timeEnd("browserStart");
			return browser;
		} catch {
			throw new Error("Browser start error");
		}	
	}
}

export default Browser;