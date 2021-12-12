const jwt = require("jsonwebtoken");
const { clent } = require("../mongodb");

const auth = async (req, res, next) => {
    try {
        //getting increpted token from body or header
        const tokenIncrepted =
            req.body.token || req.headers.authorization.split(" ")[1];

        // decoding token and restrecting if no token
        const token = jwt.decode(tokenIncrepted, process.env.JWT_SECRET);
        if (!token) return res.status(401).send();

        // checking if token has expired and if yes then restricting access.
        if (token.time < new Date().getTime())
            return res.status(401).send();

        const user = await (await clent)
            .db(process.env.DB_NAME)
            .collection("USER")
            .findOne({ name: token.data });
        if (!user || !user._id) return res.status(401).send();

        // adding user object and token string in request object
        req.user = user;
        req.token = tokenIncrepted;

        next();
    } catch (e) {
        console.log(e);
        res.status(401).send();
    }
};

module.exports = auth;
