const Koa = require("koa");
const config = require("config");
const mongoose = require("mongoose");
const cors = require("koa-cors");
const koaSwagger = require("koa2-swagger-ui").koaSwagger;
const yamljs = require("yamljs");
const path = require("path");
const fs = require("fs");
const router = require("./routing/router.js");
const authenticate = require("./authentication/authenticate");
const authorize = require("./authorization/authorization");
const authorizeProjects = require("./authorization/authorization_project");
const dbSchema = require("koa-mongoose-erd-generator");
const deviceManager = require("./createDevices");
const niclaDevice = require("./deviceSchemas/nicla").device;
const bleNanoDeivce = require("./deviceSchemas/bleNano").device;
const bodyParser = require("koa-bodyparser");
const inputValidation = require("openapi-validator-middleware");
inputValidation.init("docs/docs.yaml", { framework: "koa" });

// create server
const server = new Koa();
server.use(bodyParser());

// connect to Mongo
mongoose.connect(config.db, { useNewUrlParser: true });


deviceManager
  .clearDevices()
  .then(() => {
    Promise.all(
      [deviceManager.addDevice(niclaDevice)],
      deviceManager.addDevice(bleNanoDeivce)
    ).then(() => {
      console.log("Added devices");
    });
  })
  .catch((err) => {
    console.log(err);
    process.exit();
  });

// setup koa middlewares
server.use(cors());

// Serve documentation
server.use(
  dbSchema(
    "/api/docs/db",
    { modelsPath: __dirname + "/models", nameColor: "#007bff" },
    __dirname + "/docs/dbSchema.html"
  )
);

const spec = yamljs.load("./docs/docs.yaml");
server.use(
  koaSwagger({
    routePrefix: "/docs",
    title: "Explorer",
    swaggerOptions: { spec },
    favicon: "/api/docs/favicon.ico",
    hideTopbar: true,
  })
);

server.use((ctx, next) => {
  if (
    ctx.path == "/api/docs/favicon.ico" &&
    ctx.method == "GET" &&
    ctx.method != "Head"
  ) {
    ctx.body = fs.readFileSync(path.join(__dirname, "/docs/favicon.ico"));
    ctx.status = 200;
    return ctx;
  }
  return next();
});

// check authentication
server.use(async (ctx, next) => {
  await authenticate(ctx, next);
});

// check authorization
server.use(async (ctx, next) => {
  await authorize(ctx, next);
});

server.use(async (ctx, next) => {
  await authorizeProjects(ctx, next);
});

// catch errors
server.use(async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    if (error instanceof inputValidation.InputValidationError) {
      ctx.body = { errors: error.errors };
      ctx.status = 400;
      return ctx;
    }
    ctx.body = { error: error.message };
    ctx.status = error.status || 500;
    return ctx;
  }
});

// routing
server.use(router.routes());

// catch all middleware, only land here
// if no other routing rules match
// make sure it is added after everything else
server.use((ctx) => {
  ctx.body = { error: "Not Found" };
  ctx.status = 404;
});

module.exports = server.listen(3000);
