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
app.get("/preferences", checkAuthentication2, checkPreferences, (req, res) => {
    res.render("preferences")
})

app.get("/dashboard", checkAuthentication2, async (req, res, next) => {
    try {
        const userId = req.user.id;

        // Get all users with their preferences
        const usersResult = await pool.query(
            `
            SELECT
                u.id,
                u.username,
                sp.courses,
                sp.availability,
                sp.study_style,
                sp.study_format,
                sp.location
            FROM users u
            JOIN study_preferences sp
                ON u.id = sp.user_id
            WHERE u.id != $1
            `,
            [userId]
        );

        // Get all friend requests sent by current user
        const friendRequestsResult = await pool.query(
            `
            SELECT recipient_id, status
            FROM friend_requests
            WHERE sender_id = $1 
            `,
            [userId] //by checking where sender_id is 1 we can ensure that we only show the requests that the current user sent, not others
        );

        // Create a map of recipient IDs to their request status
        //create requestStatusMap to have key(id) value(status) pairs for checking status of users that u sent requests too
        //looped through each row and retrieved the status for a given userid from friendRequestsResult
        const requestStatusMap = {};
        friendRequestsResult.rows.forEach(row => {
            requestStatusMap[row.recipient_id] = row.status
        }
        );



        // Add request status to each user
        const usersWithStatus = usersResult.rows.map(user => (
            { ...user, friendRequestStatus: requestStatusMap[user.id] || null } //create a new array with the 
            //user details copied over by using ...user, and we add the status of each friend request by adding it on
        ));

        res.render("dashboard", {
            user: req.user,
            users: usersWithStatus
        });

    } catch (err) {
        next(err);
    }
});

app.get("/friend-requests", checkAuthentication2, async (req, res, next) => {
    try {
        const userId = req.user.id;
        
        const incomingRequests = await pool.query(
            `SELECT
                friend_requests.sender_id,
                users.username
            FROM friend_requests
            JOIN users
            ON users.id = friend_requests.sender_id
            WHERE friend_requests.recipient_id = $1
            AND friend_requests.status = 'pending'`,
            [userId]
        );

        res.render("friend-requests", { incomingRequests: incomingRequests.rows });
    } catch (err) {
        next(err);
    }
});



app.post('/register', async (req, res) => {
    let { email, password, username } = req.body;
    // Trim whitespace from email to prevent matching issues
    email = email.trim()

    let errors = []

    if (!username || !email || !password) {
        errors.push({ message: "you must fill in all the fields" });
    }

    if (username.length < 3) {
        errors.push({ message: "username must be at least 3 characters long" });
    }

    if (username.length > 20) {
        errors.push({ message: "username must be less than 20 characters" });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        errors.push({
            message: "username can only contain letters, numbers, and underscores"
        });
    }

    if (password.length < 6) {
        errors.push({ message: "password length must be larger than 6 characters" });
    }

    if (password.length > 20) {
        errors.push({ message: "password length must be shorter than 20 characters" });
    }

    if (email.length > 40) {
        errors.push({
            message: "email length must be less than 40 characters"
        });
    }

    if (!email.includes("@")) {
        errors.push({ message: "email must contain @" });
    }

    if (errors.length > 0) {
        res.render("register", { errors })
    } else {

        // validation is passed
        let hashedPassword = await bcrypt.hash(password, 10)

        //check if email/username is identical (case-insensitive comparison)
        pool.query(
            `SELECT * FROM users 
        WHERE email = $1 OR username = $2`,
            [email, username],
            (err, results) => {
                if (err) {
                    throw err
                }
                const emailTaken = results.rows.some(user => user.email === email)
                const usernameTaken = results.rows.some(user => user.username === username)

                if (results.rows.length > 0) {

                    if (emailTaken) {
                        errors.push({ message: "Email already taken" })
                        return res.render("register", { errors })
                    }
                    if (usernameTaken) {
                        errors.push({ message: "Username already taken" })
                        return res.render("register", { errors })
                    }

                } else {
                    pool.query(
                        `INSERT INTO users (email, password, username)
                        VALUES ($1, $2, $3)
                        RETURNING id, password`, [email, hashedPassword, username], (err, result) => {
                        if (err) {
                            throw err
                        }
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


app.post("/preferences", checkAuthentication2, (req, res) => {
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
    res.redirect("/dashboard")
})

app.post("/friend-request", checkAuthentication2, (req, res, next) => {
    const sender_id = req.user.id;
    const recipient_id = req.body.recipient_id;

    // Validate recipient_id exists
    if (!recipient_id) {
        req.flash("error", "Recipient ID is required");
        return res.redirect("/dashboard");
    }

    pool.query(
        `INSERT INTO friend_requests (sender_id, recipient_id, status)
        VALUES ($1, $2, 'pending')`,
        [sender_id, recipient_id],
        (err, result) => {
            if (err) {
                return next(err);
            }
            req.flash("success_msg", "Friend request sent!");
            res.redirect("/dashboard");
        }
    );
});

//post request for the case when user clicks accept
app.post("/accept-friend-request" , checkAuthentication2, async (req, res, next)=>{
    const sender_id = req.body.sender_id;
    const recipient_id = req.user.id;
try{
await pool.query(
    //find the row in friend requests that contains sender and recipient id and set the status to accepted
    `UPDATE friend_requests
     SET status = 'accepted'
     WHERE sender_id = $1
     AND recipient_id = $2
     AND status = 'pending'
    `,[sender_id,recipient_id]
)
//redirect to same page
res.redirect("/friend-requests")
}catch(err){
    next(err)
}
})


function checkPreferences(req, res, next) {

    pool.query(
        `SELECT * FROM study_preferences WHERE user_id = $1`, [req.user.id], (err, result) => {
            if (err) {
                throw err
            }

            if (result.rowCount > 0) {
                res.redirect("/dashboard")
            } else {
                next()
            }
        }
    )
}


app.listen(5000) //port set to 5000