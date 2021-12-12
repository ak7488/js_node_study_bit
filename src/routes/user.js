const express = require("express");
const { clent } = require("../mongodb");
const bcrypt = require("bcrypt");
const { generateJWT } = require("../helpers/generateJWT");
const { hashPassword } = require("../helpers/hashpassword");
const auth = require("../helpers/auth");
const { ObjectId } = require("bson");

const router = express.Router();
let db, collection;

clent.then((e) => {
    db = e.db(process.env.DB_NAME);
    collection = db.collection("USER");
});

// body requires => name:string, password:string, class:string
router.post("/auth/signup", async (req, res) => {
    try {
        const { name, password, studentClass } = req.body;

        // no name, password or class then restrict signup.
        if (!name || !password || !studentClass) {
            res.send({ error: "Name, password and studen class is required" });
            return;
        }

        //checking the data type of provided data.
        if (
            typeof name !== "string" ||
            typeof password !== "string" ||
            typeof studentClass !== "string"
        ) {
            res.send({ error: "Wrong data type" });
            return;
        }

        //checking if the provided name is avalable.
        const isNameAvalable = (await (
            await collection.findOne({ name })
        )?._id)
            ? false
            : true;

        console.log(isNameAvalable);

        if (!isNameAvalable) return res.send({ error: "Name already taken" });

        //creating token where name is main data
        const token = generateJWT(name);
        // hashing password
        const hash = await hashPassword(password);
        const currentTime = new Date().getTime();

        //saving user data.
        const { insertedId } = await collection.insertOne({
            name,
            password: hash,
            studentClass,
            tokens: [token],
            createdAt: currentTime,
            updatedAt: currentTime,
        });

        res.send({
            id: insertedId.toString(),
            token,
            name,
            studentClass,
            createdAt: currentTime,
            updatedAt: currentTime,
        });
    } catch (e) {
        console.log(e);
        res.status(500).send();
    }
});

// body requires => name:string, password:string
router.post("/auth/login", async (req, res) => {
    try {
        const { name, password } = req.body;

        // no name, password or class then restrict signup.
        if (!name || !password) {
            res.send({ error: "Name, password and studen class is required" });
            return;
        }

        //checking the data type of provided data.
        if (typeof name !== "string" || typeof password !== "string") {
            res.send({ error: "Wrong data type" });
            return;
        }

        const user = await (await collection).findOne({ name });
        if (!user || !user._id)
            return res.send({ error: "No user with the name " + name });

        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) return res.send({ error: "Wrong password" });

        //creating token where name is main data
        const token = generateJWT(name);
        const currentTime = new Date().getTime();

        // slicing the tokens so that only three devices would be loged in at a time.
        const tokens = [token, ...user.tokens.slice(0, 2)];

        //updating user data with new token and updatedAt.
        await (
            await collection
        ).updateOne(
            { name },
            {
                $set: { tokens, updatedAt: currentTime },
            }
        );

        res.send({
            id: user._id.toString(),
            token,
            name,
            studentClass: user.studentClass,
            createdAt: user.createdAt,
            updatedAt: currentTime,
        });
    } catch (e) {
        console.log(e);
        res.status(500).send();
    }
});

// body requires => token as Bearer token in header.
router.get("/auth/get_user_by_token", auth, async (req, res) => {
    try {
        const { name, _id, studentClass, createdAt, updatedAt } = req.user;
        res.send({
            id: _id.toString(),
            token: req.token,
            name,
            studentClass,
            createdAt,
            updatedAt,
        });
    } catch (e) {
        console.log(e);
        res.status(500).send();
    }
});

// body requires => id
router.get("/auth/get_user/:id", auth, async (req, res) => {
    try {
        const user = await (
            await collection
        ).findOne({ _id: ObjectId(req.params.id) });
        if (!user || !user._id)
            return res.send({ error: "No user found with this id" });

        const { name, _id, studentClass, createdAt, updatedAt } = user;

        res.send({
            id: _id.toString(),
            name,
            studentClass,
            createdAt,
            updatedAt,
        });
    } catch (e) {
        console.log(e);
        res.status(500).send();
    }
});

// body requires => id
router.get("/auth/get_user", auth, async (req, res) => {
    try {
        let user;

        if (req.query.name) {
            user = await (await collection).findOne({ name: req.query.name });
        } else if (req.query.id) {
            user = await (
                await collection
            ).findOne({ _id: ObjectId(req.query.id) });
        } else {
            return res.send({ error: "No query provided." });
        }

        if (!user || !user._id)
            return res.send({ error: "No user found with this id" });
        const { name, _id, studentClass, createdAt, updatedAt } = user;
        res.send({
            id: _id.toString(),
            name,
            studentClass,
            createdAt,
            updatedAt,
        });
    } catch (e) {
        console.log(e);
        res.status(500).send();
    }
});

// body requires => token:sting(in body or header as Bearer token);
// body may have => name:string, password:string, class:string
router.put("/auth/update", auth, async (req, res) => {
    try {
        const name =
            req.body.name && typeof req.body.name === "string"
                ? req.body.name
                : req.user.name;
        const password =
            req.body.password && typeof req.body.password === "string"
                ? await hashPassword(req.body.password)
                : req.user.password;
        const studentClass =
            req.body.studentClass && typeof req.body.studentClass === "string"
                ? req.body.studentClass
                : req.user.studentClass;

        //creating token where name is main data
        const token = generateJWT(name);
        const currentTime = new Date().getTime();

        //updating user data with new token and updatedAt.
        await (
            await collection
        ).updateOne(
            { name: req.user.name },
            {
                $set: {
                    name,
                    password,
                    studentClass,
                    updatedAt: currentTime,
                    tokens: [token],
                },
            }
        );

        res.send({
            id: req.user._id.toString(),
            name,
            token: token,
            studentClass,
            createdAt: req.user.createdAt,
            updatedAt: currentTime,
        });
    } catch (e) {
        console.log(e);
        res.status(500).send();
    }
});

// body requires => token:sting(in body or header as Bearer token);
router.delete("/auth/delete", auth, async (req, res) => {
    try {
        await (await collection).deleteOne({ name: req.user.name });
        res.send("ok");
    } catch (e) {
        console.log(e);
        res.status(500).send();
    }
});

module.exports = {
    userRouter: router,
};
