const express = require("express")
const app = express()

app.set("view engine", "ejs")
app.use(express.static("public"))
app.get("/", (req, res) => {

    res.render("homepage")

})






















app.listen(5000) //port set to 5000