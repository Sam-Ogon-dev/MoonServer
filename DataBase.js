const mysql = require("mysql");
const fs = require("fs");

function DB() {
    const connection = mysql.createConnection({
        database: "moon",
        host: "localhost",
        user: "root",
        password: "root"
    });

    connection.connect(function (err) {
        if (err) {
            return console.error("error: " + err.message);
        } else {
            console.log("database is connected");
        }
    });

    this.registration = async ({name, lastName, password, email}) => {
        return await new Promise(resolve => {
            connection.query(`SELECT * FROM users WHERE email = "${email}"`, (err, values) => {
                if (values.length) {
                    resolve({err: 2})
                } else {
                    connection.query(`INSERT INTO users(name, last_name, password, email, avatar) VALUES ("${name}", "${lastName}", "${password}", "${email}", 0)`,
                        async () => {
                            resolve(await this.authentication({email, password}))
                        });
                }
            })
        });
    }

    this.authentication = async ({email, password}) => {
        return await new Promise(resolve => {
            connection.query(`SELECT * FROM users WHERE email = "${email}" AND password = "${password}"`, (err, values) => {
                if (values.length) {
                    resolve({err: 0, myId: values[0].id})
                } else {
                    resolve({err: 5})
                }
            });
        });
    }

    this.getNews = async (filter, myId) => {
        let response = [];

        const allNews = await new Promise(resolve => {
            let filterQuery = "";
            if (filter.id) { filterQuery += `WHERE users.id = "${filter.id}"`
            }
            if (filter.liked) {
                filterQuery += `WHERE (news.id) in (SELECT likes.post_likes FROM likes WHERE likes.user = ${filter.liked});`
            }

            connection.query(`SELECT news.*, users.name, users.last_name, users.avatar FROM news JOIN users ON news.author_post = users.id ${filterQuery}`,
                (err, values) => {
                if (filter.liked) console.log(filter.liked);
                    resolve(values)
                });
        });

        const allComments = await new Promise(resolve => {
            let filterQuery = "";
            if (filter.id) {
                filterQuery += `WHERE comments.author_comment = "${filter.id}"`
            }
            if (filter.liked) {
                filterQuery += `WHERE comments.post_comment in (SELECT likes.post_likes FROM likes WHERE likes.user = "${filter.liked}")`
            }

            connection.query(`SELECT comments.*, users.name, users.last_name as lastName, users.avatar FROM comments JOIN users ON comments.author_comment = users.id ${filterQuery}`,
                (err, values) => {
                    resolve(values)
                });
        });

        const allPhotosList = await new Promise(resolve => {
            let filterQuery = "";
            if (filter.id) {
                filterQuery += `WHERE author_photos = "${filter.id}"`
            }
            if (filter.liked) {
                filterQuery += `WHERE post_photos in (SELECT likes.post_likes FROM likes WHERE likes.user = "${filter.liked}")`
            }

            connection.query(`SELECT * FROM photos ${filterQuery}`, (err, values) => {
                resolve(values);
            });
        });

        const allLikes = await new Promise(resolve => {
            connection.query(`SELECT post_likes FROM likes WHERE user = "${myId}"`, (err, values) => {
                resolve(values);
            });
        });

        function searchValues(title, compareValue, array) {
            let result = [];
            for (let i = 0; i < array.length; i++) {
                if (array[i][title] === compareValue) {
                    result.push(array[i])
                }
            }
            return result;
        }

        for (let i = 0; i < allNews.length; i++) {
            const postData = {
                name: allNews[i].name,
                lastName: allNews[i].last_name,
                avatar: allNews[i].avatar,
                postId: allNews[i].id,
                likes: allNews[i].likes,
                text: allNews[i].text,
                date: allNews[i].date.toLocaleString("ru", {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                })
            }


            const photos = searchValues("post_photos", postData.postId, allPhotosList);
            const comments = searchValues("post_comment", postData.postId, allComments);
            const isLiked = searchValues("post_likes", postData.postId, allLikes).length ? true : false;

            response.push({postData, comments, photos, isLiked});
        }

        return response;
    }

    this.createPost = async (myId, photos, text) => {
        const postId = await new Promise(resolve => {
            connection.query(`INSERT INTO news(author_post, text, date) VALUES ("${myId}", "${text}", NOW())`, (err) => {
                if (err) {
                    console.log(err)
                }
                connection.query(`SELECT id
                                  FROM news
                                  ORDER BY id DESC
                                  LIMIT 1`, (err, values) => {
                    resolve(values[0].id);
                })
            });
        });

        for (let i = 0; i < photos.length; i++) {
            await new Promise(resolve => {
                connection.query(`INSERT INTO photos(title, post_photos, author_photos) VALUES ("${postId}-${i}", "${postId}", "${myId}")`, err => {
                    if (err) {
                        console.log(err)
                    }
                    resolve();
                })
            });
            await new Promise(resolve => {
                const stream = fs.createWriteStream(`./photoStorage/${postId}-${i}.jpg`);
                stream.on("finish", () => {
                    resolve();
                });

                stream.write(Buffer.from(photos[i]));
                stream.end();
            })
        }

        return {err: 0}
    }

    this.newComment = async (text, postId, myId) => {
        return await new Promise(resolve => {
            connection.query(`INSERT INTO comments(text, post_comment, author_comment) VALUES ("${text}", "${postId}", "${myId}")`, () => {
                resolve({err: 0});
            })
        });
    }

    this.likePost = async (postId, myId) => {
        function updateLikesCount(resolve) {
            connection.query(`UPDATE news SET likes = (SELECT COUNT(*) from likes WHERE post_likes = "${postId}") WHERE id = "${postId}"`, () => {
                resolve({err: 0});
            });
        }

        const isLiked = await new Promise(resolve => {
            connection.query(`SELECT * FROM likes WHERE post_likes = "${postId}" AND user = "${myId}"`, (err, values) => {
                resolve(values.length ? true : false);
            });
        });

        if (isLiked) {
            return await new Promise(resolve => {
                connection.query(`DELETE FROM likes WHERE post_likes = "${postId}" AND user = "${myId}"`, () => {
                    updateLikesCount(resolve);
                })
            });
        } else {
            return await new Promise(resolve => {
                connection.query(`INSERT INTO likes(user, post_likes) VALUES ("${myId}", ${postId})`, () => {
                    updateLikesCount(resolve);
                })
            });
        }
    }

    this.getUsers = async () => {
        return await new Promise(resolve => {
           connection.query(`SELECT id, name, last_name as lastName, avatar FROM users`, (err, value) => {
               resolve(value);
           });
        });
    }
}

module.exports = new DB();