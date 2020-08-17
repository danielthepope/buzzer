const sleep = async (millis) => {
    await new Promise(r => setTimeout(r, millis));
}

module.exports = { sleep };
