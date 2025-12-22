const express = require("express")
const app = express()
const { pool } = require("./dbConfig")
const bcrypt = require("bcrypt")
const session = require("express-session")
const flash = require("express-flash")
const passport = require("passport")


const initializePassport = require("./passportConfig")
initializePassport(passport) //intialize function I created in passportConfig

app.set("view engine", "ejs")
app.use(express.static("public"))

app.use(express.urlencoded({ extended: false }))
app.use(session({
    secret: process.env.SESSION_SECRET,

    resave: false, //we dont want to resave variables if nothing has changed

    saveUninitialized: false // we dont want to resave if no values are placed 
}))

app.use(passport.initialize())
app.use(passport.session())


app.use(flash())

app.get("/login", checkAuthentication, (req, res) => {
    res.render("login")
})
app.get("/register", (req, res) => {
    res.render("register")
})
app.get("/", (req, res) => {
    res.render("homepage", { userLoggedIn: req.isAuthenticated() }) //needed to ensure logout button can be added when the user is logged in 
})

app.get("/homepage", (req, res) => {
    res.render("homepage", { userLoggedIn: req.isAuthenticated() })
})
app.get("/logout", (req, res, next) => {

    req.logOut(function (err) { //logout requires a callback 
        if (err) {
            return next(err)
        } else {
            req.flash("success_msg", "You have logged out")
            res.redirect("/login")
        }
    })
})
app.get("/preferences", checkAuthentication2, (req, res) => {
    res.render("preferences")
})

app.get("/dashboard", checkAuthentication2, (req, res) => {
    res.render("dashboard")
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
//setting up user login 


app.post("/login", passport.authenticate("local", { //authenticate users using the local strategy
    successRedirect: "/preferences",
    failureRedirect: "/login",
    failureFlash: true
}))

function checkAuthentication(req, res, next) { //ensure user cannot log in 2x
    if (req.isAuthenticated()) {
        req.flash("error", "You are already logged in!")
        return res.redirect("/homepage")
    }
    next()
}
function checkAuthentication2(req, res, next) { //allows user to progress to next page if logged in
    if (req.isAuthenticated()) {
        return next();
    } else {
        return res.redirect("/login")
    }
}


app.post("/preferences", (req, res) => {
    let { courses, availability, study_style, study_format, location } = req.body
    const user_id = req.user.id

    //checkboxes can be any type of value so its best we normalize it first

    if (Array.isArray(availability)) { //check if user selected more than one option
        availability = availability.join(",")
    }
    if (!availability) {
        availability = ""
    }
    pool.query(
        `INSERT INTO study_preferences (user_id, courses, availability, study_style, study_format,location)
        VALUES ($1,$2,$3,$4,$5,$6)`, [user_id, courses, availability, study_style, study_format, location], (err, res) => {
        if (err) {
            throw err
        }
    }
    )
    res.render("dashboard")
})

function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();

    }
    
    res.redirect("/login")

}
app.listen(5000) //port set to 5000