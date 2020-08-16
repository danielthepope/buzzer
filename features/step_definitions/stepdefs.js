const assert = require('assert');
const { Given, When, Then, After } = require('cucumber');
const { Builder, By, Key, until } = require('selenium-webdriver');

const BROWSER = 'firefox';
const ENDPOINT = 'http://localhost:8080';
// const ENDPOINT = 'https://buzzer.dpope.uk';

const sleep = async (millis) => {
    await new Promise(r => setTimeout(r, millis));
}

Given('an app instance called {string}', { timeout: 10000 }, async function (name) {
    if (this.instances === undefined) {
        this.instances = {};
    }
    let driver = await new Builder().forBrowser(BROWSER).build();
    this.instances[name] = driver;
    await driver.get(ENDPOINT);
});

When('{string} clicks the {string} button', async function (name, id) {
    await this.instances[name].findElement(By.id(id)).click();
});

When('{string} enters {string} in the {string} box', async function (name, playerName, id) {
    await this.instances[name].findElement(By.id(id)).sendKeys(playerName);
});

When('{string} enters the game ID', async function (name) {
    await this.instances[name].findElement(By.id('gameid-input')).sendKeys(this.gameId);
});

When('{string} buzzes', async function (name) {
    const buzzer = await this.instances[name].findElement(By.id('buzzer'));
    const actions = this.instances[name].actions({ async: true });
    actions.pause(actions.mouse()).move({ origin: buzzer }).press().pause(20).release();
    actions.perform();
});

Then('{string} should see {string} in element {string}', async function (name, text, id) {
    await sleep(200);
    const matchingElements = await this.instances[name].findElements(By.xpath(`//*[contains(text(),'${text}')]`));
    assert.strictEqual(1, matchingElements.length, `"${text}" not found on ${name} view`);
});

Then('{string} sould see a 4-digit game ID', async function (name) {
    const gameId = await this.instances[name].findElement(By.id('game-id-display')).getText();
    assert.match(gameId, /\d{4}/);
    this.gameId = gameId;
});

Then('{string} should see the {string} element', async function (name, id) {
    const matchingElements = await this.instances[name].findElements(By.id(id));
    assert.strictEqual(1, matchingElements.length, `Element with ID "${id}" not found on ${name} view`);
});

After(async function () {
    await sleep(5000);
    Object.keys(this.instances).forEach(async name => {
        await this.instances[name].quit();
    })
});
