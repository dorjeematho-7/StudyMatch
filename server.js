const express = require("express")
const app = express()
const { pool } = require("./dbConfig")
const bcrypt = require("bcrypt")
const session = require("express-session")
const flash = require("express-flash")
const passport = require("passport")

const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer(app);
const io = new Server(server);

server.listen(5000);


const initializePassport = require("./passportConfig")
initializePassport(passport) //intialize function I created in passportConfig

app.set("view engine", "ejs")
app.use(express.static("public"))
app.use(express.urlencoded({ extended: false }))

const sessionMiddleware = session({ //storing the returned function from session into sessionMiddleware variable
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
});

app.use(sessionMiddleware);

io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next); //use sesssionMiddleware variable to feed to socket
});



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

        // Get filter parameters from query string
        const filters = {
            courses: req.query.courses || '',
            study_style: req.query.study_style || '',
            study_format: req.query.study_format || '',
            location: req.query.location || '',
            availability: req.query.availability || ''
        };

        // Build WHERE clause for filters
        let whereConditions = ['u.id != $1'];
        let queryParams = [userId];
        let paramIndex = 2;

        if (filters.courses) {
            whereConditions.push(`sp.courses ILIKE $${paramIndex}`);
            queryParams.push(`%${filters.courses}%`);
            paramIndex++;
        }

        if (filters.study_style) {
            whereConditions.push(`sp.study_style = $${paramIndex}`);
            queryParams.push(filters.study_style);
            paramIndex++;
        }

        if (filters.study_format) {
            whereConditions.push(`sp.study_format = $${paramIndex}`);
            queryParams.push(filters.study_format);
            paramIndex++;
        }

        if (filters.location) {
            whereConditions.push(`sp.location = $${paramIndex}`);
            queryParams.push(filters.location);
            paramIndex++;
        }

        if (filters.availability) {
            whereConditions.push(`sp.availability ILIKE $${paramIndex}`);
            queryParams.push(`%${filters.availability}%`);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Get all users with their preferences (with filters applied)
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
            ${whereClause}
            `,
            queryParams
        );

        // Get all friend requests sent by current user
        const friendRequestsResult = await pool.query(
            `
            SELECT recipient_id, status
            FROM friend_requests
            WHERE sender_id = $1 
            `,
            [userId]
        );

        // Create a map of recipient IDs to their request status
        const requestStatusMap = {};
        friendRequestsResult.rows.forEach(row => {
            requestStatusMap[row.recipient_id] = row.status
        });

        // Add request status to each user
        const usersWithStatus = usersResult.rows.map(user => (
            { ...user, friendRequestStatus: requestStatusMap[user.id] || null }
        ));

        // Get unique values for filter dropdowns
        const allPreferences = await pool.query(
            `SELECT DISTINCT study_style, study_format, location FROM study_preferences WHERE user_id != $1`,
            [userId]
        );

        const uniqueStudyStyles = [...new Set(allPreferences.rows.map(r => r.study_style).filter(Boolean))];
        const uniqueStudyFormats = [...new Set(allPreferences.rows.map(r => r.study_format).filter(Boolean))];
        const uniqueLocations = [...new Set(allPreferences.rows.map(r => r.location).filter(Boolean))];

        res.render("dashboard", {
            user: req.user,
            users: usersWithStatus,
            filters: filters,
            filterOptions: {
                studyStyles: uniqueStudyStyles,
                studyFormats: uniqueStudyFormats,
                locations: uniqueLocations
            }
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

app.get("/chat", checkAuthentication2, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const chatResults = await pool.query( //USE UNION HERE TO ENSURE THAT ALSO THE CHAT WILL POP UP FOR THE SENDER
      `
      SELECT u.id, u.username
      FROM friend_requests fr
      JOIN users u ON u.id = fr.sender_id
      WHERE fr.status = 'accepted'
      AND fr.recipient_id = $1

      UNION 

      SELECT u.id, u.username
      FROM friend_requests fr
      JOIN users u ON u.id = fr.recipient_id
      WHERE fr.status = 'accepted'
      AND fr.sender_id = $1
      `,
      [userId]
    );

    res.render("chat", { chatResults: chatResults.rows });
  } catch (err) {
    next(err);
  }
});


app.get("/chat/:userId", checkAuthentication2, async (req, res, next) => {
    try {
        const currentUserId = req.user.id;
        const otherUserId = parseInt(req.params.userId);

        // Verify that the users are friends (accepted friend request in either direction)
        const friendshipCheck = await pool.query(
            `SELECT id FROM friend_requests 
             WHERE status = 'accepted' 
             AND (
                 (sender_id = $1 AND recipient_id = $2) 
                 OR (sender_id = $2 AND recipient_id = $1)
             )`,
            [currentUserId, otherUserId]
        );

        if (friendshipCheck.rows.length === 0) {
            req.flash("error", "You can only chat with your friends");
            return res.redirect("/chat");
        }

        // Get the other user's information
        const otherUserResult = await pool.query(
            `SELECT id, username FROM users WHERE id = $1`,
            [otherUserId]
        );

        if (otherUserResult.rows.length === 0) {
            req.flash("error", "User not found");
            return res.redirect("/chat");
        }

        const otherUser = otherUserResult.rows[0];

        res.render("chat-window", {
            user: req.user,
            otherUser: otherUser
        });

    } catch (err) {
        next(err);
    }
})


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
app.post("/accept-friend-request", checkAuthentication2, async (req, res, next) => {
    const sender_id = req.body.sender_id;
    const recipient_id = req.user.id;
    try {
        await pool.query(
            //find the row in friend requests that contains sender and recipient id and set the status to accepted
            `UPDATE friend_requests
     SET status = 'accepted'
     WHERE sender_id = $1
     AND recipient_id = $2
     AND status = 'pending'
    `, [sender_id, recipient_id]
        )
        //redirect to same page
        res.redirect("/friend-requests")
    } catch (err) {
        next(err)
    }
})
app.post("/accept-friend-request", checkAuthentication2, async (req, res, next) => {
    const sender_id = req.body.sender_id;
    const recipient_id = req.user.id;
    try {
        await pool.query(
            //find the row in friend requests that contains sender and recipient id and set the status to accepted
            `UPDATE friend_requests
     SET status = 'accepted'
     WHERE sender_id = $1
     AND recipient_id = $2
     AND status = 'pending'
    `, [sender_id, recipient_id]
        )
        //redirect to same page
        res.redirect("/friend-requests")
    } catch (err) {
        next(err)
    }
})
app.post("/decline-friend-request", checkAuthentication2, async (req, res, next) => {
    const sender_id = req.body.sender_id;
    const recipient_id = req.user.id;
    try {
        await pool.query(
            //find the row in friend requests that contains sender and recipient id and set the status to accepted
            `UPDATE friend_requests
     SET status = 'declined'
     WHERE sender_id = $1
     AND recipient_id = $2
     AND status = 'pending'
    `, [sender_id, recipient_id]
        )
        //redirect to same page
        res.redirect("/friend-requests")
    } catch (err) {
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


