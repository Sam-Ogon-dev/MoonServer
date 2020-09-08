const DB = require("./DataBase.js");
const fs = require("fs");

function Services() {
    let authTokens = [];

    function generateAuthToken(myId) {
        let authToken = "";
        let symbolArr = ["a", "b", "c", "d", "e", "f",
            "g", "h", "i", "g", "k", "l",
            "m", "n", "o", "p", "q", "r",
            "s", "t", "u", "v", "w", "x", "y", "z",
            1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

        for (let i = 0; i <= 8; i++) {
            authToken += symbolArr[Math.floor(Math.random() * Math.floor(symbolArr.length - 1))];
        }

        authTokens.push({authToken, myId});
        return authToken;
    }

    this.getImage = async (token, myId, {type, id}) => {
        if(this.isAuth(token, myId).err) { return  this.isAuth(token) }
        let path = "";
        if(type === "postImage") { path = `./photoStorage/${id}.jpg` }
        if(type === "avatar") { path = `./avatars/${id}.png` }

        return await new Promise(resolve => {
           fs.readFile(path, (err, image) => {
               if(!path) { resolve({err: 2}) }
               if(err) { resolve({err: 1}) }
               resolve(image);
           })
        });
    }

    this.isAuth = (token, myId) => {
        for (const authUser of authTokens) {
            if(authUser.authToken === token && authUser.myId === +myId) { return {err: 0} }
        }
        //IF USERS IS NOT AUTH
        return {err: 1}
    }

    this.exit = (token, myId) => {
        if(this.isAuth(token, myId).err) { return  this.isAuth(token) }

        for (let i = 0; i < authTokens; i++) {
            if((authTokens[i].token === token && authTokens[i].id === myId)) {
                authTokens.splice(i, 1);
            }
        }
    }

    this.getNewsFeed = async (token, myId, filter) => {
        if(this.isAuth(token, myId).err) { return  this.isAuth(token) }

        return await DB.getNews(filter, myId);
    }

    this.registration = async ({name, lastName, password, repeatPassword, email}) => {
        if(!password || !name || !lastName || !password || !repeatPassword || !email) { return {err: 4} }
        if(!(/^[\w\.]+@[\w]+\.[a-z]{2,4}$/i.test(email))) { return {err: 3} }
        if(password !== repeatPassword) { return {err: 1} }

        let response =  await DB.registration({name, lastName, password, email});
        if(response.err === 0) { response.authToken = generateAuthToken() }
        return response;
    }

    this.authentication = async ({email, password}) => {
        if(!password || !email) { return {err: 4} }
        if(!(/^[\w\.]+@[\w]+\.[a-z]{2,4}$/i.test(email))) { return {err: 3} }

        let response =  await DB.authentication({email, password});
        if(response.err === 0) { response.authToken = generateAuthToken(response.myId) }
        return response;
    }

    this.createPost = async ({photos, text}, token, myId) => {
        if(this.isAuth(token, myId).err) { return  this.isAuth(token) }
        if(!photos.length || !myId) { return {err: 1} }

        return await DB.createPost(myId, photos, text);
    }

    this.newComment = async ({text, postId}, token, myId) => {
        if(this.isAuth(token, myId).err) { return  this.isAuth(token) }
        return await DB.newComment(text, postId, myId);
    }

    this.likePost = async (postId, token, myId) => {
        if(this.isAuth(token, myId).err) { return  this.isAuth(token) }
        return await DB.likePost(postId, myId);
    }

    this.getUsers = async (token, myId) => {
        if(this.isAuth(token, myId).err) { return  this.isAuth(token) }
        return await DB.getUsers();
    }
}

module.exports = new Services();