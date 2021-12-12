const {MongoClient} = require('mongodb');

const clent = MongoClient.connect(process.env.MONGODB_URL).then(e => {
    e.connect();

    return e
})

module.exports = {clent}
