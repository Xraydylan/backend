const mongoose = require("mongoose");
const supertest = require("supertest");
const config = require("config");
const chai = require("chai");
const http = require("request-promise-native");
const server = require("../server.js");

const { expect } = chai;
const request = supertest(server);

const email = "test@aura.com";
const password = "testpw123";
const userName = "CItestUser";

const DatasetModel = require('../models/dataset').model;


let project = "";

let token;

let labelType;
let labelDefinition;
let sensor;
let service;
let experiment;

const device = {
  sensors: [],
  deviceId: 2459128261,
  firmware: "",
  generation: 1,
  user: "",
};
const firmware = {
  version: "1.0",
  binary: "somebufferedstring",
  hash: "somehash1",
  supportedDevices: [1.0, 2.0, 3.0],
  uploadedAt: "2019-06-29",
};
const user = {
  sex: "m",
  birthday: "1980-05-05",
  weight: 80,
  platform: "android",
  clientVersion: 6,
};
const result = {
  name: "Regressor3",
  value: 80,
  text: "Regressor3 is predicting some value according to the data in dataset",
};
const event = {
  name: "TestEvent",
  value: 3,
  time: Date.now(),
  unit: "kg",
};
const datasetLabelDefintion = {
  labelingId: "",
  labels: [],
};
const timeseries = {
  name: "VOC",
  unit: "kOhm",
  start: "1561118400",
  end: "1561766400",
  samplingRate: "1",
  data: [161, 202, 171, 196, 214, 234, 224],
  offset: 10,
};
const fusedseries = {};
const dataset = {
  isPublished: true,
  userId: "",
  start: 1561786400,
  end: 1561898000,
  events: [],
  timeSeries: [],
  fusedSeries: [],
  labelings: [],
  video: {},
  results: [],
};

console.log("Testing with config:");
console.log(config);

