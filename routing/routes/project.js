const Router      = require('koa-router');
const controller = require('../../controller/projects');

const inputValidation = require('openapi-validator-middleware');
module.exports = inputValidation.init("docs/docs.yaml", {framework: 'koa', beautifyErrors: true});

const router = new Router();

router.get('/', async (ctx) => {
    await controller.getProjects(ctx);
});

router.get('/:id', async (ctx) => {
    await controller.getProjectById(ctx);
})

router.del('/:id', async (ctx) => {
	await controller.deleteProjectById(ctx);
});

router.post('/', async (ctx) => {
	await controller.createProject(ctx);
});

router.put('/:id', async (ctx) => {
    await controller.updateProjectById(ctx);
});

module.exports = router