const config = require("config");
const axios = require("axios").default;
const Model = require("../models/user").model;

module.exports = async (ctx, next) => {
  const url = ctx.request.url.split("/");
  try {
    if (
      url[2].toLowerCase() === "deviceapi" &&
      url[3].toLowerCase() !== "deletekey" &&
      url[3].toLowerCase() !== "switchactive" &&
      url[3].toLowerCase() !== "getkey" &&
      url[3].toLowerCase() !== "setkey"
    ) {
      return next();
    }
  } catch (err) {}
  try {
    if (ctx.headers.authorization) {
      // request sends 'Bearer ' so remove it from token
      const token = ctx.headers.authorization.replace("Bearer ", "");
      // call auth server to authenticate with jwt
      const authRoute = config.auth + "/authenticate";
      const result = await axios.post(
        authRoute,
        {},
        { headers: { Authorization: ctx.headers.authorization } }
      );
      // auth server returns user id, to store with user object
      // check if we see this user for the first time: do we have this authId already in db?
      const authId = result.data.userId;
      const user = await Model.find({ authId });
      if (!user.length) {
        // if not, create a new user object
        const document = new Model({ authId });
        await document.save();
      }
      // only return data associated with this user id
      // add authId to ctx so we can use it later
      ctx.state.authId = authId;
      return next();
    } else {
      // no token provided
      ctx.status = 401;
      ctx.body = {
        error: "Please provide a valid JWT token",
      };
      return ctx;
    }
  } catch (err) {
    console.log(err);
    ctx.status = 401;
    ctx.body = {
      error: "Unauthorized",
    };
    return ctx;
  }
};
