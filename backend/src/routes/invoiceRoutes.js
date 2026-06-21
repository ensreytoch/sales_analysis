const router   = require('express').Router();
const auth     = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { list, getById } = require('../controllers/invoiceController');

router.get('/',    auth, authorize('invoices:read'), list);
router.get('/:id', auth, authorize('invoices:read'), getById);

module.exports = router;
