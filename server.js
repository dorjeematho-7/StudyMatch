const express = require("express")
const app = express()
const { pool } = require("./dbConfig")
const bcrypt = require("bcrypt")
const session = require("express-session")
const flash = require("express-flash")


app.set("view engine", "ejs")
app.use(express.static("public"))
app.get("/", (req, res) => {

    res.render("homepage")

})


app.use(express.urlencoded({ extended: false }))
app.use(session({
    secret: process.env.SESSION_SECRET,

    resave: false, //we dont want to resave variables if nothing has changed

    saveUninitialized: false // we dont want to resave if no values are placed 
}))

app.use(flash())

app.get("/login", (req, res) => {
    res.render("login")

})
app.get("/register", (req, res) => {
    res.render("register")
})

app.post('/register', async (req, res) => {
    let { email, password } = req.body;
    // Trim whitespace from email to prevent matching issues
    email = email.trim().toLowerCase();

    let errors = []


    if (!email || !password) {
        errors.push({ message: "you must fill in all the fields" })
    }
    if (password.length < 6) {
        errors.push({ message: "password length must be larger than 6 characters" })
    }
    if (password.length > 20) {
        errors.push({ message: "password length shorter than 20 characters" })
    }
    if (email.length > 40) {
        errors.push({
            message: "email length must be less than 40 characters"
        })
    }

    if (!email.includes("@")) {
        errors.push({ message: "email must contain @" })
    }




    if (errors.length > 0) {
        res.render("register", { errors })
    } else {

        // validation is passed
        let hashedPassword = await bcrypt.hash(password, 10)

        //check if email is identical (case-insensitive comparison)
        pool.query(
            `SELECT * FROM users 
        WHERE email = $1`,
            [email],
            (err, results) => {
                if (err) {
                    throw err
                }
                else if (results.rows.length > 0) {
                    errors.push({ message: "Email already taken" })
                    res.render("register", { errors })
                } else {
                    pool.query(
                        `INSERT INTO users (email, password)
                        VALUES ($1, $2)
                        RETURNING id, password`, [email, hashedPassword], (err, result) => {
                        if (err) {
                            throw err
                        }
                        console.log(results.rows);
                        req.flash("success_msg", "You are now registered. Please log in")
                        res.redirect("/login")



                    }
                    )
                }
            }

        )
    }
})

app.listen(5000) //port set to 5000