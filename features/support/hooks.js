const { After, AfterAll, BeforeAll } = require('cucumber');
const { fork } = require('child_process');
const path = require('path');
const { sleep } = require('../support/env');

let serverProcess;

BeforeAll({ timeout: 15000 }, async function () {
    serverProcess = fork(path.resolve(__dirname, '../../app.js'), [], {
        cwd: path.resolve(__dirname, '../..'),
        env: { ...process.env, PORT: '0' },
        stdio: 'inherit'
    });

    try {
        const port = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Timed out waiting for the test server to start'));
            }, 10000);

            serverProcess.once('message', message => {
                if (message && message.type === 'listening') {
                    clearTimeout(timeout);
                    resolve(message.port);
                }
            });
            serverProcess.once('error', error => {
                clearTimeout(timeout);
                reject(error);
            });
            serverProcess.once('exit', (code, signal) => {
                clearTimeout(timeout);
                reject(new Error(`Test server exited before starting (code ${code}, signal ${signal})`));
            });
        });

        process.env.TEST_ENDPOINT = `http://127.0.0.1:${port}`;
    } catch (error) {
        serverProcess.kill();
        serverProcess = undefined;
        throw error;
    }
});

AfterAll({ timeout: 10000 }, async function () {
    if (!serverProcess) {
        return;
    }

    const child = serverProcess;
    serverProcess = undefined;
    if (child.exitCode !== null || child.signalCode !== null) {
        return;
    }

    const exited = new Promise(resolve => child.once('exit', resolve));
    child.kill();
    await exited;
});

After(async function () {
    await sleep(5000);
    Object.keys(this.instances).forEach(async name => {
        await this.instances[name].quit();
    })
});
