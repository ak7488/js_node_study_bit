const jwt = require('jsonwebtoken');

const generateJWT = (data, sec = 86400) => {
    const time = new Date().getTime() + (sec * 1000);
    const token = jwt.sign({data, time}, process.env.JWT_SECRET);
    return token
}

module.exports = {generateJWT}