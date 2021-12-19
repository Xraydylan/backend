const Router       = require('koa-router');

const controller = require('../../controller/labelDefinition');

const inputValidation = require('openapi-validator-middleware');
module.exports = inputValidation.init("docs/docs.yaml", {framework: 'koa', beautifyErrors: true});

const router = new Router();

/**
 * get all labelings for current user
 * route:					/labelings
 * method type: 	GET
 */
router.get('/', async (ctx) => {
	await controller.getLabelDefinitions(ctx);
});

/**
 * get labeling by id
 * route:					/labelings/:id
 * method type: 	GET
 */
router.get('/:id', async (ctx) => {
	await controller.getLabelDefinitionById(ctx);
});

/**
 * create a new labeling
 * route:					/labelings
 * method type: 	POST
 */
router.post('/', async (ctx) => {
	await controller.createLabelDefinition(ctx);
});

/**
 * update a specific labelings
 * route:					/labelings/:id
 * method type: 	PUT
 */
router.put('/:id', async (ctx) => {
	await controller.updateLabelDefinitionById(ctx);
});

/**
 * delete all labelings
 * route:					/labelings
 * method type: 	DELETE
 */
router.del('/', async (ctx) => {
	await controller.deleteLabelDefinitions(ctx);
});

/**
 * delete a specific labeling
 * route:					/labelings/:id
 * method type: 	DELETE
 */
router.del('/:id', async (ctx) => {
	await controller.deleteLabelDefinitionById(ctx);
});

router.post("/:id/createlabeltypes", async (ctx) => {
	await controller.addLabelTypes(ctx);
})

router.post("/:id/deletelabeltypes", async (ctx) => {
	await controller.deleteLabelTypes(ctx);
})


module.exports = router;
