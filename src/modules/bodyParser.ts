import { englishLevelsKeywords, englishWordDefinition, professionKeywords } from "../constants/constants";

class BodyParser {
	private englishKeyword: string;
	private _professionKeywords: string[];

	constructor() {
		this.englishKeyword = "";
		this._professionKeywords = [];
	}

	private englishKeywordGrabber (parsedStrings: string[]) {
		const keyword = parsedStrings.filter((word: string) => englishLevelsKeywords.find((keyword: string) => word.includes(keyword)));
		if (keyword.length < 1) {
			return "intermediate";
		}
		
		return keyword[0];
	}
	
	englishLevelParser (jobDescription: string) {
		const descriptionRows = jobDescription.toLowerCase().split("\n");
		const isContainsEnglishWord = descriptionRows.filter((descriptionRow: string) => englishWordDefinition.find((englishDefinition: RegExp) => descriptionRow.match(englishDefinition)));
		if(isContainsEnglishWord.length > 0) {
			isContainsEnglishWord.forEach((englishWord: string) => {
				const rowSeparated = englishWord.split(" ");
				const result = this.englishKeywordGrabber(rowSeparated);
				this.englishKeyword = result;
			});
		}

		return this.englishKeyword;
	}

	private professionKeywordGrabber (parsedStrings: string[]) {
		const professionKeywordsKeys = Object.keys(professionKeywords);
		const keywords: string[] = [];
		parsedStrings.forEach((parsedString: string) => 
			professionKeywordsKeys.forEach((professionKey: string) => 
				professionKeywords[professionKey].forEach((keyword: string) => 
					parsedString.includes(keyword) ? keywords.push(professionKey) : undefined
				)
			));

		if (keywords.length < 1) {
			return ["Other"];
		}
		
		return Array.from(new Set(keywords));
	}

	professionsParser (jobDescription: string) {
		const description = jobDescription.split("\n");
		const result = this.professionKeywordGrabber(description);
		this._professionKeywords = result;
		return this._professionKeywords;
	}
}

export default BodyParser;