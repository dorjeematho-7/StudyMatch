const express = require("express")
const app = express()
const pool = require("./dbConfig")

app.set("view engine", "ejs")
app.use(express.static("public"))
app.get("/", (req, res) => {

    res.render("homepage")

})


app.use(express.urlencoded({ extended: false }))

app.get("/login", (req, res) => {
    res.render("login")

})
app.get("/register", (req, res) => {
    res.render("register")
})

app.post('/register', (req,res) =>{
    let {email, password} = req.body;

    console.log(email,password)

    let errors = []


    if (!email || !password){
        errors.push({message: "you must fill in all the fields"})
    }
    if (password.length < 6 ){
        errors.push({message:"password length must be larger than 6 characters"})
    }
    if (password.length  > 20  ){
        errors.push({message:"password length shorter than 20 characters"})
    }
    if (email.length > 40){
        errors.push({message: "email length must be less than 40 characters"
        })
    }
    if (email && !email.includes("@")){
        errors.push({message: "email must include @ symbol"})
    }
    if (password && !/\d/.test(password)){
        errors.push({message: "password must include at least one number"})
    }
    

        if (errors.length > 0){
            res.render("register", {errors})
        }

})

app.listen(5000) //port set to 5000