const express = require('express');
const {userRouter} = require('./routes/user')

const app = express();
const port = process.env.PORT;

app.use(express.json())
app.use(userRouter);

app.get('/', (req, res) => {
    res.send('ok')
});

app.listen(port, () => {
    console.log(`Server is up and running on port ${port}`)
})