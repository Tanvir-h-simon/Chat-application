const People = require("../models/People");

async function getInbox(req, res, next) {
    try {
        const users = await People.find().select("name avatar email");
        res.render("inbox", { users });
    } catch (error) {
        console.error("Error fetching inbox users:", error);
        res.render("inbox", { users: [] });
    }
}

module.exports = {
    getInbox
};