const router   = require('express').Router();
const auth     = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const c = require('../controllers/productController');

router.get('/',                   auth, authorize('products:read'),  c.list);
router.get('/categories',         auth, authorize('products:read'),  c.listCategories);
router.get('/:id/movements',      auth, authorize('products:read'),  c.movements);
router.post('/',                  auth, authorize('products:write'), c.create);
router.put('/:id',                auth, authorize('products:write'), c.update);
router.delete('/:id',             auth, authorize('products:write'), c.remove);
router.post('/:id/restock',       auth, authorize('products:write'), c.restock);

module.exports = router;
