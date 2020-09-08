const express = require("express");
const Services = require("./Services");
const app = express();
const cookiesMiddleware = require('universal-cookie-express');

app.use(express.json({limit: "50mb"}), (req, res, next) => {
    res.header("Access-Control-Allow-Origin", ["http://localhost:3000"]);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Set-Cookie");
    next();
}, cookiesMiddleware());

app.post("/registration", (req, res) => {
    Services.registration(req.body).then(r => {
        res.cookie("authToken", r.authToken, { maxAge: 900000, httpOnly: true });
        res.cookie("myId", r.myId, { maxAge: 900000, httpOnly: false });
        res.send({err: r.err});
    });
});

app.post("/authorization", (req, res) => {
    Services.authentication(req.body).then(r => {
        res.cookie("authToken", r.authToken, { maxAge: 900000, httpOnly: true });
        res.cookie("myId", r.myId, { maxAge: 900000, httpOnly: false });
        res.send({err: r.err});
    });
});

app.post("/exit", (req, res) => {
    Services.exit(req.universalCookies.get("authToken"), req.universalCookies.get("myId"));
    res.cookie("authToken", 0, {maxAge: 0, httpOnly: true})
    res.cookie("myId", 0, {maxAge: 0, httpOnly: false})
    res.send();
});

app.post("/createPost", (req, res) => {
    Services.createPost(req.body, req.universalCookies.get("authToken"), req.universalCookies.get("myId")).then(r => res.send(r));
});

app.post("/newComment", (req, res) => {
    Services.newComment(req.body, req.universalCookies.get("authToken"), req.universalCookies.get("myId")).then(r => res.send(r));
});

app.post("/likePost", (req, res) => {
    Services.likePost(req.body.postId, req.universalCookies.get("authToken"), req.universalCookies.get("myId")).then(r => res.send(r));
});

app.get("/isAuth", (req, res) => {
    res.send(Services.isAuth(req.universalCookies.get("authToken"), req.universalCookies.get("myId")));
});

app.get("/getNewsFeed", (req, res) => {
   Services.getNewsFeed(req.universalCookies.get("authToken"), req.universalCookies.get("myId"), req.query).then(r => res.send(r));
});

app.get("/getUsers", (req, res) => {
   Services.getUsers(req.universalCookies.get("authToken"), req.universalCookies.get("myId")).then(r => res.send(r));
});

app.get("/getImage", (req, res) => {
    Services.getImage(req.universalCookies.get("authToken"), req.universalCookies.get("myId"), req.query).then(r => {
        if(r.err) { res.header("Content-Type", "application/json") }
        else { res.header("Content-Type", "image/png"); }
        res.send(r)
    });
});

console.log("server is running");
app.listen(3001);



