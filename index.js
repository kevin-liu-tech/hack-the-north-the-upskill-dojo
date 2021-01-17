"use strict";

const { TextAnalyticsClient, AzureKeyCredential } = require("@azure/ai-text-analytics");
const key = '6d40308d8da843418916be22fef31d14';
const endpoint = 'https://text-analyzer-speakers.cognitiveservices.azure.com/';

const textAnalyticsClient = new TextAnalyticsClient(endpoint,  new AzureKeyCredential(key));

async function keyPhraseExtraction(client){

    const keyPhrasesInput = [
        "",
    ];
    const keyPhraseResult = await client.extractKeyPhrases(keyPhrasesInput);

    keyPhraseResult.forEach(document => {
        console.log(`ID: ${document.id}`);
        console.log(`\tDocument Key Phrases: ${document.keyPhrases}`);
    });
}
keyPhraseExtraction(textAnalyticsClient);