describe("Testing API Routes", () => {
  before("Check connection", (done) => {
    mongoose.connection.on("connected", () => {
      done();
    });
  });

  before("Drop collections", (done) => {
    mongoose.connection.db.dropDatabase();
    done();
  });

  before("Register test user", (done) => {
    http
      .post({
        headers: {
          Accept: "application/json",
          "Accept-Charset": "utf-8",
        },
        url: `${config.auth}/register`,
        body: {
          email,
          password,
          userName,
        },
        json: true,
      })
      .then((err, response, body) => {
        if (body.error) {
          // dirty workaround -> delete later test user after tests
          if (body.error.includes("E11000 duplicate key error collection")) {
            done();
          } else {
            done(err);
          }
        }
      })
      .catch((error) => {
        done();
      });
  });

  before("Login test user", (done) => {
    http.post(
      {
        headers: {
          Accept: "application/json",
          "Accept-Charset": "utf-8",
        },
        url: `${config.auth}/login`,
        body: {
          email,
          password,
        },
        json: true,
      },
      (err, response, body) => {
        if (err) {
          done(err);
        } else {
          token = body.access_token.replace("Bearer ", "");
          done();
        }
      }
    );
  });

  before("Generating project", (done) => {
    request
      .post("/api/projects")
      .set({ Authorization: token })
      .send({ name: "testName" })
      .expect(200)
      .end((err, res) => {
        project = res.body;
        done();
      });
  });

  describe("Testing /user...", () => {
    it("Returns own user", (done) => {
      request
        .get("/api/users")
        .set({ Authorization: token })
        .expect(200)
        .end((err, res) => {
          user._id = res.body._id;
          user.authId = res.body.authId;
          expect(res.body).to.have.all.keys("_id", "authId", "__v");
          done(err);
        });
    });

    it("Update own user", (done) => {
      request
        .put("/api/users")
        .set({ Authorization: token })
        .send(user)
        .expect(200)
        .end((err, res) => {
          expect(res.body).to.be.an("object");
          done(err);
        });
    });
  });

  describe("Testing authentication handling...", () => {
    it("No token provided", (done) => {
      request
        .get("/api/users")
        .expect(401)
        .end((err, res) => {
          expect(res.body.error).to.be.equal(
            "Please provide a valid JWT token"
          );
          done(err);
        });
    });

    it("Invalid token provided", (done) => {
      request
        .put("/api/users")
        .set({
          Authorization:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjVkNTE4YTc0MjNjNGZlMTQ5ZGRiOGM1ZCIsImlhdCI6MTU2NTYyNDk0OCwiZXhwIjoxNTY1NjI0OTQ5fQ.KPY1kI-t-QbQlYVwPYrcMCQZMy3GfjLQx78j6pzdpvI",
        })
        .send(user)
        .expect(401)
        .end((err, res) => {
          expect(res.body.error).to.be.equal("Unauthorized");
          done(err);
        });
    });
  });

  describe("Testing /deviceApi", () => {
    var deviceApiKey = undefined;
    it("Generate a new Key", (done) => {
      request
        .get("/api/deviceApi/setKey")
        .set({
          Authorization: token,
          project: project._id,
        })
        .expect(200)
        .end((err, res) => {
          expect(res.body).to.have.all.keys("deviceApiKey");
          deviceApiKey = res.body.deviceApiKey;
          done(err);
        });
    });

    it("Enable deivceApi", (done) => {
      request
        .post("/api/deviceApi/switchActive")
        .set({
          Authorization: token,
          project: project._id,
        })
        .send({ state: true })
        .expect(200)
        .end((err, res) => {
          expect(res.body).to.have.all.keys("message");
          done(err);
        });
    });

    it("Get the generated Key", (done) => {
      request
        .get("/api/deviceApi/getKey")
        .set({
          Authorization: token,
          project: project._id,
        })
        .expect(200)
        .end((err, res) => {
          expect(res.body.deviceApiKey).to.equal(deviceApiKey);
          done(err);
        });
    });

    it("Upload a dataset", (done) => {
      request
        .post("/api/deviceApi/uploadDataset")
        .send({ payload: dataset, key: deviceApiKey })
        .expect(200)
        .end(async (err, res) => {
          expect(res.body).to.have.all.keys("message");
          const datasets = await DatasetModel.find({});
          expect(datasets.length).to.equal(1)
          done(err)
        });
    });

    var datasetKey = undefined;
    it("Generate datasetCollector", (done) => {
      request
        .post("/api/deviceApi/initDatasetIncrement")
        .send({ deviceApiKey: deviceApiKey })
        .expect(200)
        .end((err, res) => {
          expect(res.body).to.have.all.keys("datasetKey");
          datasetKey = res.body.datasetKey;
          done(err);
        });
    });

    it("AddDatasetIncrement", (done) => {
      request
      .post("/api/deviceApi/addDatasetIncrement")
      .send({
        datasetKey: datasetKey,
        time: 1234567890,
        datapoint: 2,
        sensorname: "testName"
      })
      .expect(200)
      .end((err, res) => {
        expect(res.body).to.have.all.keys('message');
        done(err)
      })
    });

    it("Delete the key", (done) => {
      request
        .get("/api/deviceApi/deleteKey")
        .set({
          Authorization: token,
          project: project._id,
        })
        .expect(200)
        .end((err, res) => {
          expect(res.body).to.have.all.keys("message");
          done(err);
        });
    });
  });

  describe("Testing /labelTypes...", () => {
    it("Saves a new label", (done) => {
      request
        .post("/api/labelTypes")
        .set({ Authorization: token, project: project._id })
        .send({ name: "Label1" })
        .expect(201)
        .end((err, res) => {
          labelType = res.body;
          done(err);
        });
    });

    it("Returns a list of labels", (done) => {
      request
        .get("/api/labelTypes")
        .set({ Authorization: token, project: project._id })
        .expect(200)
        .end((err, res) => {
          expect(res.body).to.be.an("array");
          done(err);
        });
    });

    it("Returns a label by id", (done) => {
      request
        .get(`/api/labelTypes/${labelType._id}`)
        .set({ Authorization: token, project: project._id })
        .expect(200)
        .end((err, res) => {
          expect(res.body).to.have.all.keys("_id", "name", "__v");
          done(err);
        });
    });

    it("Update a label by id", (done) => {
      request
        .put(`/api/labelTypes/${labelType._id}`)
        .set({ Authorization: token, project: project._id })
        .send({ name: "LabelNew" })
        .expect(200)
        .end((err, res) => {
          expect(res.body.message).to.be.equal(
            `updated labelType with id: ${labelType._id}`
          );
          done(err);
        });
    });

    it("Delete a label by id", (done) => {
      request
        .delete(`/api/labelTypes/${labelType._id}`)
        .set({ Authorization: token, project: project._id })
        .expect(200)
        .end((err, res) => {
          expect(res.body.message).to.be.equal(
            `deleted labelType with id: ${labelType._id}`
          );
          done(err);
        });
    });

    it("Delete all labels", (done) => {
      request
        .delete(`/api/labelTypes`)
        .set({ Authorization: token, project: project._id })
        .expect(200)
        .end((err, res) => {
          expect(res.body.message).to.be.equal(`deleted all labelTypes`);
          done(err);
        });
    });
  });

  describe("Testing /labelDefinitions...", () => {
    it("Saves a new labelDefinition", (done) => {
      request
        .post("/api/labelDefinitions")
        .set({ Authorization: token, project: project._id })
        .send({ labels: [] })
        .expect(201)
        .end((err, res) => {
          labelDefinition = res.body;
          done(err);
        });
    });

    it("Returns a list of labelDefinitions", (done) => {
      request
        .get("/api/labelDefinitions")
        .set({ Authorization: token, project: project._id })
        .expect(200)
        .end((err, res) => {
          expect(res.body).to.be.an("array");
          done(err);
        });
    });

    it("Returns a labelDefinition by id", (done) => {
      request
        .get(`/api/labelDefinitions/${labelDefinition._id}`)
        .set({ Authorization: token, project: project._id })
        .expect(200)
        .end((err, res) => {
          expect(res.body).to.have.all.keys("_id", "labels", "__v");
          done(err);
        });
    });

    it("Update a labelDefinition by id", (done) => {
      request
        .put(`/api/labelDefinitions/${labelDefinition._id}`)
        .set({ Authorization: token, project: project._id })
        .send({ labels: [] })
        .expect(200)
        .end((err, res) => {
          expect(res.body.message).to.be.equal(
            `updated labelDefinition with id: ${labelDefinition._id}`
          );
          done(err);
        });
    });

    it("Delete a labelDefinition by id", (done) => {
      request
        .delete(`/api/labelDefinitions/${labelDefinition._id}`)
        .set({ Authorization: token, project: project._id })
        .expect(200)
        .end((err, res) => {
          expect(res.body.message).to.be.equal(
            `deleted labelDefinition with id: ${labelDefinition._id}`
          );
          done(err);
        });
    });

    it("Delete all labelDefinitions", (done) => {
      request
        .delete(`/api/labelDefinitions`)
        .set({ Authorization: token, project: project._id })
        .expect(200)
        .end((err, res) => {
          expect(res.body.message).to.be.equal(`deleted all labelDefinitions`);
          done(err);
        });
    });
  });

  describe("Testing /firmware...", () => {
    it("Saves a new firmware", (done) => {
      request
        .post("/api/firmware")
        .set({ Authorization: token, project: project._id })
        .send(firmware)
        .expect(201)
        .end((err, res) => {
          firmware._id = res.body._id;
          done(err);
        });
    });

    it("Returns a list of firmware", (done) => {
      request
        .get("/api/firmware")
        .set({ Authorization: token, project: project._id })
        .expect(200)
        .end((err, res) => {
          expect(res.body).to.be.an("array");
          done(err);
        });
    });

    it("Returns a firmware by id", (done) => {
      request
        .get(`/api/firmware/${firmware._id}`)
        .set({ Authorization: token, project: project._id })
        .expect(200)
        .end((err, res) => {
          expect(res.body).to.have.all.keys(
            "_id",
            "version",
            "binary",
            "hash",
            "supportedDevices",
            "uploadedAt",
            "__v"
          );
          done(err);
        });
    });

    it("Update a firmware by id", (done) => {
      request
        .put(`/api/firmware/${firmware._id}`)
        .set({ Authorization: token, project: project._id })
        .send({ generation: 2 })
        .expect(200)
        .end((err, res) => {
          expect(res.body.message).to.be.equal(
            `updated firmware with id: ${firmware._id}`
          );
          done(err);
        });
    });

    it("Delete a firmware by id", (done) => {
      request
        .delete(`/api/firmware/${firmware._id}`)
        .set({ Authorization: token, project: project._id })
        .expect(200)
        .end((err, res) => {
          expect(res.body.message).to.be.equal(
            `deleted firmware with id: ${firmware._id}`
          );
          done(err);
        });
    });

    it("Delete all firmware", (done) => {
      request
        .delete(`/api/firmware`)
        .set({ Authorization: token, project: project._id })
        .expect(200)
        .end((err, res) => {
          expect(res.body.message).to.be.equal(`deleted all firmware`);
          done(err);
        });
    });
  });

  describe("Testing /devices...", () => {
    it("Saves a new firmware", (done) => {
      request
        .post("/api/firmware")
        .set({ Authorization: token, project: project._id })
        .send(firmware)
        .expect(201)
        .end((err, res) => {
          device.firmware = res.body._id;
          device.user = user._id;
          done(err);
        });
    });

    it("Saves a new device", (done) => {
      request
        .post("/api/devices")
        .set({ Authorization: token, project: project._id })
        .send(device)
        .expect(201)
        .end((err, res) => {
          device._id = res.body._id;
          done(err);
        });
    });

    it("Returns a list of devices", (done) => {
      request
        .get("/api/devices")
        .set({ Authorization: token, project: project._id })
        .expect(200)
        .end((err, res) => {
          expect(res.body).to.be.an("array");
          done(err);
        });
    });

    it("Returns a device by id", (done) => {
      request
        .get(`/api/devices/${device._id}`)
        .set({ Authorization: token, project: project._id })
        .expect(200)
        .end((err, res) => {
          expect(res.body).to.have.all.keys(
            "_id",
            "sensors",
            "deviceId",
            "firmware",
            "generation",
            "user",
            "__v"
          );
          done(err);
        });
    });

    it("Update a device by id", (done) => {
      request
        .put(`/api/devices/${device._id}`)
        .set({ Authorization: token, project: project._id })
        .send({ generation: 2 })
        .expect(200)
        .end((err, res) => {
          expect(res.body.message).to.be.equal(
            `updated device with id: ${device._id}`
          );
          done(err);
        });
    });

    it("Delete a device by id", (done) => {
      request
        .delete(`/api/devices/${device._id}`)
        .set({ Authorization: token, project: project._id })
        .expect(200)
        .end((err, res) => {
          expect(res.body.message).to.be.equal(
            `deleted device with id: ${device._id}`
          );
          done(err);
        });
    });

    it("Delete all devices", (done) => {
      request
        .delete(`/api/devices`)
        .set({ Authorization: token, project: project._id })
        .expect(200)
        .end((err, res) => {
          expect(res.body.message).to.be.equal(`deleted all devices`);
          done(err);
        });
    });
  });

  describe("Testing /sensors...", () => {
    it("Saves a new sensors", (done) => {
      request
        .post("/api/sensors")
        .set({ Authorization: token, project: project._id })
        .send({ name: "Sensor1" })
        .expect(201)
        .end((err, res) => {
          sensor = res.body;
          done(err);
        });
    });

    it("Returns a list of sensors", (done) => {
      request
        .get("/api/sensors")
        .set({ Authorization: token, project: project._id })
        .expect(200)
        .end((err, res) => {
          expect(res.body).to.be.an("array");
          done(err);
        });
    });

    it("Returns a sensors by id", (done) => {
      request
        .get(`/api/sensors/${sensor._id}`)
        .set({ Authorization: token, project: project._id })
        .expect(200)
        .end((err, res) => {
          expect(res.body).to.have.all.keys("_id", "name", "__v");
          done(err);
        });
    });

    it("Update a sensors by id", (done) => {
      request
        .put(`/api/sensors/${sensor._id}`)
        .set({ Authorization: token, project: project._id })
        .send({ name: "Sensor2" })
        .expect(200)
        .end((err, res) => {
          expect(res.body.message).to.be.equal(
            `updated sensor with id: ${sensor._id}`
          );
          done(err);
        });
    });

    it("Delete a sensors by id", (done) => {
      request
        .delete(`/api/sensors/${sensor._id}`)
        .set({ Authorization: token, project: project._id })
        .expect(200)
        .end((err, res) => {
          expect(res.body.message).to.be.equal(
            `deleted sensor with id: ${sensor._id}`
          );
          done(err);
        });
    });

    it("Delete all sensors", (done) => {
      request
        .delete(`/api/sensors`)
        .set({ Authorization: token, project: project._id })
        .expect(200)
        .end((err, res) => {
          expect(res.body.message).to.be.equal(`deleted all sensors`);
          done(err);
        });
    });
  });

  describe("Testing /services...", () => {
    it("Saves a new service", (done) => {
      request
        .post("/api/services")
        .set({ Authorization: token, project: project._id })
        .send({ name: "Service1", version: 1 })
        .expect(201)
        .end((err, res) => {
          service = res.body;
          done(err);
        });
    });

    it("Returns a list of services", (done) => {
      request
        .get("/api/services")
        .set({ Authorization: token, project: project._id })
        .expect(200)
        .end((err, res) => {
          expect(res.body).to.be.an("array");
          done(err);
        });
    });

    it("Returns a services by id", (done) => {
      request
        .get(`/api/services/${service._id}`)
        .set({ Authorization: token, project: project._id })
        .expect(200)
        .end((err, res) => {
          expect(res.body).to.have.all.keys("_id", "name", "version", "__v");
          done(err);
        });
    });

    it("Update a services by id", (done) => {
      request
        .put(`/api/services/${service._id}`)
        .set({ Authorization: token, project: project._id })
        .send({ name: "Sensor2" })
        .expect(200)
        .end((err, res) => {
          expect(res.body.message).to.be.equal(
            `updated service with id: ${service._id}`
          );
          done(err);
        });
    });

    it("Delete a services by id", (done) => {
      request
        .delete(`/api/services/${service._id}`)
        .set({ Authorization: token, project: project._id })
        .expect(200)
        .end((err, res) => {
          expect(res.body.message).to.be.equal(
            `deleted service with id: ${service._id}`
          );
          done(err);
        });
    });

    it("Delete all services", (done) => {
      request
        .delete(`/api/services`)
        .set({ Authorization: token, project: project._id })
        .expect(200)
        .end((err, res) => {
          expect(res.body.message).to.be.equal(`deleted all services`);
          done(err);
        });
    });
  });

  describe("Testing /experiments...", () => {
    it("Saves a new labelTypes", (done) => {
      request
        .post("/api/labelTypes")
        .set({ Authorization: token, project: project._id })
        .send({ name: "Label1", color: "#ffffff" })
        .expect(201)
        .end((err, res) => {
          labelType = res.body;
          done(err);
        });
    });

    it("Saves a new labelDefinitions", (done) => {
      request
        .post("/api/labelDefinitions")
        .set({ Authorization: token, project: project._id })
        .send({ labels: [labelType._id], name: "TestLabeling" })
        .expect(201)
        .end((err, res) => {
          labelDefinition = res.body;
          done(err);
        });
    });

    it("Saves a new experiment", (done) => {
      request
        .post("/api/experiments")
        .set({ Authorization: token, project: project._id })
        .send({
          name: "Instruction",
          instructions: [
            {
              duration: 1,
              labelingId: labelDefinition._id,
              labelType: labelType._id,
            },
          ],
        })
        .expect(201)
        .end((err, res) => {
          experiment = res.body;
          done(err);
        });
    });

    it("Returns a list of experiments", (done) => {
      request
        .get("/api/experiments")
        .set({ Authorization: token, project: project._id })
        .expect(200)
        .end((err, res) => {
          expect(res.body).to.be.an("array");
          done(err);
        });
    });

    it("Returns an experiment by id", (done) => {
      request
        .get(`/api/experiments/${experiment._id}`)
        .set({ Authorization: token, project: project._id })
        .expect(200)
        .end((err, res) => {
          expect(res.body).to.have.all.keys(
            "_id",
            "name",
            "instructions",
            "__v"
          );
          done(err);
        });
    });

    it("Returns an experiment by id that is populated", (done) => {
      request
        .get(`/api/experiments/${experiment._id}/populated`)
        .set({ Authorization: token, project: project._id })
        .expect(200)
        .end((err, res) => {
          expect(res.body).to.have.all.keys(
            "_id",
            "name",
            "instructions",
            "__v"
          );
          done(err);
        });
    });

    it("Update an experiment by id", (done) => {
      request
        .put(`/api/experiments/${experiment._id}`)
        .set({ Authorization: token, project: project._id })
        .send({ name: "Sensor2" })
        .expect(200)
        .end((err, res) => {
          expect(res.body.message).to.be.equal(
            `updated experiment with id: ${experiment._id}`
          );
          done(err);
        });
    });

    it("Delete an experiment by id", (done) => {
      request
        .delete(`/api/experiments/${experiment._id}`)
        .set({ Authorization: token, project: project._id })
        .expect(200)
        .end((err, res) => {
          expect(res.body.message).to.be.equal(
            `deleted experiment with id: ${experiment._id}`
          );
          done(err);
        });
    });

    it("Delete all experiments", (done) => {
      request
        .delete(`/api/experiments`)
        .set({ Authorization: token, project: project._id })
        .expect(200)
        .end((err, res) => {
          expect(res.body.message).to.be.equal(`deleted all experiments`);
          done(err);
        });
    });
  });

  describe("Testing /datasets...", () => {
    it("Saves a new firmware", (done) => {
      delete firmware._id;
      request
        .post("/api/firmware")
        .set({ Authorization: token, project: project._id })
        .send(firmware)
        .expect(201)
        .end((err, res) => {
          device.firmware = res.body._id;
          device.user = user._id;
          done(err);
        });
    });

    it("Saves a new device", (done) => {
      delete device._id;
      request
        .post("/api/devices")
        .set({ Authorization: token, project: project._id })
        .send(device)
        .expect(201)
        .end((err, res) => {
          device._id = res.body._id;
          dataset.device = device._id;
          dataset.userId = user._id;
          done(err);
        });
    });

    it("Saves a new dataset", (done) => {
      delete dataset.userId;
      request
        .post("/api/datasets")
        .set({ Authorization: token, project: project._id })
        .send(dataset)
        .expect(201)
        .end((err, res) => {
          dataset._id = res.body._id;
          done(err);
        });
    });

    describe("Testing /datasets/{id}/results...", () => {
      it("Saves a new result", (done) => {
        request
          .post(`/api/datasets/${dataset._id}/results`)
          .set({ Authorization: token, project: project._id })
          .send(result)
          .expect(201)
          .end((err, res) => {
            result._id = res.body._id;
            done(err);
          });
      });

      it("Returns a list of result", (done) => {
        request
          .get(`/api/datasets/${dataset._id}/results`)
          .set({ Authorization: token, project: project._id })
          .expect(200)
          .end((err, res) => {
            expect(res.body).to.be.an("array");
            done(err);
          });
      });

      it("Returns a result by id", (done) => {
        request
          .get(`/api/datasets/${dataset._id}/results/${result._id}`)
          .set({ Authorization: token, project: project._id })
          .expect(200)
          .end((err, res) => {
            expect(res.body).to.have.all.keys("_id", "name", "value", "text");
            done(err);
          });
      });

      it("Update a result by id", (done) => {
        request
          .put(`/api/datasets/${dataset._id}/results/${result._id}`)
          .set({ Authorization: token, project: project._id })
          .send({ name: "ResultNeu" })
          .expect(200)
          .end((err, res) => {
            expect(res.body.message).to.be.equal(
              `updated result with id: ${result._id}`
            );
            done(err);
          });
      });

      it("Delete a result by id", (done) => {
        request
          .delete(`/api/datasets/${dataset._id}/results/${result._id}`)
          .set({ Authorization: token, project: project._id })
          .expect(200)
          .end((err, res) => {
            expect(res.body.message).to.be.equal(
              `deleted result with id: ${result._id}`
            );
            done(err);
          });
      });

      it("Delete all results", (done) => {
        request
          .delete(`/api/datasets/${dataset._id}/results/`)
          .set({ Authorization: token, project: project._id })
          .expect(200)
          .end((err, res) => {
            expect(res.body.message).to.be.equal(`deleted all results`);
            done(err);
          });
      });
    });

    describe("Testing /datasets/{id}/labelings...", () => {
      it("Saves a new service", (done) => {
        request
          .post("/api/services")
          .set({ Authorization: token, project: project._id })
          .send({ name: "Service1", version: 1 })
          .expect(201)
          .end((err, res) => {
            service = res.body;
            datasetLabelDefintion.creator = service._id;
            done(err);
          });
      });

      it("Saves a new labelDefinition", (done) => {
        request
          .post("/api/labelDefinitions")
          .set({ Authorization: token, project: project._id })
          .send({ labels: [] })
          .expect(201)
          .end((err, res) => {
            labelDefinition = res.body;
            datasetLabelDefintion.labelingId = labelDefinition._id;
            done(err);
          });
      });

      it("Saves a new labeling", (done) => {
        request
          .post(`/api/datasets/${dataset._id}/labelings`)
          .set({ Authorization: token, project: project._id })
          .send(datasetLabelDefintion)
          .expect(201)
          .end((err, res) => {
            datasetLabelDefintion._id = res.body._id;
            done(err);
          });
      });

      it("Returns a list of labeling", (done) => {
        request
          .get(`/api/datasets/${dataset._id}/labelings`)
          .set({ Authorization: token, project: project._id })
          .expect(200)
          .end((err, res) => {
            expect(res.body).to.be.an("array");
            done(err);
          });
      });

      it("Returns a labeling by id", (done) => {
        request
          .get(
            `/api/datasets/${dataset._id}/labelings/${datasetLabelDefintion._id}`
          )
          .set({ Authorization: token, project: project._id })
          .expect(200)
          .end((err, res) => {
            expect(res.body).to.have.all.keys(
              "_id",
              "labelingId",
              "labels",
              "creator"
            );
            done(err);
          });
      });

      it("Update a labeling by id", (done) => {
        request
          .put(
            `/api/datasets/${dataset._id}/labelings/${datasetLabelDefintion._id}`
          )
          .set({ Authorization: token, project: project._id })
          .send({ name: "ResultNeu" })
          .expect(200)
          .end((err, res) => {
            expect(res.body.message).to.be.equal(
              `updated labeling with id: ${datasetLabelDefintion._id}`
            );
            done(err);
          });
      });

      it("Delete a labeling by id", (done) => {
        request
          .delete(
            `/api/datasets/${dataset._id}/labelings/${datasetLabelDefintion._id}`
          )
          .set({ Authorization: token, project: project._id })
          .expect(200)
          .end((err, res) => {
            expect(res.body.message).to.be.equal(
              `deleted labeling with id: ${datasetLabelDefintion._id}`
            );
            done(err);
          });
      });

      it("Delete all labelings", (done) => {
        request
          .delete(`/api/datasets/${dataset._id}/labelings/`)
          .set({ Authorization: token, project: project._id })
          .expect(200)
          .end((err, res) => {
            expect(res.body.message).to.be.equal(`deleted all labelings`);
            done(err);
          });
      });
    });

    describe("Testing /datasets/{id}/video...", () => {
      it("Saves a new video", (done) => {
        request
          .post(`/api/datasets/${dataset._id}/video`)
          .set({ Authorization: token, project: project._id })
          .send({ url: "aura.de/testvideo", offset: 0 })
          .expect(201)
          .end((err, res) => {
            expect(res.body).to.have.all.keys("_id", "url", "offset");
            done(err);
          });
      });

      it("Returns the video", (done) => {
        request
          .get(`/api/datasets/${dataset._id}/video`)
          .set({ Authorization: token, project: project._id })
          .expect(200)
          .end((err, res) => {
            expect(res.body).to.have.all.keys("_id", "url", "offset");
            done(err);
          });
      });

      it("Update the video", (done) => {
        request
          .put(`/api/datasets/${dataset._id}/video`)
          .set({ Authorization: token, project: project._id })
          .send({ offset: 1 })
          .expect(200)
          .end((err, res) => {
            expect(res.body.message).to.be.equal(
              `updated video for dataset with id: ${dataset._id}`
            );
            done(err);
          });
      });

      it("Delete the video", (done) => {
        request
          .delete(`/api/datasets/${dataset._id}/video`)
          .set({ Authorization: token, project: project._id })
          .send(datasetLabelDefintion)
          .expect(200)
          .end((err, res) => {
            expect(res.body.message).to.be.equal(
              `deleted video for dataset with id: ${dataset._id}`
            );
            done(err);
          });
      });
    });

    describe("Testing /datasets...", () => {
      it("Returns a list of datasets", (done) => {
        request
          .get("/api/datasets")
          .set({ Authorization: token, project: project._id })
          .expect(200)
          .end((err, res) => {
            expect(res.body).to.be.an("array");
            done(err);
          });
      });

      it("Returns a dataset by id", (done) => {
        request
          .get(`/api/datasets/${dataset._id}`)
          .set({ Authorization: token, project: project._id })
          .expect(200)
          .end((err, res) => {
            expect(res.body).to.have.all.keys(
              "_id",
              "userId",
              "start",
              "end",
              "isPublished",
              "timeSeries",
              "fusedSeries",
              "labelings",
              "video",
              "device",
              "results",
              "experiments",
              "__v"
            );
            done(err);
          });
      });

      it("Update a datasets by id", (done) => {
        request
          .put(`/api/datasets/${dataset._id}`)
          .set({ Authorization: token, project: project._id })
          .send({ generation: 2 })
          .expect(200)
          .end((err, res) => {
            expect(res.body.message).to.be.equal(
              `updated dataset with id: ${dataset._id}`
            );
            done(err);
          });
      });

      it("Delete a datasets by id", (done) => {
        request
          .delete(`/api/datasets/${dataset._id}`)
          .set({ Authorization: token, project: project._id })
          .expect(200)
          .end((err, res) => {
            expect(res.body.message).to.be.equal(
              `deleted dataset with id: ${dataset._id}`
            );
            done(err);
          });
      });
    });
  });

  describe("Testing an invalid route ...", () => {
    it("Invalid route returns 404", (done) => {
      request
        .get("/invalid")
        .set({ Authorization: token, project: project._id })
        .expect(404)
        .end((err, res) => {
          expect(res.body.error).to.be.equal("Not Found");
          done(err);
        });
    });
  });
});

module.exports = mongoose;
