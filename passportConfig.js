const LocalStrategy = require("passport-local").Strategy
const { authenticate } = require("passport")
const { pool } = require("./dbConfig")
const bcrypt = require("bcrypt")

const authenticateUser = (email, password, done) => {

    pool.query(
        `SELECT * FROM users WHERE email = $1`, [email], (err, results) => {
            if (err) {
                throw err
            }

            console.log(results.rows)


            if (results.rows.length > 0) {
                const user = results.rows[0]; //get the user related to the matching email


                bcrypt.compare(password, user.password, (err, isMatch) => {

                    if (err) {
                        throw err
                    }
                    if (isMatch) {
                        return done(null, user) //done function returns user and store it in the session cookie to use later
                    } else {
                        return done(null, false, { message: "incorrect password" })
                    }


                })
            } else {
                return done(null, false, { message: "email is not registered" })
            }

        })

}



function initialize(passport) { //initialzing functions for passport
    passport.use(new LocalStrategy({
        usernameField: "email",
        passwordField: "password"
    },
        authenticateUser


    ))

    passport.serializeUser((user, done) => { //stores user id in session cookie
        done(null, user.id)
    })


    passport.deserializeUser((id, done) => { //uses id to obtain user details
        pool.query(
            `SELECT * FROM users WHERE id = $1`, [id], (err, results) => {
                if (err) {
                    throw err
                }
                else {
                    return done(null, results.rows[0])//grab the result and deserialize it
                }

            }

        )
    })
}
module.exports = initialize