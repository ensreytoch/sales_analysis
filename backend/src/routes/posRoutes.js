const router   = require('express').Router();
const auth     = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { getLocation, getProducts, sell, listInvoices, getInvoice } = require('../controllers/posController');

router.get('/location',       auth, authorize('sales:write'),        getLocation);
router.get('/products',       auth, authorize('sales:write'),        getProducts);
router.post('/sell',          auth, authorize('sales:write'),        sell);
router.get('/invoices',       auth, authorize('transactions:read'),  listInvoices);
router.get('/invoices/:id',   auth, authorize('transactions:read'),  getInvoice);

module.exports = router;
