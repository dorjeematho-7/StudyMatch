const express = require("express")
const app = express()

app.set("view engine", "ejs")
app.use(express.static("public"))
app.get("/", (req, res) => {

    res.render("homepage")

})


app.get("/login", (req, res) => {
    res.render("login")

})
app.get("/register", (req, res) => {
    res.render("register")

})





















app.listen(5000) //port set to 5000