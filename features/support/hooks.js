const { After } = require('cucumber');
const { sleep } = require('../support/env');

After(async function () {
    await sleep(5000);
    Object.keys(this.instances).forEach(async name => {
        await this.instances[name].quit();
    })
});
